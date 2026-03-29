import json
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.optimize import router as optimize_router

app = FastAPI(
    title="Quantum-Enhanced Supply Chain Optimization API",
    version="0.1.0",
    description="Classical vs quantum optimization for supply chain routing.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(optimize_router)

# Load data
DATA_PATH = Path(__file__).parent / "data" / "sample_data.json"

def load_supply_chain_data():
    with open(DATA_PATH, "r") as f:
        return json.load(f)

@app.get("/")
def home() -> dict:
    return {"message": "Quantum Supply Chain API is running"}


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.get("/data/network")
def get_network_data() -> dict:
    """Get complete supply chain network data"""
    return load_supply_chain_data()


@app.get("/data/warehouses")
def get_warehouses() -> dict:
    """Get warehouses data"""
    data = load_supply_chain_data()
    return {"warehouses": data.get("warehouses", [])}
