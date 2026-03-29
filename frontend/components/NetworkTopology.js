import { motion } from "framer-motion";
import { warehousePositions } from "../data/enterpriseData";

export default function NetworkTopology({ warehouses, routes, classicalIds, quantumIds, disabledIds, mode, onModeChange }) {
  function visibleRoute(routeId) {
    if (mode === "both") return true;
    if (mode === "classical") return classicalIds.includes(routeId);
    if (mode === "quantum") return quantumIds.includes(routeId);
    return true;
  }

  function routeColor(routeId) {
    if (disabledIds.includes(routeId)) return "#ef4444";
    if (quantumIds.includes(routeId)) return "#2563eb";
    if (classicalIds.includes(routeId)) return "#f59e0b";
    return "#cbd5e1";
  }

  return (
    <div className="card h-full flex flex-col p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Network Topology</h3>
        <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 text-xs">
          <button onClick={() => onModeChange("both")} className={`cursor-pointer rounded-full px-2 py-1 transition ${mode === "both" ? "bg-white font-semibold text-slate-700" : "text-slate-500 hover:text-slate-700"}`}>Both</button>
          <button onClick={() => onModeChange("classical")} className={`cursor-pointer rounded-full px-2 py-1 transition ${mode === "classical" ? "bg-white font-semibold text-amber-700" : "text-slate-500 hover:text-amber-600"}`}>Classical</button>
          <button onClick={() => onModeChange("quantum")} className={`cursor-pointer rounded-full px-2 py-1 transition ${mode === "quantum" ? "bg-white font-semibold text-blue-700" : "text-slate-500 hover:text-blue-600"}`}>Quantum</button>
        </div>
      </div>

      <div className="relative flex-1 min-h-[480px] rounded-xl border border-slate-200 bg-slate-50">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          {routes.filter((route) => visibleRoute(route.id)).map((route) => {
            const from = warehousePositions[route.source];
            const to = warehousePositions[route.destination];
            if (!from || !to) return null;

            const isHighlighted = quantumIds.includes(route.id) || classicalIds.includes(route.id);
            return (
              <motion.g key={route.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={routeColor(route.id)}
                  strokeWidth={isHighlighted ? 0.6 : 0.3}
                  strokeDasharray={disabledIds.includes(route.id) ? "1.2 1.2" : "none"}
                  strokeOpacity={isHighlighted ? 0.95 : 0.65}
                />
              </motion.g>
            );
          })}

          {warehouses.map((warehouse) => {
            const pos = warehousePositions[warehouse.id];
            if (!pos) return null;
            return (
              <motion.g key={warehouse.id} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
                <circle cx={pos.x} cy={pos.y} r="1.35" fill="#fff" stroke="#2563eb" strokeWidth="0.5" />
                <circle cx={pos.x} cy={pos.y} r="0.22" fill="#2563eb" />
                <text x={pos.x - 2.4} y={pos.y + 3.2} className="fill-slate-500 text-[2.2px]" fontFamily="Manrope, sans-serif">
                  {pos.short}
                </text>
                <text x={pos.x - 0.9} y={pos.y + 4.8} className="fill-slate-400 text-[1.8px]" fontFamily="Manrope, sans-serif">
                  {warehouse.id}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-5 text-xs text-slate-500">
        <div className="inline-flex items-center gap-2"><span className="h-1.5 w-5 rounded bg-amber-500" /> Classical</div>
        <div className="inline-flex items-center gap-2"><span className="h-1.5 w-5 rounded bg-blue-600" /> Quantum</div>
        <div className="inline-flex items-center gap-2"><span className="h-1.5 w-5 rounded bg-red-500" /> Disabled</div>
      </div>
    </div>
  );
}
