from collections import defaultdict
from typing import Dict, List

from models.schemas import GraphData


def _normalize_route_ids(graph_data: GraphData) -> None:
    for idx, route in enumerate(graph_data.routes):
        if not route.id:
            route.id = f"r{idx}"


def optimize_classical(graph_data: GraphData) -> dict:
    """Greedy baseline: satisfy each demand using cheapest inbound routes."""
    _normalize_route_ids(graph_data)

    remaining_capacity: Dict[str, int] = {w.id: w.capacity for w in graph_data.warehouses}
    routes_by_destination: Dict[str, List] = defaultdict(list)
    for route in graph_data.routes:
        routes_by_destination[route.destination].append(route)

    for destination_routes in routes_by_destination.values():
        destination_routes.sort(key=lambda r: (r.cost, r.time))

    selected_route_ids = set()

    for demand in graph_data.demand:
        needed = demand.required_units
        candidates = routes_by_destination.get(demand.region, [])

        for route in candidates:
            if needed == 0:
                break
            if route.id in selected_route_ids:
                continue
            if remaining_capacity.get(route.source, 0) <= 0:
                continue

            selected_route_ids.add(route.id)
            remaining_capacity[route.source] -= 1
            needed -= 1

        if needed > 0:
            raise ValueError(
                f"Classical optimizer could not satisfy demand for region '{demand.region}'."
            )

    selected_routes = [route for route in graph_data.routes if route.id in selected_route_ids]
    total_cost = sum(route.cost for route in selected_routes)

    return {
        "routes_selected": [route.model_dump() for route in selected_routes],
        "total_cost": round(total_cost, 4),
        "solver": "classical_greedy",
        "metadata": {
            "selected_route_count": len(selected_routes),
        },
    }
