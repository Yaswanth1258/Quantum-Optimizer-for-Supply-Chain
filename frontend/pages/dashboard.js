import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiPlay, FiAlertTriangle, FiLoader, FiCpu, FiZap } from "react-icons/fi";

import AppShell from "../components/AppShell";
import NetworkTopology from "../components/NetworkTopology";
import StatCards from "../components/StatCards";
import { enterpriseGraphData } from "../data/enterpriseData";
import { optimizeClassical, optimizeQuantum, simulateDisruption } from "../services/api";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

function routeIds(result) {
  return (result?.selected_routes || []).map((route) => route.id);
}

function routesByIds(routeIdsToSelect) {
  const routeMap = new Map(enterpriseGraphData.routes.map((route) => [route.id, route]));
  return routeIdsToSelect.map((id) => routeMap.get(id)).filter(Boolean);
}

const demoClassicalResult = {
  cost: 11500,
  selected_routes: routesByIds(["R3", "R6", "R7", "R5", "R10"]),
  details: {
    classical: {
      solver: "classical_greedy_demo",
      metadata: { selected_route_count: 5 },
    },
  },
};

const demoQuantumResult = {
  cost: 10000,
  selected_routes: routesByIds(["R4", "R6", "R7", "R10", "R11"]),
  details: {
    quantum: {
      solver: "hybrid_vqe_qaoa_demo",
      metadata: {
        route_solver: "vqe",
        allocation_solver: "qaoa",
        route_solver_status: "demo-seeded",
        allocation_status: "demo-seeded",
        qaoa_reps: 1,
        qubo_penalty: 4200,
      },
      shipment_plan: [],
    },
  },
};

