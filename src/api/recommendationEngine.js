import { EMPTY_CPP_LIBRARY } from "./cppLibrary.js";
import { computeCPP } from "./flightApi.js";
import { BASE_CURRENCY, convertToUsd, normalizeCurrencyCode } from "./currency.js";

export const DEFAULT_RECOMMENDATION_PREFS = {
  preset: "balanced",
  maxStops: 1,
  layoverMinH: 1.25,
  layoverMaxH: 4,
  maxDurationH: 24,
  departStart: 6,
  departEnd: 22,
  arriveStart: 5,
  arriveEnd: 23,
  requiredAirports: "",
  preferredAirports: "HND,NRT,ICN,ZRH,MUC",
  avoidAirports: "LHR,CDG",
};

const weightsByPreset = {
  balanced: { cost: 40, duration: 20, stops: 15, layover: 10, depart: 5, arrive: 5, airports: 5 },
  lowestCost: { cost: 70, duration: 10, stops: 8, layover: 4, depart: 2, arrive: 2, airports: 4 },
  fastest: { cost: 15, duration: 55, stops: 15, layover: 8, depart: 2, arrive: 2, airports: 3 },
  convenience: { cost: 20, duration: 20, stops: 25, layover: 15, depart: 7, arrive: 7, airports: 6 },
};

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const num = (v) => Number(v);
const airportTokens = (s) => (s || "").split(/[\s,]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
const codes = (s) => new Set(airportTokens(s).filter((x) => /^[A-Z]{3}$/.test(x)));

export function isMinuteInWindow(minute, startHour, endHour) {
  if (!Number.isFinite(minute)) return false;
  const start = num(startHour) * 60;
  const end = num(endHour) * 60;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  if (start === end) return true;
  if (start < end) return minute >= start && minute <= end;
  return minute >= start || minute <= end;
}

export function validateRecommendationPrefs(prefs = DEFAULT_RECOMMENDATION_PREFS) {
  const errors = [];
  const warnings = [];
  const maxStops = num(prefs.maxStops);
  const layMin = num(prefs.layoverMinH);
  const layMax = num(prefs.layoverMaxH);
  const maxDuration = num(prefs.maxDurationH);
  const timeFields = [
    ["Departure start", prefs.departStart],
    ["Departure end", prefs.departEnd],
    ["Arrival start", prefs.arriveStart],
    ["Arrival end", prefs.arriveEnd],
  ];
  if (!Number.isInteger(maxStops) || maxStops < 0 || maxStops > 2) errors.push("Maximum stops must be 0, 1, or 2.");
  if (!Number.isFinite(layMin) || layMin < 0) errors.push("Minimum layover must be zero or greater.");
  if (!Number.isFinite(layMax) || layMax < 0) errors.push("Maximum layover must be zero or greater.");
  if (Number.isFinite(layMin) && Number.isFinite(layMax) && layMin > layMax) errors.push("Minimum layover cannot exceed maximum layover.");
  if (!Number.isFinite(maxDuration) || maxDuration <= 0) errors.push("Maximum duration must be greater than zero.");
  for (const [label, value] of timeFields) {
    const n = num(value);
    if (!Number.isFinite(n) || n < 0 || n >= 24) errors.push(`${label} must be between 0 and less than 24.`);
  }
  const allAirportTokens = [prefs.requiredAirports, prefs.preferredAirports, prefs.avoidAirports].flatMap(airportTokens);
  const invalidAirportTokens = allAirportTokens.filter((code) => !/^[A-Z]{3}$/.test(code));
  if (invalidAirportTokens.length) errors.push(`Connection airports must use 3-letter IATA codes: ${[...new Set(invalidAirportTokens)].join(", ")}.`);
  const required = codes(prefs.requiredAirports);
  const preferred = codes(prefs.preferredAirports);
  const avoid = codes(prefs.avoidAirports);
  const conflict = [...new Set([...required, ...preferred])].filter((code) => avoid.has(code));
  if (conflict.length) errors.push(`Connection airport cannot be both included/preferred and avoided: ${conflict.join(", ")}.`);
  if (num(prefs.departStart) > num(prefs.departEnd)) warnings.push("Departure window crosses midnight.");
  if (num(prefs.arriveStart) > num(prefs.arriveEnd)) warnings.push("Arrival window crosses midnight.");
  return { valid: errors.length === 0, errors, warnings };
}

export function enrichResult(r, cppLibrary = EMPTY_CPP_LIBRARY, fxRates = {}) {
  const valuation = cppLibrary?.map?.[r.program] || null;
  const referenceCpp = valuation?.cpp ?? null;
  const rawTaxes = r.taxesOriginal ?? r.taxes;
  const taxesOriginal = rawTaxes == null || rawTaxes === "" || !Number.isFinite(Number(rawTaxes)) ? null : Number(rawTaxes);
  const taxesCurrency = normalizeCurrencyCode(r.taxesCurrency) || BASE_CURRENCY;
  const fx = taxesOriginal == null
    ? { usd: null, rate: null, status: "taxes-unavailable", currency: taxesCurrency }
    : convertToUsd(taxesOriginal, taxesCurrency, fxRates);
  const taxesUsd = fx.usd;
  const pointEconomicCost = referenceCpp == null ? null : (Number(r.points || 0) * referenceCpp) / 100;
  const economicCost = pointEconomicCost == null || taxesUsd == null ? null : pointEconomicCost + taxesUsd;
  const cash = Number.isFinite(Number(r.cash)) ? Number(r.cash) : null;
  const savingsVsCash = cash == null || economicCost == null ? null : cash - economicCost;
  return {
    ...r,
    taxes: taxesOriginal,
    taxesOriginal,
    taxesCurrency,
    taxesUsd,
    fxRateToUsd: fx.rate,
    fxStatus: fx.status,
    fxRateAsOf: fx.asOf || "",
    referenceCpp,
    cppValuationSource: valuation?.source || null,
    cppValuationAsOf: valuation?.asOf || null,
    pointEconomicCost,
    economicCost,
    savingsVsCash,
    cpp: computeCPP(cash, taxesUsd, r.points),
  };
}

function confidenceFor(r) {
  if (r.demo) return "Demo";
  if (["missing-rate", "taxes-unavailable"].includes(r.fxStatus) || r.referenceCpp == null || r.totalMinutes == null || r.stops == null || r.cash == null) return "Low";
  if (r.cashSource === "live" && r.cashMatchType === "exact-itinerary") return "High";
  if (r.cashSource === "live" && ["schedule-match", "same-carrier-benchmark", "route-cabin-benchmark"].includes(r.cashMatchType)) return "Medium";
  return "Low";
}

export function recommendationExclusionReasons(r, prefs = DEFAULT_RECOMMENDATION_PREFS) {
  const reasons = [];
  const required = codes(prefs.requiredAirports);
  const avoid = codes(prefs.avoidAirports);
  const layMin = num(prefs.layoverMinH) * 60;
  const layMax = num(prefs.layoverMaxH) * 60;
  const connections = (r.connections || []).map((c) => String(c).toUpperCase());

  if (r.fxStatus === "missing-rate") reasons.push(`${r.taxesCurrency} FX rate is required`);
  if (r.fxStatus === "taxes-unavailable") reasons.push("Taxes and fees were not supplied");
  if (r.stops != null && r.stops > num(prefs.maxStops)) reasons.push(`Exceeds maximum stops (${prefs.maxStops})`);
  if (r.totalMinutes != null && r.totalMinutes > num(prefs.maxDurationH) * 60) reasons.push(`Exceeds maximum travel time (${prefs.maxDurationH}h)`);
  if (r.departMin != null && !isMinuteInWindow(r.departMin, prefs.departStart, prefs.departEnd)) reasons.push("Departure is outside the selected window");
  if (r.arriveMin != null && !isMinuteInWindow(r.arriveMin, prefs.arriveStart, prefs.arriveEnd)) reasons.push("Arrival is outside the selected window");
  const avoided = connections.filter((c) => avoid.has(c));
  if (avoided.length) reasons.push(`Uses excluded connection airport${avoided.length > 1 ? "s" : ""}: ${[...new Set(avoided)].join(", ")}`);
  if (required.size && !connections.some((c) => required.has(c))) reasons.push(`Does not use a required connection: ${[...required].join(", ")}`);
  const outsideLayovers = (r.layovers || []).filter((m) => m < layMin || m > layMax);
  if (outsideLayovers.length) reasons.push("At least one layover is outside the preferred range");
  return reasons;
}

function scorePool(pool, prefs, preferred, avoid) {
  const layMin = num(prefs.layoverMinH) * 60;
  const layMax = num(prefs.layoverMaxH) * 60;
  const costs = pool.map((r) => r.economicCost).filter(Number.isFinite);
  const durations = pool.map((r) => r.totalMinutes).filter(Number.isFinite);
  const minCost = costs.length ? Math.min(...costs) : 0;
  const maxCost = costs.length ? Math.max(...costs) : 1;
  const minDur = durations.length ? Math.min(...durations) : 0;
  const maxDur = durations.length ? Math.max(...durations) : 1;
  const w = weightsByPreset[prefs.preset] || weightsByPreset.balanced;

  return pool.map((r) => {
    const costScore = r.economicCost == null ? 0.15 : 1 - ((r.economicCost - minCost) / Math.max(1, maxCost - minCost));
    const durationScore = r.totalMinutes == null ? 0.45 : 1 - ((r.totalMinutes - minDur) / Math.max(1, maxDur - minDur));
    const stopsScore = r.stops == null ? 0.45 : r.stops === 0 ? 1 : r.stops === 1 ? 0.65 : 0.2;
    const layoverScore = !r.layovers?.length
      ? (r.stops === 0 ? 1 : 0.45)
      : r.layovers.reduce((sum, m) => {
          if (m >= layMin && m <= layMax) return sum + 1;
          return sum + clamp(1 - Math.min(Math.abs(m - layMin), Math.abs(m - layMax)) / 360);
        }, 0) / r.layovers.length;
    const depScore = r.departMin == null ? 0.5 : (isMinuteInWindow(r.departMin, prefs.departStart, prefs.departEnd) ? 1 : 0);
    const arrScore = r.arriveMin == null ? 0.5 : (isMinuteInWindow(r.arriveMin, prefs.arriveStart, prefs.arriveEnd) ? 1 : 0);
    let airportScore = 0.7;
    if (r.connections?.some((c) => avoid.has(String(c).toUpperCase()))) airportScore = 0;
    else if (r.connections?.some((c) => preferred.has(String(c).toUpperCase()))) airportScore = 1;
    else if (!r.connections?.length) airportScore = 0.95;

    const total = costScore * w.cost + durationScore * w.duration + stopsScore * w.stops + layoverScore * w.layover + depScore * w.depart + arrScore * w.arrive + airportScore * w.airports;
    const reasons = [];
    if (r.fxStatus === "missing-rate") reasons.push(`Enter ${r.taxesCurrency} FX rate to calculate CPP and economic cost`);
    else if (r.fxStatus === "taxes-unavailable") reasons.push("Taxes and fees were not supplied, so CPP and economic cost are unavailable");
    else if (costScore >= 0.9) reasons.push("Among the lowest economic redemption costs");
    if (r.stops === 0) reasons.push("Nonstop itinerary");
    else if (r.stops === 1) reasons.push("Only one connection");
    if (layoverScore >= 0.9 && r.layovers?.length) reasons.push("Every layover is within your preferred range");
    if (depScore === 1) reasons.push("Departure fits your time window");
    if (arrScore === 1) reasons.push("Arrival fits your time window");
    if (airportScore === 1) reasons.push("Uses a preferred connection airport");
    if (r.cashMatchType === "exact-itinerary") reasons.push("Cash fare matched to the same flight numbers");
    else if (r.cashMatchType === "same-carrier-benchmark") reasons.push("Cash benchmark uses the same operating airline");

    return {
      ...r,
      recommendationScore: Math.round(total),
      recommendationReasons: reasons.slice(0, 4),
      confidence: confidenceFor(r),
      eligible: recommendationExclusionReasons(r, prefs).length === 0,
    };
  }).sort((a, b) => b.recommendationScore - a.recommendationScore);
}

export function scoreResults(results, prefs = DEFAULT_RECOMMENDATION_PREFS, cppLibrary = EMPTY_CPP_LIBRARY, fxRates = {}) {
  const validation = validateRecommendationPrefs(prefs);
  if (!validation.valid) return { scored: [], excluded: [], validation, usedFallback: false, eligibleCount: 0 };

  const enriched = results.map((r) => enrichResult(r, cppLibrary, fxRates));
  const preferred = codes(prefs.preferredAirports);
  const avoid = codes(prefs.avoidAirports);
  const eligible = enriched.filter((r) => recommendationExclusionReasons(r, prefs).length === 0);
  const excluded = enriched
    .filter((r) => recommendationExclusionReasons(r, prefs).length > 0)
    .map((r) => ({
      ...r,
      recommendationScore: null,
      recommendationReasons: [],
      exclusionReasons: recommendationExclusionReasons(r, prefs),
      confidence: confidenceFor(r),
      eligible: false,
    }));

  const pool = eligible.length ? eligible : enriched;
  const scored = scorePool(pool, prefs, preferred, avoid);
  return {
    scored,
    excluded: eligible.length ? excluded : [],
    validation,
    usedFallback: scored.length > 0 && eligible.length === 0,
    eligibleCount: eligible.length,
  };
}

export function buildRecommendations(results, prefs, cppLibrary = EMPTY_CPP_LIBRARY, fxRates = {}) {
  const scoredResult = scoreResults(results, prefs, cppLibrary, fxRates);
  const { scored, excluded, validation, usedFallback, eligibleCount } = scoredResult;
  if (!validation.valid || !scored.length) return { scored, cards: [], other: [], notRecommended: excluded || [], validation, usedFallback, eligibleCount };
  const complete = scored.filter((r) => r.economicCost != null && r.cpp != null);
  const categoryPool = complete.length ? complete : scored;
  const lowest = [...categoryPool].filter((r) => r.economicCost != null).sort((a, b) => a.economicCost - b.economicCost)[0];
  const bestValue = [...categoryPool].filter((r) => r.cpp != null).sort((a, b) => b.cpp - a.cpp)[0];
  const fastest = [...categoryPool].filter((r) => r.totalMinutes != null).sort((a, b) => a.totalMinutes - b.totalMinutes)[0];
  const nonstop = categoryPool.find((r) => r.stops === 0);
  const cards = [
    ["Best overall", categoryPool[0]],
    ["Lowest economic cost", lowest],
    ["Best realized CPP", bestValue],
    ["Fastest acceptable", fastest],
    ["Best nonstop", nonstop],
  ].filter(([, r]) => r);
  const featuredIds = new Set(cards.map(([, r]) => r.id));
  const other = scored.filter((r) => !featuredIds.has(r.id)).slice(0, 5);
  const notRecommended = (excluded || []).slice(0, 5);
  return { scored, cards, other, notRecommended, validation, usedFallback, eligibleCount };
}

export function groupRecommendationResults(results, prefs, cppLibrary = EMPTY_CPP_LIBRARY, fxRates = {}) {
  const map = new Map();
  for (const r of results) {
    const key = `${r.origin}→${r.destination} · ${r.date} · ${r.cabin}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return [...map.entries()].map(([key, rows]) => [key, buildRecommendations(rows, prefs, cppLibrary, fxRates)]);
}
