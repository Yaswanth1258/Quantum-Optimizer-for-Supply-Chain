from fastapi import APIRouter, HTTPException

from models.schemas import GraphData, OptimizationResponse, SimulationRequest
from services.classical_optimizer import optimize_classical
from services.metrics import build_comparison_metrics
from services.quantum_optimizer import optimize_quantum
from services.simulation_engine import simulate_disruption


router = APIRouter(prefix="", tags=["optimization"])


@router.post("/optimize/classical", response_model=OptimizationResponse)
def optimize_classical_endpoint(graph_data: GraphData) -> dict:
    try:
        classical = optimize_classical(graph_data)
        quantum = optimize_quantum(graph_data)
        metrics = build_comparison_metrics(classical["total_cost"], quantum["total_cost"])

        return {
            "selected_routes": classical["routes_selected"],
            "cost": classical["total_cost"],
            "comparison_metrics": metrics,
            "details": {
                "classical": classical,
                "quantum": quantum,
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/optimize/quantum", response_model=OptimizationResponse)
def optimize_quantum_endpoint(graph_data: GraphData) -> dict:
    try:
        quantum = optimize_quantum(graph_data)
        classical = optimize_classical(graph_data)
        metrics = build_comparison_metrics(classical["total_cost"], quantum["total_cost"])

        return {
            "selected_routes": quantum["routes_selected"],
            "cost": quantum["total_cost"],
            "comparison_metrics": metrics,
            "details": {
                "classical": classical,
                "quantum": quantum,
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/simulate")
def simulate_endpoint(payload: SimulationRequest) -> dict:
    try:
        return simulate_disruption(payload.graph_data, payload.disabled_routes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
