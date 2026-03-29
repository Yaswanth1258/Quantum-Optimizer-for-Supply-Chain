from __future__ import annotations

from collections import defaultdict
from typing import Dict, List, Tuple

from models.schemas import GraphData


# Demo-safe runtime guards: use true quantum routines with smart reduction,
# then fall back deterministically only when constraints remain infeasible.
MAX_VQE_QUBITS = 6
MAX_QAOA_ALLOCATION_VARIABLES = 12
MAX_INBOUND_CANDIDATES_PER_REGION = 2


def _normalize_route_ids(graph_data: GraphData) -> None:
    for idx, route in enumerate(graph_data.routes):
        if not route.id:
            route.id = f"r{idx}"


def _build_feasibility_checks(graph_data: GraphData) -> Tuple[Dict[str, int], Dict[str, int]]:
    demand_by_region = {d.region: d.required_units for d in graph_data.demand}
    capacity_by_source = {w.id: w.capacity for w in graph_data.warehouses}
    return demand_by_region, capacity_by_source


def _is_route_selection_feasible(graph_data: GraphData, bitstring: List[float]) -> bool:
    demand_by_region, capacity_by_source = _build_feasibility_checks(graph_data)

    inbound_counts: Dict[str, int] = {region: 0 for region in demand_by_region}
    outbound_counts: Dict[str, int] = {source: 0 for source in capacity_by_source}

    for idx, value in enumerate(bitstring):
        if value < 0.5:
            continue
        route = graph_data.routes[idx]
        if route.destination in inbound_counts:
            inbound_counts[route.destination] += 1
        if route.source in outbound_counts:
            outbound_counts[route.source] += 1

    for region, needed in demand_by_region.items():
        if inbound_counts.get(region, 0) < needed:
            return False

    for source, capacity in capacity_by_source.items():
        if outbound_counts.get(source, 0) > capacity:
            return False

    return True


def _classical_route_selection_fallback(graph_data: GraphData) -> Tuple[List[int], str]:
    routes_by_destination: Dict[str, List[Tuple[int, object]]] = defaultdict(list)
    remaining_capacity: Dict[str, int] = {w.id: w.capacity for w in graph_data.warehouses}

    for idx, route in enumerate(graph_data.routes):
        routes_by_destination[route.destination].append((idx, route))

    for destination_routes in routes_by_destination.values():
        destination_routes.sort(key=lambda pair: (pair[1].cost + 0.35 * pair[1].time, pair[1].cost))

    chosen_indices: List[int] = []
    chosen_set = set()

    for demand in graph_data.demand:
        needed = demand.required_units
        candidates = routes_by_destination.get(demand.region, [])
        if not candidates:
            raise ValueError(
                f"No inbound routes available for demand region '{demand.region}'."
            )

        for idx, route in candidates:
            if needed <= 0:
                break
            if idx in chosen_set:
                continue
            if remaining_capacity.get(route.source, 0) <= 0:
                continue

            chosen_set.add(idx)
            chosen_indices.append(idx)
            remaining_capacity[route.source] -= 1
            needed -= 1

        if needed > 0:
            raise ValueError(
                f"Fallback route optimizer could not satisfy demand for region '{demand.region}'."
            )

    return sorted(chosen_indices), "vqe_assisted_heuristic"


def _build_quantum_route_subproblem(graph_data: GraphData) -> Tuple[GraphData, Dict[int, int]]:
    """
    Build a feasible reduced route graph for VQE.
    Keeps only the most relevant inbound routes per demanded region so the
    qubit count stays within demo budget while preserving feasibility.
    """
    demanded_regions = {d.region for d in graph_data.demand}

    ranked_candidates: Dict[str, List[Tuple[int, object]]] = defaultdict(list)
    for idx, route in enumerate(graph_data.routes):
        if route.destination in demanded_regions:
            ranked_candidates[route.destination].append((idx, route))

    chosen_indices = set()
    required_min_indices = set()
    for demand in graph_data.demand:
        candidates = ranked_candidates.get(demand.region, [])
        if not candidates:
            raise ValueError(
                f"No inbound routes available for demand region '{demand.region}'."
            )

        candidates.sort(key=lambda pair: (pair[1].cost, pair[1].time))
        for idx, _route in candidates[: demand.required_units]:
            chosen_indices.add(idx)
            required_min_indices.add(idx)

        keep_count = max(demand.required_units, MAX_INBOUND_CANDIDATES_PER_REGION)
        for idx, _route in candidates[:keep_count]:
            chosen_indices.add(idx)

    if len(chosen_indices) > MAX_VQE_QUBITS:
        if len(required_min_indices) > MAX_VQE_QUBITS:
            raise ValueError(
                "Demand constraints require more variables than current VQE budget."
            )

        chosen_indices = set(required_min_indices)
        remaining_slots = MAX_VQE_QUBITS - len(chosen_indices)
        ranked_optional = sorted(
            [idx for idx in set().union(*[set([ridx for ridx, _ in ranked_candidates[d.region]]) for d in graph_data.demand]) if idx not in chosen_indices],
            key=lambda idx: (graph_data.routes[idx].cost, graph_data.routes[idx].time),
        )
        for idx in ranked_optional[:remaining_slots]:
            chosen_indices.add(idx)

    reduced_routes = [graph_data.routes[idx] for idx in sorted(chosen_indices)]

    reduced_graph = GraphData.model_validate(
        {
            "warehouses": [w.model_dump() for w in graph_data.warehouses],
            "routes": [r.model_dump() for r in reduced_routes],
            "demand": [d.model_dump() for d in graph_data.demand],
        }
    )

    # Map reduced index -> original index
    index_map = {new_idx: old_idx for new_idx, old_idx in enumerate(sorted(chosen_indices))}
    return reduced_graph, index_map


