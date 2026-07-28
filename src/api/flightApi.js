// ═══════════════════════════════════════════════════════════════════
// flightApi.js — live search, cash-fare provenance, shared math,
// filtering, and strict live-only cash-fare handling.
// ═══════════════════════════════════════════════════════════════════
import { PROGRAMS } from "../data/defaults.js";
import { BASE_CURRENCY, detectTaxCurrency } from "./currency.js";

// CPP = ((Cash Fare − Taxes and Fees) / Points) × 100
export function computeCPP(cashFare, taxesUsd, points) {
  if (!points || points <= 0 || cashFare == null || taxesUsd == null || !Number.isFinite(Number(cashFare)) || !Number.isFinite(Number(taxesUsd))) return null;
  return ((Number(cashFare) - Number(taxesUsd)) / Number(points)) * 100;
}

export function normalizeTaxesFromMinorUnits(value) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) / 100 : null;
}

const ZERO_SEAT_MEANS_UNKNOWN = new Set(["american", "turkish"]);
export function normalizeSeatCount(value, programId = "") {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  if (numeric === 0 && ZERO_SEAT_MEANS_UNKNOWN.has(programId)) return null;
  return numeric;
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function parseCarriers(str) {
  const seen = new Set();
  return (str || "")
    .split(/[\s,/|]+/)
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z0-9]{2}$/.test(c) && !seen.has(c) && seen.add(c));
}

const VALID_CABINS = new Set(["economy", "premium", "business", "first"]);
const pad = (n) => String(n).padStart(2, "0");
const toHHMM = (min) => `${pad(Math.floor((min % 1440) / 60))}:${pad(min % 60)}`;
const toMinute = (t) => (t && /^\d{2}:\d{2}$/.test(t) ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null);

