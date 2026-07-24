import { AIRPORTS } from "../data/defaults.js";

export const MAX_NEARBY_AIRPORTS_PER_SIDE = 5;
export const MAX_EXPANDED_ROUTES_PER_SAVED_ROUTE = 12;
export const MAX_EXPANDED_ROUTES_TOTAL = 30;

// Curated metro groups take precedence over raw distance because a nearby
// airport is only useful when it is a practical substitute for the city.
export const METRO_AIRPORT_GROUPS = {
  LAX: ["LAX", "BUR", "LGB", "SNA", "ONT"],
  SFO: ["SFO", "OAK", "SJC"],
  NYC: ["JFK", "EWR", "LGA"],
  WAS: ["IAD", "DCA", "BWI"],
  CHI: ["ORD", "MDW"],
  LON: ["LHR", "LGW", "LCY", "STN", "LTN"],
  PAR: ["CDG", "ORY"],
  TYO: ["HND", "NRT"],
  TPE: ["TPE", "TSA"],
  SEL: ["ICN", "GMP"],
  OSA: ["KIX", "ITM"],
  BKK: ["BKK", "DMK"],
  IST: ["IST", "SAW"],
};

const AIRPORT_TO_METRO = Object.entries(METRO_AIRPORT_GROUPS).reduce((map, [metro, codes]) => {
  for (const code of codes) map[code] = metro;
  return map;
}, {});

const toRad = (degrees) => (degrees * Math.PI) / 180;

export function distanceMiles(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lon) || !Number.isFinite(b.lat) || !Number.isFinite(b.lon)) return Infinity;
  const earthRadiusMiles = 3958.7613;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusMiles * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function findNearbyAirports(code, radiusMiles = 50, limit = MAX_NEARBY_AIRPORTS_PER_SIDE) {
  const normalized = String(code || "").toUpperCase();
  const base = AIRPORTS[normalized];
  if (!base) return [normalized].filter(Boolean);
  const radius = Number.isFinite(Number(radiusMiles)) ? Math.max(0, Number(radiusMiles)) : 50;
  const metro = AIRPORT_TO_METRO[normalized];
  const curated = metro ? METRO_AIRPORT_GROUPS[metro].filter((airport) => AIRPORTS[airport]) : [];
  const candidates = Object.entries(AIRPORTS)
    .map(([airport, info]) => ({ airport, miles: distanceMiles(base, info) }))
    .filter((item) => item.miles <= radius)
    .sort((a, b) => a.miles - b.miles)
    .map((item) => item.airport);

  const ordered = [normalized, ...curated, ...candidates];
  return [...new Set(ordered)].slice(0, Math.max(1, limit));
}

export function nearbyPreview(route) {
  const radius = route.nearbyRadiusMiles || 50;
  const origins = route.nearbyOrigin ? findNearbyAirports(route.origin, radius) : [route.origin];
  const destinations = route.nearbyDestination ? findNearbyAirports(route.destination, radius) : [route.destination];
  const rawCombinations = origins.length * destinations.length;
  return {
    origins,
    destinations,
    rawCombinations,
    combinations: Math.min(rawCombinations, MAX_EXPANDED_ROUTES_PER_SAVED_ROUTE),
    truncated: rawCombinations > MAX_EXPANDED_ROUTES_PER_SAVED_ROUTE,
  };
}

export function expandSavedRoute(route) {
  const preview = nearbyPreview(route);
  const combinations = [];
  for (const origin of preview.origins) {
    for (const destination of preview.destinations) {
      if (origin === destination) continue;
      combinations.push({
        ...route,
        id: `${route.id}::${origin}-${destination}`,
        origin,
        destination,
        nearbyExpanded: origin !== route.origin || destination !== route.destination,
        expandedFrom: `${route.origin}-${route.destination}`,
      });
      if (combinations.length >= MAX_EXPANDED_ROUTES_PER_SAVED_ROUTE) break;
    }
    if (combinations.length >= MAX_EXPANDED_ROUTES_PER_SAVED_ROUTE) break;
  }
  return { routes: combinations, preview };
}

export function expandSelectedRoutes(routes) {
  const expanded = [];
  const details = [];
  let truncated = false;
  for (const route of routes) {
    const result = expandSavedRoute(route);
    details.push({ id: route.id, ...result.preview });
    for (const expandedRoute of result.routes) {
      const key = `${expandedRoute.origin}|${expandedRoute.destination}|${expandedRoute.date}|${expandedRoute.flex || 0}`;
      if (!expanded.some((existing) => existing._dedupeKey === key)) {
        expanded.push({ ...expandedRoute, _dedupeKey: key });
      }
      if (expanded.length >= MAX_EXPANDED_ROUTES_TOTAL) {
        truncated = true;
        break;
      }
    }
    if (expanded.length >= MAX_EXPANDED_ROUTES_TOTAL) break;
  }
  return {
    routes: expanded.map(({ _dedupeKey, ...route }) => route),
    details,
    truncated: truncated || details.some((detail) => detail.truncated),
  };
}

export function dedupeExpandedResults(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = [row.id, row.origin, row.destination, row.date, row.cabin, row.program].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