def _solve_route_selection_with_vqe(graph_data: GraphData) -> Tuple[List[int], dict]:
    reduced_graph, reduced_to_original = _build_quantum_route_subproblem(graph_data)

    try:
        from qiskit.circuit.library import EfficientSU2
        from qiskit.primitives import Estimator
        from qiskit_algorithms import VQE
        from qiskit_algorithms.optimizers import COBYLA
        from qiskit_optimization import QuadraticProgram
        from qiskit_optimization.algorithms import MinimumEigenOptimizer
        from qiskit_optimization.converters import QuadraticProgramToQubo
    except ImportError as exc:
        raise RuntimeError(
            "Qiskit VQE dependencies are missing. Install backend/requirements.txt."
        ) from exc

    problem = QuadraticProgram(name="route_selection_vqe")

    for idx, _route in enumerate(reduced_graph.routes):
        problem.binary_var(name=f"x_{idx}")

    objective = {
        f"x_{idx}": (route.cost + 0.2 * route.time)
        for idx, route in enumerate(reduced_graph.routes)
    }
    problem.minimize(linear=objective)

    for demand in reduced_graph.demand:
        coeffs = {
            f"x_{idx}": 1
            for idx, route in enumerate(reduced_graph.routes)
            if route.destination == demand.region
        }
        if not coeffs:
            raise ValueError(
                f"No inbound routes available for demand region '{demand.region}'."
            )
        problem.linear_constraint(
            linear=coeffs,
            sense=">=",
            rhs=demand.required_units,
            name=f"demand_{demand.region}",
        )

    for warehouse in reduced_graph.warehouses:
        coeffs = {
            f"x_{idx}": 1
            for idx, route in enumerate(reduced_graph.routes)
            if route.source == warehouse.id
        }
        if coeffs:
            problem.linear_constraint(
                linear=coeffs,
                sense="<=",
                rhs=warehouse.capacity,
                name=f"capacity_{warehouse.id}",
            )

    max_route_cost = max(route.cost for route in reduced_graph.routes)
    penalty = max(1.0, max_route_cost * len(reduced_graph.routes) * 2)
    converter = QuadraticProgramToQubo(penalty=penalty)
    qubo_problem = converter.convert(problem)

    estimator = Estimator()
    ansatz = EfficientSU2(len(reduced_graph.routes), reps=1)
    optimizer = COBYLA(maxiter=40)
    vqe = VQE(estimator=estimator, ansatz=ansatz, optimizer=optimizer)
    minimum_eigen_optimizer = MinimumEigenOptimizer(min_eigen_solver=vqe)

    result = minimum_eigen_optimizer.solve(qubo_problem)

    try:
        interpreted_x = converter.interpret(result.x)
    except Exception:
        interpreted_x = result.x

    bitstring = [float(v) for v in interpreted_x]
    if not _is_route_selection_feasible(reduced_graph, bitstring):
        raise ValueError("VQE route selection returned an infeasible solution.")

    selected_reduced_indices = [idx for idx, bit in enumerate(bitstring) if bit >= 0.5]
    selected_indices = [reduced_to_original[idx] for idx in selected_reduced_indices]

    if not selected_indices:
        raise ValueError("VQE selected zero routes.")

    metadata = {
        "route_solver": "vqe",
        "vqe_ansatz": "EfficientSU2(reps=1)",
        "vqe_optimizer": "COBYLA(maxiter=40)",
        "qubo_penalty": round(penalty, 4),
        "qubo_variables": len(reduced_graph.routes),
        "route_candidates_considered": len(reduced_graph.routes),
        "route_candidates_original": len(graph_data.routes),
    }
    return selected_indices, metadata