async function fetchJson(url, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function parseISOToMin(iso) {
  const m = /T(\d{2}):(\d{2})/.exec(iso || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function normalizeFlightNumbers(value) {
  const raw = Array.isArray(value) ? value.join(" ") : String(value || "");
  return [...raw.toUpperCase().matchAll(/\b([A-Z0-9]{2})\s*[- ]?\s*(\d{1,4})\b/g)].map((m) => `${m[1]}${m[2]}`);
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function minuteDiff(a, b) {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
}

function sameSequence(a = [], b = []) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function carrierOverlap(a = [], b = []) {
  const left = new Set(a.map((x) => String(x).toUpperCase()));
  return b.some((x) => left.has(String(x).toUpperCase()));
}

function providerUpdatedAt(trip = {}, availability = {}) {
  return trip.UpdatedAt || trip.LastUpdatedAt || trip.LastSeenAt || availability.UpdatedAt || availability.LastUpdatedAt || availability.LastSeenAt || null;
}

export function selectCashFareForTrip(trip, dataset) {
  if (!dataset) return { price: null, currency: BASE_CURRENCY, source: "unavailable", matchType: "unavailable" };
  if (dataset.source !== "live") {
    return { price: null, currency: dataset.currency || BASE_CURRENCY, source: "unavailable", matchType: "unavailable" };
  }
  const source = "live";
  const currency = dataset.currency || BASE_CURRENCY;
  const flights = Array.isArray(dataset.flights) ? dataset.flights : [];
  const awardNumbers = normalizeFlightNumbers(trip.flightNumbers);
  const awardCarriers = (trip.carriers || []).map((c) => String(c).toUpperCase());

  if (source === "live" && awardNumbers.length) {
    const exact = flights.find((f) => sameSequence(awardNumbers, normalizeFlightNumbers(f.flightNumbers)));
    if (exact) {
      return { price: exact.price, currency: exact.currency || currency, source: "live", matchType: "exact-itinerary", matchedFlightId: exact.id || null };
    }
  }

  if (source === "live" && Number.isFinite(trip.departMin) && Number.isFinite(trip.arriveMin)) {
    const candidates = flights
      .map((f) => {
        const departMin = Number.isFinite(f.departMin) ? f.departMin : toMinute(f.departTime);
        const arriveMin = Number.isFinite(f.arriveMin) ? f.arriveMin : toMinute(f.arriveTime);
        if (!Number.isFinite(departMin) || !Number.isFinite(arriveMin)) return null;
        if (trip.stops != null && f.stops != null && trip.stops !== f.stops) return null;
        const cashConnections = (f.connections || []).map((c) => String(c).toUpperCase());
        const awardConnections = (trip.connections || []).map((c) => String(c).toUpperCase());
        if (awardConnections.length && !sameSequence(awardConnections, cashConnections)) return null;
        const cashCarriers = (f.carrierCodes || []).map((c) => String(c).toUpperCase());
        if (awardCarriers.length && cashCarriers.length && !carrierOverlap(awardCarriers, cashCarriers)) return null;
        const depDiff = minuteDiff(trip.departMin, departMin);
        const arrDiff = minuteDiff(trip.arriveMin, arriveMin);
        const durationDiff = Number.isFinite(trip.totalMinutes) && Number.isFinite(f.totalMinutes) ? Math.abs(trip.totalMinutes - f.totalMinutes) : 0;
        if (depDiff > 20 || arrDiff > 20 || durationDiff > 45) return null;
        return { f, score: depDiff + arrDiff + durationDiff };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score);
    if (candidates[0]) {
      return { price: candidates[0].f.price, currency: candidates[0].f.currency || currency, source: "live", matchType: "schedule-match", matchedFlightId: candidates[0].f.id || null };
    }
  }

  if (source === "live" && awardCarriers.length) {
    const sameCarrierPrices = flights
      .filter((f) => carrierOverlap(awardCarriers, f.carrierCodes || []))
      .map((f) => f.price)
      .filter(Number.isFinite);
    const sameCarrierPrice = median(sameCarrierPrices);
    if (Number.isFinite(sameCarrierPrice)) {
      return { price: sameCarrierPrice, currency, source: "live", matchType: "same-carrier-benchmark", benchmarkMethod: "median" };
    }
  }

  return {
    price: dataset.benchmarkPrice,
    currency,
    source,
    matchType: "route-cabin-benchmark",
    benchmarkMethod: dataset.benchmarkMethod || "median",
  };
}

export async function getCashFareDataset(proxyBase, origin, destination, date, cabin) {
  try {
    const url = `${proxyBase}/api/cashfare?origin=${origin}&destination=${destination}&date=${date}&cabin=${cabin}&list=1`;
    const data = await fetchJson(url, 20000);
    const currency = data.currency || BASE_CURRENCY;
    const flights = (data.flights || []).map((f) => ({
      ...f,
      currency: f.currency || currency,
      departMin: Number.isFinite(f.departMin) ? f.departMin : toMinute(f.departTime),
      arriveMin: Number.isFinite(f.arriveMin) ? f.arriveMin : toMinute(f.arriveTime),
      layovers: Array.isArray(f.layovers) ? f.layovers : [],
      flightNumbers: Array.isArray(f.flightNumbers) ? f.flightNumbers : [],
    }));
    const live = data.source === "serpapi";
    const benchmarkPrice = Number.isFinite(data.benchmarkPrice) ? data.benchmarkPrice : median(flights.map((f) => f.price));
    if (live && Number.isFinite(benchmarkPrice)) {
      return {
        source: "live",
        currency,
        benchmarkPrice,
        benchmarkMethod: data.benchmarkMethod || "median",
        scope: data.scope || "route-date-cabin",
        flights,
      };
    }
  } catch {
    // Live mode must not create a synthetic cash fare.
  }
  return { source: "unavailable", currency: BASE_CURRENCY, benchmarkPrice: null, benchmarkMethod: null, scope: "route-date-cabin", flights: [] };
}

function normalizeTrip(trip, availability, prog, cashByKey) {
  const cabin = (trip.Cabin || "").toLowerCase();
  if (!VALID_CABINS.has(cabin)) return null;
  const segs = trip.AvailabilitySegments || [];
  const connections = segs.slice(0, -1).map((s) => s.DestinationAirport).filter(Boolean);
  const layovers = [];
  for (let i = 0; i < segs.length - 1; i++) {
    const arr = Date.parse(segs[i].ArrivesAt);
    const dep = Date.parse(segs[i + 1].DepartsAt);
    if (!Number.isNaN(arr) && !Number.isNaN(dep)) layovers.push(Math.max(0, Math.round((dep - arr) / 60000)));
  }
  const departMin = parseISOToMin(trip.DepartsAt);
  const arriveMin = parseISOToMin(trip.ArrivesAt);
  const taxes = normalizeTaxesFromMinorUnits(trip.TotalTaxes);
  const taxCurrency = detectTaxCurrency(trip, availability, cabin);
  const points = trip.MileageCost ?? 0;
  const stops = trip.Stops ?? connections.length;
  const totalMinutes = trip.TotalDuration ?? null;
  const flightNumbers = trip.FlightNumbers || "";
  const cashSelection = selectCashFareForTrip(
    { departMin, arriveMin, stops, connections, totalMinutes, flightNumbers, carriers: parseCarriers(trip.Carriers) },
    cashByKey[`${cabin}|${availability.Date}`] || null
  );
  const cash = cashSelection.price;

  return {
    id: trip.ID || `${availability.ID}-${flightNumbers || Math.random()}`,
    program: prog.id,
    programLabel: prog.label,
    source: prog.source,
    origin: availability.Route?.OriginAirport,
    destination: availability.Route?.DestinationAirport,
    date: availability.Date,
    cabin,
    points,
    taxes,
    taxesOriginal: taxes,
    taxesCurrency: taxCurrency.code,
    taxesCurrencySource: taxCurrency.source,
    taxesUsd: taxes != null && taxCurrency.code === BASE_CURRENCY ? taxes : null,
    cash,
    cashCurrency: cashSelection.currency || BASE_CURRENCY,
    cashSource: cashSelection.source,
    cashMatchType: cashSelection.matchType,
    cashBenchmarkMethod: cashSelection.benchmarkMethod || null,
    cashMatchedFlightId: cashSelection.matchedFlightId || null,
    carriers: parseCarriers(trip.Carriers),
    departMin,
    arriveMin,
    departTime: departMin == null ? "—" : toHHMM(departMin),
    arriveTime: arriveMin == null ? "—" : toHHMM(arriveMin),
    arrivesNextDay: Number.isFinite(Date.parse(trip.ArrivesAt)) && Number.isFinite(Date.parse(trip.DepartsAt))
      ? Date.parse(trip.ArrivesAt) - Date.parse(trip.DepartsAt) + (departMin || 0) * 60000 >= 86400000
      : false,
    stops,
    connections,
    layovers,
    totalMinutes,
    seats: normalizeSeatCount(trip.RemainingSeats, prog.id),
    flightNumbers,
    availabilityUpdatedAt: providerUpdatedAt(trip, availability),
    cpp: computeCPP(cash, taxes != null && taxCurrency.code === BASE_CURRENCY ? taxes : null, points),
  };
}

async function mapWithConcurrency(items, limit, fn) {
  const out = [];
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i]).catch(() => null);
    }
  });
  await Promise.all(workers);
  return out;
}

