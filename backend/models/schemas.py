from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Warehouse(BaseModel):
    id: str
    location: str
    capacity: int = Field(ge=0)


class Route(BaseModel):
    id: Optional[str] = None
    source: str
    destination: str
    cost: float = Field(gt=0)
    time: float = Field(gt=0)


class Demand(BaseModel):
    region: str
    required_units: int = Field(ge=1)


class GraphData(BaseModel):
    warehouses: List[Warehouse]
    routes: List[Route]
    demand: List[Demand]


class SimulationRequest(BaseModel):
    graph_data: GraphData
    disabled_routes: List[str]


class OptimizationResponse(BaseModel):
    selected_routes: List[Route]
    cost: float
    comparison_metrics: Dict[str, Any]
    details: Dict[str, Any]