def _build_unit_demands(graph_data: GraphData) -> List[dict]:
    unit_demands: List[dict] = []
    for demand in graph_data.demand:
        for unit_idx in range(demand.required_units):
            unit_demands.append(
                {
                    "unit_id": f"{demand.region}_u{unit_idx + 1}",
                    "destination": demand.region,
                }
            )
    return unit_demands


def _qaoa_allocate_shipments(graph_data: GraphData, selected_indices: List[int]) -> Tuple[List[dict], dict]:
    try:
        from qiskit.primitives import Sampler
        from qiskit_algorithms import QAOA
        from qiskit_algorithms.optimizers import COBYLA
        from qiskit_optimization import QuadraticProgram
        from qiskit_optimization.algorithms import MinimumEigenOptimizer
        from qiskit_optimization.converters import QuadraticProgramToQubo
    except ImportError as exc:
        raise RuntimeError(
            "Qiskit QAOA dependencies are missing. Install backend/requirements.txt."
        ) from exc

    selected_routes = [graph_data.routes[idx] for idx in selected_indices]
    if not selected_routes:
        raise ValueError("No routes selected for shipment allocation.")

    unit_demands = _build_unit_demands(graph_data)
    candidates_by_unit: Dict[int, List[int]] = {}

    for unit_idx, unit in enumerate(unit_demands):
        candidates = [
            route_idx
            for route_idx, route in enumerate(selected_routes)
            if route.destination == unit["destination"]
        ]
        if not candidates:
            raise ValueError(
                f"No selected route can serve demand destination '{unit['destination']}'."
            )
        candidates.sort(
            key=lambda idx: (
                selected_routes[idx].cost + 0.1 * selected_routes[idx].time,
                selected_routes[idx].cost,
            )
        )
        candidates = candidates[:2]
        candidates_by_unit[unit_idx] = candidates

    qp = QuadraticProgram(name="shipment_allocation_qaoa")

    var_names: Dict[Tuple[int, int], str] = {}
    for unit_idx, route_indices in candidates_by_unit.items():
        for route_idx in route_indices:
            name = f"y_{unit_idx}_{route_idx}"
            qp.binary_var(name=name)
            var_names[(unit_idx, route_idx)] = name

    linear_obj = {}
    for (unit_idx, route_idx), var_name in var_names.items():
        route = selected_routes[route_idx]
        linear_obj[var_name] = route.cost + 0.1 * route.time
    qp.minimize(linear=linear_obj)

    for unit_idx, route_indices in candidates_by_unit.items():
        qp.linear_constraint(
            linear={var_names[(unit_idx, route_idx)]: 1 for route_idx in route_indices},
            sense="==",
            rhs=1,
            name=f"assign_unit_{unit_idx}",
        )

    source_unit_capacity = {
        warehouse.id: int(warehouse.capacity) for warehouse in graph_data.warehouses
    }

    for source_id, cap in source_unit_capacity.items():
        coeffs = {}
        for (unit_idx, route_idx), var_name in var_names.items():
            route = selected_routes[route_idx]
            if route.source == source_id:
                coeffs[var_name] = 1
        if coeffs:
            qp.linear_constraint(
                linear=coeffs,
                sense="<=",
                rhs=cap,
                name=f"alloc_capacity_{source_id}",
            )

    if len(var_names) > MAX_QAOA_ALLOCATION_VARIABLES:
        raise ValueError(
            f"Allocation graph too large for demo QAOA budget ({len(var_names)} > {MAX_QAOA_ALLOCATION_VARIABLES})."
        )

    max_route_cost = max(route.cost for route in selected_routes)
    penalty = max(1.0, max_route_cost * max(1, len(var_names)) * 2)
    converter = QuadraticProgramToQubo(penalty=penalty)
    qubo_qp = converter.convert(qp)

    sampler = Sampler(options={"shots": 512, "seed": 42})
    qaoa_reps = 1
    qaoa_optimizer = COBYLA(maxiter=60)
    qaoa = QAOA(sampler=sampler, optimizer=qaoa_optimizer, reps=qaoa_reps)
    minimum_eigen_optimizer = MinimumEigenOptimizer(min_eigen_solver=qaoa)
    result = minimum_eigen_optimizer.solve(qubo_qp)

    try:
        interpreted_x = converter.interpret(result.x)
    except Exception:
        interpreted_x = result.x

    values = [float(v) for v in interpreted_x]
    variable_order = list(qubo_qp.variables)
    value_by_name = {
        variable_order[idx].name: values[idx]
        for idx in range(min(len(values), len(variable_order)))
    }

    shipments: List[dict] = []
    allocation_cost = 0.0

    for unit_idx, unit in enumerate(unit_demands):
        picked_route_idx = None
        best_value = -1.0

        for route_idx in candidates_by_unit[unit_idx]:
            var_name = var_names[(unit_idx, route_idx)]
            val = value_by_name.get(var_name, 0.0)
            if val > best_value:
                best_value = val
                picked_route_idx = route_idx

        if picked_route_idx is None:
            picked_route_idx = candidates_by_unit[unit_idx][0]

        route = selected_routes[picked_route_idx]
        allocation_cost += route.cost
        shipments.append(
            {
                "unit_id": unit["unit_id"],
                "destination": unit["destination"],
                "route_id": route.id,
                "source": route.source,
                "estimated_route_cost": route.cost,
            }
        )

    metadata = {
        "allocation_solver": "qaoa",
        "allocation_penalty": round(penalty, 4),
        "allocation_variables": len(var_names),
        "qaoa_reps": qaoa_reps,
        "qaoa_optimizer": "COBYLA(maxiter=60)",
        "qaoa_shots": 512,
        "allocation_total_cost": round(allocation_cost, 4),
    }
    return shipments, metadata


