from copy import deepcopy

from models.schemas import GraphData
from services.classical_optimizer import optimize_classical
from services.metrics import build_comparison_metrics
from services.quantum_optimizer import optimize_quantum


def simulate_disruption(graph_data: GraphData, disabled_routes: list[str]) -> dict:
    disrupted = deepcopy(graph_data)
    disabled_set = set(disabled_routes)

    disrupted.routes = [route for route in disrupted.routes if route.id not in disabled_set]

    classical = optimize_classical(disrupted)
    quantum = optimize_quantum(disrupted)
    metrics = build_comparison_metrics(classical["total_cost"], quantum["total_cost"])

    return {
        "disabled_routes": list(disabled_set),
        "remaining_route_count": len(disrupted.routes),
        "classical": classical,
        "quantum": quantum,
        "comparison_metrics": metrics,
    }