export function cashRowsFromDatasets(cashByKey, origin, destination) {
  return Object.entries(cashByKey || {}).flatMap(([key, dataset]) => {
    if (!dataset || dataset.source !== "live") return [];
    const [cabin, searchDate] = key.split("|");
    return (dataset.flights || []).map((flight, index) => ({
      ...flight,
      id: `${origin}-${destination}-${searchDate}-${cabin}-${flight.id || index}`,
      origin,
      destination,
      searchDate,
      cabin,
      source: "live",
      currency: flight.currency || dataset.currency || BASE_CURRENCY,
      layovers: Array.isArray(flight.layovers) ? flight.layovers : [],
      departMin: Number.isFinite(flight.departMin) ? flight.departMin : toMinute(flight.departTime),
      arriveMin: Number.isFinite(flight.arriveMin) ? flight.arriveMin : toMinute(flight.arriveTime),
    }));
  }).sort((left, right) => left.price - right.price || String(left.searchDate).localeCompare(String(right.searchDate)));
}

async function searchAwardsLiveBundle({ proxyBase, origin, destination, date, programIds, flex = 0 }) {
  const base = (proxyBase || "").replace(/\/$/, "");
  const sources = PROGRAMS.filter((p) => programIds.includes(p.id)).map((p) => p.source).join(",");
  const startDate = flex > 0 ? addDays(date, -flex) : date;
  const endDate = flex > 0 ? addDays(date, flex) : date;
  const searchUrl = `${base}/api/search?origin_airport=${origin}&destination_airport=${destination}&start_date=${startDate}&end_date=${endDate}&sources=${sources}&take=500`;
  const search = await fetchJson(searchUrl);
  const avail = (search.data || []).filter((a) => PROGRAMS.some((p) => p.source === a.Source && programIds.includes(p.id)));

  const CASH_FETCH_CAP = 12;
  const pairs = new Set();
  for (const a of avail) {
    if (a.YAvailable) pairs.add(`economy|${a.Date}`);
    if (a.WAvailable) pairs.add(`premium|${a.Date}`);
    if (a.JAvailable) pairs.add(`business|${a.Date}`);
    if (a.FAvailable) pairs.add(`first|${a.Date}`);
  }
  const pairList = [...pairs];
  const cashByKey = {};
  await Promise.all(pairList.slice(0, CASH_FETCH_CAP).map(async (key) => {
    const [cabin, d] = key.split("|");
    cashByKey[key] = await getCashFareDataset(base, origin, destination, d, cabin);
  }));
  for (const key of pairList.slice(CASH_FETCH_CAP)) {
    cashByKey[key] = { source: "unavailable", currency: BASE_CURRENCY, benchmarkPrice: null, benchmarkMethod: "cash-fetch-cap", scope: "route-date-cabin", flights: [] };
  }

  const detailTargets = avail.slice(0, 15);
  const tripSets = await mapWithConcurrency(detailTargets, 3, (a) => fetchJson(`${base}/api/search?trips=${encodeURIComponent(a.ID)}`));
  const results = [];
  detailTargets.forEach((a, i) => {
    const prog = PROGRAMS.find((p) => p.source === a.Source);
    if (!prog) return;
    for (const trip of tripSets[i]?.data || []) {
      const normalized = normalizeTrip(trip, a, prog, cashByKey);
      if (normalized) results.push(normalized);
    }
  });

  if (results.length === 0 && avail.length > 0) {
    for (const a of avail) {
      const prog = PROGRAMS.find((p) => p.source === a.Source);
      if (!prog) continue;
      const rows = [
        ["economy", a.YAvailable, a.YMileageCost, a.YTotalTaxes, a.YDirect, a.YRemainingSeats],
        ["premium", a.WAvailable, a.WMileageCost, a.WTotalTaxes, a.WDirect, a.WRemainingSeats],
        ["business", a.JAvailable, a.JMileageCost, a.JTotalTaxes, a.JDirect, a.JRemainingSeats],
        ["first", a.FAvailable, a.FMileageCost, a.FTotalTaxes, a.FDirect, a.FRemainingSeats],
      ];
      for (const [cabin, ok, cost, tax, direct, remainingSeats] of rows) {
        if (!ok) continue;
        const points = Number(cost) || 0;
        const taxes = normalizeTaxesFromMinorUnits(tax);
        const taxCurrency = detectTaxCurrency({}, a, cabin);
        const dataset = cashByKey[`${cabin}|${a.Date}`] || null;
        const cashSelection = selectCashFareForTrip({}, dataset);
        const cash = cashSelection.price;
        results.push({
          id: `${a.ID}-${cabin}`,
          program: prog.id,
          programLabel: prog.label,
          source: prog.source,
          origin,
          destination,
          date: a.Date,
          cabin,
          points,
          taxes,
          taxesOriginal: taxes,
          taxesCurrency: taxCurrency.code,
          taxesCurrencySource: taxCurrency.source,
          taxesUsd: taxes != null && taxCurrency.code === BASE_CURRENCY ? taxes : null,
          cash,
          cashCurrency: cashSelection.currency || BASE_CURRENCY,
          cashSource: cashSelection.source,
          cashMatchType: cashSelection.matchType,
          cashBenchmarkMethod: cashSelection.benchmarkMethod || null,
          carriers: [],
          departMin: null,
          arriveMin: null,
          departTime: "—",
          arriveTime: "—",
          arrivesNextDay: false,
          stops: direct ? 0 : null,
          connections: [],
          layovers: [],
          totalMinutes: null,
          seats: normalizeSeatCount(remainingSeats, prog.id),
          flightNumbers: "",
          availabilityUpdatedAt: providerUpdatedAt({}, a),
          cpp: computeCPP(cash, taxes != null && taxCurrency.code === BASE_CURRENCY ? taxes : null, points),
        });
      }
    }
  }
  return {
    awards: results,
    cashFares: cashRowsFromDatasets(cashByKey, origin, destination),
  };
}

