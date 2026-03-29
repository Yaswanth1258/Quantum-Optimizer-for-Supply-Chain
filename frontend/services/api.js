const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

async function postJson(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const rawMessage = await response.text();
    let message = rawMessage;

    try {
      const parsed = JSON.parse(rawMessage);
      message = parsed.detail || parsed.message || rawMessage;
    } catch (_err) {
      // Keep plain text message when body is not JSON.
    }

    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json();
}

export function optimizeClassical(graphData) {
  return postJson("/optimize/classical", graphData);
}

export function optimizeQuantum(graphData) {
  return postJson("/optimize/quantum", graphData);
}

export function simulateDisruption(graphData, disabledRoutes) {
  return postJson("/simulate", {
    graph_data: graphData,
    disabled_routes: disabledRoutes,
  });
}

async function getJson(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const rawMessage = await response.text();
    let message = rawMessage;

    try {
      const parsed = JSON.parse(rawMessage);
      message = parsed.detail || parsed.message || rawMessage;
    } catch (_err) {
      // Keep plain text message when body is not JSON.
    }

    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json();
}

function normalizeDemand(demandRaw) {
  if (!demandRaw) {
    return [];
  }

  if (Array.isArray(demandRaw)) {
    return demandRaw.map((item) => ({
      region: item.region || item.id || "Unknown",
      required_units: item.required_units ?? item.value ?? 0,
    }));
  }

  return Object.entries(demandRaw).map(([region, requiredUnits]) => ({
    region,
    required_units: requiredUnits,
  }));
}

function normalizeNetworkPayload(data) {
  const warehouses = (data.warehouses || []).map((warehouse) => ({
    id: warehouse.id,
    location: warehouse.location || warehouse.name || warehouse.id,
    region: warehouse.region || warehouse.type || "Network",
    capacity: warehouse.capacity ?? 0,
    demand_load: warehouse.demand_load ?? 0,
    inventory: warehouse.inventory ?? Math.round((warehouse.capacity ?? 0) * 0.75),
    lat: warehouse.lat,
    lng: warehouse.lng,
  }));

  const demand = normalizeDemand(data.demand);
  const demandByRegion = demand.reduce((acc, item) => {
    acc[item.region] = (acc[item.region] || 0) + (item.required_units || 0);
    return acc;
  }, {});

  const warehousesWithDemand = warehouses.map((warehouse) => ({
    ...warehouse,
    demand_load: warehouse.demand_load || demandByRegion[warehouse.id] || demandByRegion[warehouse.location] || Math.round((warehouse.capacity || 0) * 0.6),
  }));

  const routes = (data.routes || []).map((route) => ({
    id: route.id,
    source: route.source || route.from,
    destination: route.destination || route.to,
    cost: route.cost ?? 0,
    time: route.time ?? 0,
    mode: route.mode || "road",
    capacity: route.capacity,
    distance: route.distance,
  }));

  return {
    warehouses: warehousesWithDemand,
    routes,
    demand,
  };
}

export function getNetworkData() {
  return getJson("/data/network")
    .then((data) => normalizeNetworkPayload(data))
    .catch(async () => {
      const [warehousesResp, routesResp, demandResp] = await Promise.all([
        getJson("/data/warehouses"),
        getJson("/data/routes"),
        getJson("/data/demand"),
      ]);

      return normalizeNetworkPayload({
        warehouses: warehousesResp.warehouses || [],
        routes: routesResp.routes || [],
        demand: demandResp.demand || [],
      });
    });
}

export function getWarehouses() {
  return getJson("/data/warehouses");
}