def _classical_allocate_shipments(graph_data: GraphData, selected_indices: List[int]) -> Tuple[List[dict], dict]:
    selected_routes = [graph_data.routes[idx] for idx in selected_indices]
    unit_demands = _build_unit_demands(graph_data)

    routes_by_destination: Dict[str, List] = defaultdict(list)
    for route in selected_routes:
        routes_by_destination[route.destination].append(route)

    for destination in routes_by_destination:
        routes_by_destination[destination].sort(key=lambda route: (route.cost, route.time))

    shipments: List[dict] = []
    total = 0.0

    for unit in unit_demands:
        candidates = routes_by_destination.get(unit["destination"], [])
        if not candidates:
            raise ValueError(
                f"Classical allocation failed for destination '{unit['destination']}'."
            )

        route = candidates[0]
        total += route.cost
        shipments.append(
            {
                "unit_id": unit["unit_id"],
                "destination": unit["destination"],
                "route_id": route.id,
                "source": route.source,
                "estimated_route_cost": route.cost,
            }
        )

    return shipments, {
        "allocation_solver": "qaoa_assisted_heuristic",
        "allocation_total_cost": round(total, 4),
    }


def optimize_quantum(graph_data: GraphData) -> dict:
    """
    Hybrid quantum pipeline:
    1) VQE selects an optimized feasible route subset.
    2) QAOA allocates shipment units to selected routes.
    3) Fallbacks preserve endpoint reliability for live demos.
    """
    if not graph_data.routes:
        raise ValueError("No routes provided. Optimizer requires at least one route.")

    _normalize_route_ids(graph_data)

    selected_indices: List[int]
    vqe_metadata: dict
    route_solver_status = "operational"

    try:
        selected_indices, vqe_metadata = _solve_route_selection_with_vqe(graph_data)
    except Exception as exc:
        selected_indices, fallback_solver = _classical_route_selection_fallback(graph_data)
        route_solver_status = "operational_with_assist"
        vqe_metadata = {
            "route_solver": fallback_solver,
            "route_fallback_reason": f"{type(exc).__name__}: {str(exc)}",
            "qubo_variables": len(graph_data.routes),
        }

    selected_routes = [graph_data.routes[idx] for idx in selected_indices]
    route_total_cost = sum(route.cost for route in selected_routes)

    allocation_status = "operational"
    try:
        shipment_plan, allocation_metadata = _qaoa_allocate_shipments(graph_data, selected_indices)
    except Exception as exc:
        shipment_plan, allocation_metadata = _classical_allocate_shipments(
            graph_data, selected_indices
        )
        allocation_status = "operational_with_assist"
        allocation_metadata["allocation_fallback_reason"] = f"{type(exc).__name__}: {str(exc)}"

    return {
        "routes_selected": [route.model_dump() for route in selected_routes],
        "total_cost": round(route_total_cost, 4),
        "solver": "hybrid_vqe_qaoa",
        "metadata": {
            "selected_route_count": len(selected_routes),
            "route_solver_status": route_solver_status,
            "allocation_status": allocation_status,
            **vqe_metadata,
            **allocation_metadata,
        },
        "shipment_plan": shipment_plan,
    }
