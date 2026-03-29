import { useMemo, useState, useEffect } from "react";

import AppShell from "../components/AppShell";
import { getNetworkData } from "../services/api";

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function utilization(warehouse) {
  return Math.min(100, Math.round((warehouse.demand_load / warehouse.capacity) * 100));
}

export default function NetworkPage() {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("W1");
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getNetworkData();
        setGraphData(data);
        setError(null);
      } catch (err) {
        setError(err.message || "Failed to fetch network data");
        console.error("Error fetching network data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const selectedWarehouse = useMemo(
    () => graphData?.warehouses?.find((w) => w.id === selectedWarehouseId),
    [selectedWarehouseId, graphData]
  );

  const connectedRoutes = useMemo(
    () =>
      graphData?.routes?.filter(
        (route) => route.source === selectedWarehouseId || route.destination === selectedWarehouseId
      ) || [],
    [selectedWarehouseId, graphData]
  );

  const modeSummary = useMemo(() => {
    const summary = { sea: 0, air: 0, road: 0, truck: 0, other: 0 };
    graphData?.routes?.forEach((route) => {
      const mode = (route.mode || "other").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(summary, mode)) {
        summary[mode] += 1;
      } else {
        summary.other += 1;
      }
    });
    return summary;
  }, [graphData]);

  const demandSnapshot = useMemo(() => {
    return (graphData?.demand || []).slice(0, 8);
  }, [graphData]);

  if (loading) {
    return (
      <AppShell title="Network Overview" subtitle="Loading global supply chain topology...">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-600">Fetching network data...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Network Overview" subtitle="Error loading network data">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700 font-semibold">Failed to load network data</p>
          <p className="text-red-600 text-sm mt-2">{error}</p>
        </div>
      </AppShell>
    );
  }

  if (!graphData || !graphData.warehouses) {
    return (
      <AppShell title="Network Overview" subtitle="No network data available">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          Unable to load network data. Please try refreshing the page.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Network Overview"
      subtitle={`Global supply chain topology - ${graphData.warehouses.length} warehouses, ${graphData.routes.length} routes`}
    >
      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          {graphData.warehouses.map((warehouse) => {
            const selected = warehouse.id === selectedWarehouseId;
            const pct = utilization(warehouse);
            return (
              <button
                key={warehouse.id}
                onClick={() => setSelectedWarehouseId(warehouse.id)}
                className={`card w-full p-4 text-left transition ${selected ? "ring-2 ring-blue-200" : "hover:shadow-md"}`}
              >
                <div className="mb-1 flex items-start justify-between">
                  <div>
                    <div className="text-base font-bold text-slate-800">{warehouse.id}  {warehouse.location}</div>
                    <div className="text-xs text-slate-500">{warehouse.region}</div>
                  </div>
                  <div className="text-xs text-slate-400">{pct}%</div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-slate-500">
                  <div>
                    <div>Capacity</div>
                    <div className="font-semibold text-slate-700">{formatNumber(warehouse.capacity)}</div>
                  </div>
                  <div>
                    <div>Demand</div>
                    <div className="font-semibold text-slate-700">{formatNumber(warehouse.demand_load)}</div>
                  </div>
                  <div>
                    <div>Inventory</div>
                    <div className="font-semibold text-slate-700">{formatNumber(warehouse.inventory)}</div>
                  </div>
                </div>

                <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>

        <aside className="space-y-3">
          <article className="card p-4">
            {!selectedWarehouse ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Select a warehouse to view details.
              </div>
            ) : (
              <>
                <h3 className="text-3xl font-black text-slate-900">{selectedWarehouse.location}</h3>
                <p className="text-xs text-slate-500">{selectedWarehouse.region} - {selectedWarehouse.id}</p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-slate-500">Capacity</div>
                    <div className="text-lg font-semibold text-slate-800">{formatNumber(selectedWarehouse.capacity)}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-slate-500">Demand</div>
                    <div className="text-lg font-semibold text-slate-800">{formatNumber(selectedWarehouse.demand_load)}</div>
                  </div>
                </div>

                <h4 className="mt-3 text-sm font-semibold text-slate-700">Connected Routes</h4>
                <div className="mt-2 space-y-2">
                  {connectedRoutes.map((route) => (
                    <div key={route.id} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">{route.id}  {route.source} to {route.destination}</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 uppercase text-[10px] text-slate-600">{route.mode}</span>
                      </div>
                      <div className="mt-1 text-slate-500">${formatNumber(route.cost)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </article>

          <article className="card p-4">
            <h4 className="mb-2 text-sm font-semibold text-slate-700">Transport Modes</h4>
            <div className="space-y-1.5 text-sm text-slate-600">
              <div className="flex justify-between"><span>Sea</span><span>{modeSummary.sea} routes</span></div>
              <div className="flex justify-between"><span>Air</span><span>{modeSummary.air} routes</span></div>
              <div className="flex justify-between"><span>Road</span><span>{modeSummary.road} routes</span></div>
              <div className="flex justify-between"><span>Truck</span><span>{modeSummary.truck} routes</span></div>
              <div className="flex justify-between"><span>Other</span><span>{modeSummary.other} routes</span></div>
            </div>
          </article>

          <article className="card p-4">
            <h4 className="mb-2 text-sm font-semibold text-slate-700">Demand Snapshot</h4>
            <div className="space-y-1.5 text-sm text-slate-600">
              {demandSnapshot.length === 0 ? (
                <div className="text-slate-500">No demand data available</div>
              ) : (
                demandSnapshot.map((demand) => (
                  <div key={demand.region} className="flex justify-between">
                    <span>{demand.region}</span>
                    <span>{formatNumber(demand.required_units)}</span>
                  </div>
                ))
              )}
            </div>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}