export default function DashboardPage() {
  const [graphData] = useState(enterpriseGraphData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("both");
  const [activeDisableTab, setActiveDisableTab] = useState("warehouses");
  const [disabledRoutes, setDisabledRoutes] = useState([]);
  const [classicalResult, setClassicalResult] = useState(demoClassicalResult);
  const [quantumResult, setQuantumResult] = useState(demoQuantumResult);
  const [simulationResult, setSimulationResult] = useState(null);
  const [logLines, setLogLines] = useState(["System boot complete.", "Waiting for optimization run."]);
  const autoRunStarted = useRef(false);

  const classicalIds = useMemo(() => routeIds(classicalResult), [classicalResult]);
  const quantumIds = useMemo(() => routeIds(quantumResult), [quantumResult]);

  const reductionPct = useMemo(() => {
    const classical = classicalResult?.cost || 0;
    const quantum = quantumResult?.cost || 0;
    if (!classical) return 0;
    return ((classical - quantum) / classical) * 100;
  }, [classicalResult, quantumResult]);

  const quantumMeta = useMemo(() => {
    return (
      quantumResult?.details?.quantum?.metadata || {
        route_solver: "vqe",
        allocation_solver: "qaoa",
        route_solver_status: "queued",
        allocation_status: "queued",
      }
    );
  }, [quantumResult]);

  const visibleRouteRows = useMemo(() => {
    const classicalRoutes = classicalResult?.selected_routes || [];
    const quantumRoutes = quantumResult?.selected_routes || [];

    if (viewMode === "classical") {
      return classicalRoutes.map((route) => ({ ...route, bucket: "classical" }));
    }

    if (viewMode === "quantum") {
      return quantumRoutes.map((route) => ({ ...route, bucket: "quantum" }));
    }

    const byId = new Map();
    classicalRoutes.forEach((route) => {
      byId.set(route.id, { ...route, bucket: "both" });
    });
    quantumRoutes.forEach((route) => {
      const existing = byId.get(route.id);
      if (existing) {
        byId.set(route.id, { ...route, bucket: "both" });
      } else {
        byId.set(route.id, { ...route, bucket: "quantum" });
      }
    });

    return Array.from(byId.values());
  }, [classicalResult, quantumResult, viewMode]);

  const statItems = [
    { key: "warehouses", label: "Warehouses", value: graphData.warehouses.length },
    { key: "routes", label: "Active Routes", value: graphData.routes.length - disabledRoutes.length },
    { key: "classical", label: "Classical Cost", value: money.format(classicalResult?.cost || 36200) },
    { key: "quantum", label: "Quantum Cost", value: money.format(quantumResult?.cost || 10700) },
    { key: "saving", label: "Cost Savings", value: `${reductionPct.toFixed(1)}%` },
    {
      key: "speed",
      label: "Route Solver",
      value: (quantumMeta.route_solver || "pending").toUpperCase(),
    }
  ];

  function pushLog(text) {
    const stamp = new Date().toLocaleTimeString();
    setLogLines((prev) => [`[${stamp}] ${text}`, ...prev].slice(0, 12));
  }

  async function runOptimization() {
    setLoading(true);
    setError("");
    pushLog("Running classical and quantum optimizers in parallel.");

    try {
      const [classical, quantum] = await Promise.all([
        optimizeClassical(graphData),
        optimizeQuantum(graphData)
      ]);

      setClassicalResult(classical);
      setQuantumResult(quantum);
      setSimulationResult(null);
      pushLog(`Run complete. Classical ${money.format(classical.cost)} vs Quantum ${money.format(quantum.cost)}.`);
    } catch (err) {
      setError(err.message || "Optimization failed.");
      pushLog("Optimization failed. Check backend logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoRunStarted.current) return;
    autoRunStarted.current = true;
    runOptimization();
  }, []);

  async function runSimulation() {
    setLoading(true);
    setError("");
    pushLog(`Applying disruption scenario with ${disabledRoutes.length} disabled routes.`);

    try {
      const result = await simulateDisruption(graphData, disabledRoutes);
      setSimulationResult(result);
      setClassicalResult({
        cost: result.classical.total_cost,
        selected_routes: result.classical.routes_selected,
        details: { classical: result.classical }
      });
      setQuantumResult({
        cost: result.quantum.total_cost,
        selected_routes: result.quantum.routes_selected,
        details: { quantum: result.quantum }
      });
      pushLog("Simulation completed with successful re-optimization.");
    } catch (err) {
      setError(err.message || "Simulation failed.");
      pushLog("Simulation failed due to infeasible route constraints.");
    } finally {
      setLoading(false);
    }
  }

  function toggleRoute(routeId) {
    setDisabledRoutes((prev) =>
      prev.includes(routeId) ? prev.filter((id) => id !== routeId) : [...prev, routeId]
    );
  }

  function toggleWarehouse(warehouseId) {
    const affectedRoutes = graphData.routes
      .filter((route) => route.source === warehouseId || route.destination === warehouseId)
      .map((route) => route.id);

    setDisabledRoutes((prev) => {
      const allSelected = affectedRoutes.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !affectedRoutes.includes(id));
      }
      const set = new Set([...prev, ...affectedRoutes]);
      return Array.from(set);
    });
  }

  const actionButton = (
    <button onClick={runOptimization} disabled={loading} className="primary-btn">
      {loading ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiPlay className="h-4 w-4" />}
      <span>Run Optimization</span>
    </button>
  );

  return (
    <AppShell
      title="Supply Chain Optimizer"
      subtitle="Quantum-enhanced logistics optimization for global enterprises"
      action={actionButton}
    >
      <StatCards items={statItems} />

      <div className="grid gap-4 lg:grid-cols-[3fr_1fr]">
        <NetworkTopology
          warehouses={graphData.warehouses}
          routes={graphData.routes}
          classicalIds={classicalIds}
          quantumIds={quantumIds}
          disabledIds={disabledRoutes}
          mode={viewMode}
          onModeChange={setViewMode}
        />

        <section className="space-y-4">
          <article className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Disruption Simulator</h3>
            <div className="mb-3 flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
              <button
                className={`tab-btn ${activeDisableTab === "warehouses" ? "tab-btn-active" : ""}`}
                onClick={() => setActiveDisableTab("warehouses")}
              >
                Warehouses
              </button>
              <button
                className={`tab-btn ${activeDisableTab === "routes" ? "tab-btn-active" : ""}`}
                onClick={() => setActiveDisableTab("routes")}
              >
                Routes
              </button>
            </div>

            <div className="h-[230px] space-y-2 overflow-auto pr-1">
              {activeDisableTab === "warehouses" &&
                graphData.warehouses.map((warehouse) => {
                  const affected = graphData.routes.filter(
                    (route) => route.source === warehouse.id || route.destination === warehouse.id
                  );
                  const allSelected = affected.every((route) => disabledRoutes.includes(route.id));
                  return (
                    <button
                      key={warehouse.id}
                      onClick={() => toggleWarehouse(warehouse.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        allSelected
                          ? "border-blue-300 bg-blue-50 text-blue-800"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-semibold">{warehouse.id}  {warehouse.location}</div>
                      <div className="text-xs text-slate-500">{affected.length} connected routes</div>
                    </button>
                  );
                })}

              {activeDisableTab === "routes" &&
                graphData.routes.map((route) => {
                  const checked = disabledRoutes.includes(route.id);
                  return (
                    <label key={route.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <input type="checkbox" checked={checked} onChange={() => toggleRoute(route.id)} className="h-4 w-4 accent-blue-600" />
                      <span className="font-semibold">{route.id}</span>
                      <span className="text-slate-500">{route.source} to {route.destination}</span>
                    </label>
                  );
                })}
            </div>

            <button onClick={runSimulation} disabled={loading} className="secondary-btn mt-3 w-full justify-center">
              {loading ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiAlertTriangle className="h-4 w-4" />}
              Simulate Disruption
            </button>
          </article>

          <article className="card p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Quantum Engine</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="metric-row"><span>Route Optimizer</span><strong>{(quantumMeta.route_solver || "vqe").toUpperCase()}</strong></div>
              <div className="metric-row"><span>Shipment Allocator</span><strong>{(quantumMeta.allocation_solver || "qaoa").toUpperCase()}</strong></div>
              <div className="metric-row"><span>Qubits</span><strong>{graphData.routes.length}</strong></div>
              <div className="metric-row"><span>Layers (p)</span><strong>{quantumMeta.qaoa_reps || "n/a"}</strong></div>
              <div className="metric-row"><span>QUBO Penalty</span><strong>{quantumMeta.qubo_penalty || "n/a"}</strong></div>
              <div className="metric-row"><span>Connected Nodes</span><strong>{graphData.warehouses.length}/{graphData.warehouses.length}</strong></div>
              <div className="metric-row"><span>Route Status</span><strong>{quantumMeta.route_solver_status || "operational"}</strong></div>
              <div className="metric-row"><span>Allocation Status</span><strong>{quantumMeta.allocation_status || "operational"}</strong></div>
            </div>
          </article>
        </section>
      </div>

      <section className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <article className="card p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Optimization Log</h3>
          <div className="h-[165px] space-y-1 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            {logLines.map((line, index) => (
              <div key={`${line}-${index}`} className="font-mono">{line}</div>
            ))}
          </div>
        </article>

        <article className="card p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Route View</h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              ["both", "Both"],
              ["classical", "Classical"],
              ["quantum", "Quantum"]
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setViewMode(value)}
                className={`rounded-md border px-2 py-1.5 font-semibold transition ${
                  viewMode === value
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 max-h-[170px] space-y-2 overflow-auto pr-1">
            {visibleRouteRows.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-500">
                No routes available yet. Click Run Optimization.
              </div>
            )}
            {visibleRouteRows.map((route) => (
              <div key={`${route.id}-${route.bucket}`} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-semibold">{route.id}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${
                      route.bucket === "classical"
                        ? "bg-amber-100 text-amber-700"
                        : route.bucket === "quantum"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {route.bucket}
                  </span>
                </div>
                <div className="mt-1 text-slate-500">{route.source} to {route.destination}</div>
                <div className="text-slate-400">Cost ${route.cost}  Time {route.time}</div>
              </div>
            ))}
          </div>
          {simulationResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700"
            >
              <div className="mb-1 inline-flex items-center gap-1 font-semibold"><FiZap className="h-3 w-3" /> Re-optimization ready</div>
              <div>Remaining routes: {simulationResult.remaining_route_count}</div>
              <div>Quantum improvement: {simulationResult.comparison_metrics.efficiency_improvement_pct.toFixed(2)}%</div>
            </motion.div>
          )}
          {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div>}
        </article>
      </section>
    </AppShell>
  );
}