export async function searchAwardsLive(args) {
  const bundle = await searchAwardsLiveBundle(args);
  return bundle.awards;
}

export async function searchAwardsWithCash(args) {
  return searchAwardsLiveBundle(args);
}

export async function searchAwards({ proxyBase = "", origin, destination, date, programIds, flex = 0 }) {
  return searchAwardsLive({ proxyBase, origin, destination, date, programIds, flex });
}

export function cashSearchDates(date, flex = 0) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return [];
  const center = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const radius = [0, 1, 3, 7].includes(Number(flex)) ? Number(flex) : 0;
  return Array.from({ length: radius * 2 + 1 }, (_, index) => {
    const value = new Date(center);
    value.setUTCDate(center.getUTCDate() + index - radius);
    return value.toISOString().slice(0, 10);
  });
}

async function mapCashQueriesWithConcurrency(items, limit, fn) {
  const output = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      output[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return output;
}

export async function searchCashFares({ proxyBase = "", origin, destination, date, flex = 0, cabins }) {
  const base = (proxyBase || "").replace(/\/$/, "");
  const dates = cashSearchDates(date, flex);
  const queries = dates.flatMap((searchDate) => cabins.map((cabin) => ({ searchDate, cabin })));
  const perQuery = await mapCashQueriesWithConcurrency(queries, 4, async ({ searchDate, cabin }) => {
    try {
      const data = await fetchJson(`${base}/api/cashfare?origin=${origin}&destination=${destination}&date=${searchDate}&cabin=${cabin}&list=1`, 20000);
      if (data.source !== "serpapi") return [];
      const currency = data.currency || BASE_CURRENCY;
      return (data.flights || []).map((f, i) => ({
        ...f,
        currency: f.currency || currency,
        id: `${origin}-${destination}-${searchDate}-${cabin}-${f.id || i}`,
        origin,
        destination,
        searchDate,
        cabin,
        source: "live",
        layovers: Array.isArray(f.layovers) ? f.layovers : [],
        departMin: toMinute(f.departTime),
        arriveMin: toMinute(f.arriveTime),
      }));
    } catch {
      return [];
    }
  });
  return perQuery.flat().sort((a, b) => a.price - b.price || String(a.searchDate).localeCompare(String(b.searchDate)));
}

// ── Cash Fares tab filters ──────────────────────────────────────────
export const CASH_FILTERS = {
  airlines: [],        // exact airline names as returned by the API
  stops: "any",        // cumulative caps, same semantics as rewards
  connections: "",     // comma-separated IATA codes
  totalMinH: "", totalMaxH: "",
  layoverMinH: "", layoverMaxH: "",
  depWindow: [0, 24], arrWindow: [0, 24],
};

export function filterCashRowsByCabins(rows, selectedCabins) {
  const selected = new Set(Array.isArray(selectedCabins) ? selectedCabins : []);
  return (Array.isArray(rows) ? rows : []).filter((row) => selected.has(row.cabin));
}

export function applyCashFilters(rows, f) {
  const conn = (f.connections || "")
    .split(/[\s,]+/).map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{3}$/.test(c));
  return rows.filter((r) => {
    if (f.airlines.length && !r.carriers?.some((c) => f.airlines.includes(c))) return false;
    if (f.stops !== "any") {
      if (r.stops == null) return false;
      if (f.stops === "0" && r.stops !== 0) return false;
      if (f.stops === "1" && r.stops > 1) return false;
    }
    if (conn.length) {
      if (!r.connections?.some((c) => conn.includes(c))) return false;
    }
    if (f.totalMinH !== "" && (r.totalMinutes == null || r.totalMinutes < Number(f.totalMinH) * 60)) return false;
    if (f.totalMaxH !== "" && (r.totalMinutes == null || r.totalMinutes > Number(f.totalMaxH) * 60)) return false;
    if (f.layoverMinH !== "" && (!r.layovers?.length || Math.min(...r.layovers) < Number(f.layoverMinH) * 60)) return false;
    if (f.layoverMaxH !== "" && (!r.layovers?.length || Math.max(...r.layovers) > Number(f.layoverMaxH) * 60)) return false;
    const [d1, d2] = f.depWindow, [a1, a2] = f.arrWindow;
    if (d1 > 0 || d2 < 24) {
      if (r.departMin == null || r.departMin < d1 * 60 || r.departMin > d2 * 60) return false;
    }
    if (a1 > 0 || a2 < 24) {
      if (r.arriveMin == null || r.arriveMin < a1 * 60 || r.arriveMin > a2 * 60) return false;
    }
    return true;
  });
}

