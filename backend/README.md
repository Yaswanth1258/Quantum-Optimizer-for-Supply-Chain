# Quantum-Enhanced Supply Chain Optimization Backend

## What is included

- FastAPI API with 3 endpoints:
  - POST /optimize/classical
  - POST /optimize/quantum
  - POST /simulate
- Classical greedy optimizer baseline
- Quantum optimizer with QAOA (Qiskit)
- Disruption simulator that re-runs both solvers
- Sample demo graph data in data/sample_data.json

## Project structure

backend/
- main.py
- models/
  - schemas.py
- routes/
  - optimize.py
- services/
  - classical_optimizer.py
  - quantum_optimizer.py
  - simulation_engine.py
  - metrics.py
- data/
  - sample_data.json
- requirements.txt

## Run locally

1. Create and activate a virtual environment.
2. Install dependencies:

   pip install -r requirements.txt

3. Start server:

   uvicorn main:app --reload --port 8000

4. Open docs:

   http://127.0.0.1:8000/docs

## Quick demo request bodies

Use the content of data/sample_data.json as the body for:
- POST /optimize/classical
- POST /optimize/quantum

For POST /simulate use:

{
  "graph_data": { ...same as sample_data.json... },
  "disabled_routes": ["R3", "R10"]
}

## Notes on the quantum solver

The quantum endpoint builds a constrained binary optimization model, converts it to QUBO, and then solves using QAOA with a simulator primitive.