// ── Data-integrity guard ────────────────────────────────────────────
// The live pipeline never produces demo rows; this exists so that IF
// any row were ever flagged (r.demo === true), the UI raises a
// flashing red warning instead of silently blending it in.
export function hasDemoData(results) {
  return Array.isArray(results) && results.some((r) => r && r.demo === true);
}

// ── Shared filtering (used by FilterSidebar → FlightResults) ───────
export const DEFAULT_FILTERS = {
  programs: PROGRAMS.map((p) => p.id),
  cabins: ["economy", "premium", "business", "first"],
  depWindow: [0, 24],
  arrWindow: [0, 24],
  stops: "any", // 'any' | '0' | '1' | '2+'
  connectionInclude: "", // comma-separated IATA codes; any match qualifies
  connectionExclude: "", // any match disqualifies
  layoverMinH: "",
  layoverMaxH: "",
  totalMinH: "",
  totalMaxH: "",
  pax: 1, // passengers: hide options with fewer known award seats than this
  sort: "cpp",
};

export function applyFilters(results, f) {
  const parseCodes = (value) => String(value || "")
    .split(/[,\s]+/)
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{3}$/.test(c));
  const includeCodes = parseCodes(f.connectionInclude || f.connections);
  const excludeCodes = parseCodes(f.connectionExclude);

  const inWindow = (min, [lo, hi]) => {
    if (min == null) return true; // day-level rows lack times; keep them
    const h = min / 60;
    if (lo === 0 && hi === 24) return true;
    if (lo === hi) return true;
    if (lo < hi) return h >= lo && h <= hi;
    return h >= lo || h <= hi;
  };

  const pax = Math.max(1, Number(f.pax) || 1);
  const out = results.filter((r) => {
    // Passenger count: exclude when we KNOW there are too few seats.
    // Rows with unknown seat counts stay visible, labeled as unknown.
    if (r.seats != null && r.seats < pax) return false;
    if (!f.programs.includes(r.program)) return false;
    if (!f.cabins.includes(r.cabin)) return false;
    if (!inWindow(r.departMin, f.depWindow)) return false;
    if (!inWindow(r.arriveMin, f.arrWindow)) return false;

    // Stops are CUMULATIVE maximums: "0" = nonstop only; "1" = up to
    // 1 stop (includes direct); "2+" = everything (direct, 1 stop, 2+).
    if (f.stops !== "any") {
      if (r.stops == null) return false; // unknown detail can't satisfy a stop cap
      if (f.stops === "0" && r.stops !== 0) return false;
      if (f.stops === "1" && r.stops > 1) return false;
      // "2+" imposes no numeric cap — it admits every known stop count.
    }

    const rowConnections = (r.connections || []).map((c) => String(c).toUpperCase());
    if (excludeCodes.length && rowConnections.some((c) => excludeCodes.includes(c))) return false;
    if (includeCodes.length && !rowConnections.some((c) => includeCodes.includes(c))) return false;

    if (f.layoverMinH !== "" && r.layovers.length > 0) {
      if (Math.min(...r.layovers) < Number(f.layoverMinH) * 60) return false;
    }
    if (f.layoverMaxH !== "" && r.layovers.length > 0) {
      if (Math.max(...r.layovers) > Number(f.layoverMaxH) * 60) return false;
    }

    if (f.totalMinH !== "" && r.totalMinutes != null) {
      if (r.totalMinutes < Number(f.totalMinH) * 60) return false;
    }
    if (f.totalMaxH !== "" && r.totalMinutes != null) {
      if (r.totalMinutes > Number(f.totalMaxH) * 60) return false;
    }
    return true;
  });

  const layoverSum = (r) =>
    r.stops == null ? 1e9 : r.layovers.reduce((x, y) => x + y, 0);
  const sorters = {
    cpp: (a, b) => (b.cpp ?? -1) - (a.cpp ?? -1),
    points: (a, b) => a.points - b.points,
    duration: (a, b) => (a.totalMinutes ?? 1e9) - (b.totalMinutes ?? 1e9),
    stops: (a, b) => (a.stops ?? 99) - (b.stops ?? 99),
    layover: (a, b) => layoverSum(a) - layoverSum(b),
    taxes: (a, b) => (a.taxesUsd ?? a.taxes ?? 1e9) - (b.taxesUsd ?? b.taxes ?? 1e9),
    depart: (a, b) => (a.departMin ?? 1e9) - (b.departMin ?? 1e9),
    economicCost: (a, b) => (a.economicCost ?? 1e9) - (b.economicCost ?? 1e9),
  };
  return out.sort(sorters[f.sort] || sorters.cpp);
}

export function formatDuration(min) {
  if (min == null) return "—";
  return `${Math.floor(min / 60)}h ${pad(min % 60)}m`;
}
