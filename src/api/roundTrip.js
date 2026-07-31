import { addDays, computeCPP, normalizeFlightNumbers, searchAwardsOnly } from "./flightApi.js";
import { BASE_CURRENCY } from "./currency.js";

const VALID_FLEX = new Set([0, 1, 3]);
const VALID_CABINS = new Set(["economy", "premium", "business", "first"]);

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function minuteDiff(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
  const delta = Math.abs(a - b);
  return Math.min(delta, 1440 - delta);
}

function sameSequence(left = [], right = []) {
  const a = normalizeFlightNumbers(left);
  const b = normalizeFlightNumbers(right);
  return a.length > 0 && a.length === b.length && a.every((value, index) => value === b[index]);
}

function carrierOverlap(left = [], right = []) {
  const values = new Set(left.map((value) => String(value).toUpperCase()));
  return right.some((value) => values.has(String(value).toUpperCase()));
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function roundTripDatePairs(departDate, returnDate, flex = 0) {
  if (!isIsoDate(departDate) || !isIsoDate(returnDate)) return [];
  if (Date.parse(`${returnDate}T00:00:00Z`) <= Date.parse(`${departDate}T00:00:00Z`)) return [];
  const radius = VALID_FLEX.has(Number(flex)) ? Number(flex) : 0;
  return Array.from({ length: radius * 2 + 1 }, (_, index) => {
    const shift = index - radius;
    return {
      shift,
      outboundDate: addDays(departDate, shift),
      returnDate: addDays(returnDate, shift),
      key: `${addDays(departDate, shift)}|${addDays(returnDate, shift)}`,
    };
  });
}

export async function searchRoundTripAwardScenario({ proxyBase = "", origin, destination, outboundDate, returnDate, programIds }) {
  const [outboundBundle, returnBundle] = await Promise.all([
    searchAwardsOnly({ proxyBase, origin, destination, date: outboundDate, programIds, flex: 0 }),
    searchAwardsOnly({ proxyBase, origin: destination, destination: origin, date: returnDate, programIds, flex: 0 }),
  ]);
  return {
    outbound: outboundBundle.awards || [],
    return: returnBundle.awards || [],
  };
}

async function fetchJson(url, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}${body ? `: ${body.slice(0, 180)}` : ""}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function searchRoundTripCashFares({ proxyBase = "", origin, destination, departDate, returnDate, flex = 0, cabin = "economy", adults = 1 }) {
  if (!VALID_CABINS.has(cabin)) throw new Error("Round-trip cash fare requires one valid cabin.");
  const base = (proxyBase || "").replace(/\/$/, "");
  const pairs = roundTripDatePairs(departDate, returnDate, flex);
  const output = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(2, pairs.length) }, async () => {
    while (index < pairs.length) {
      const pair = pairs[index++];
      try {
        const params = new URLSearchParams({
          origin,
          destination,
          date: pair.outboundDate,
          returnDate: pair.returnDate,
          tripType: "roundtrip",
          cabin,
          adults: String(Math.max(1, Math.min(9, Number(adults) || 1))),
          list: "1",
        });
        const data = await fetchJson(`${base}/api/cashfare?${params}`, 90000);
        if (data.source !== "serpapi") continue;
        for (const [rowIndex, row] of (data.flights || []).entries()) {
          output.push({
            ...row,
            id: `${origin}-${destination}-${pair.outboundDate}-${pair.returnDate}-${cabin}-${row.id || rowIndex}`,
            origin,
            destination,
            searchDate: pair.outboundDate,
            returnDate: pair.returnDate,
            datePairKey: pair.key,
            shift: pair.shift,
            cabin,
            source: "live",
            currency: row.currency || data.currency || BASE_CURRENCY,
            tripType: "roundtrip",
            providerRequests: data.providerRequests || row.providerRequests || null,
          });
        }
      } catch {
        // Preserve partial round-trip results from other shifted date pairs.
      }
    }
  });
  await Promise.all(workers);
  return output.sort((a, b) => a.price - b.price || String(a.searchDate).localeCompare(String(b.searchDate)));
}

function selectRoundTripCash(outbound, inbound, cashRows) {
  const candidates = (cashRows || []).filter((row) => row.cabin === outbound.cabin && row.datePairKey === `${outbound.date}|${inbound.date}`);
  if (!candidates.length) return { price: null, currency: BASE_CURRENCY, matchType: "unavailable", row: null };

  const exact = candidates.find((row) =>
    sameSequence(outbound.flightNumbers, row.outboundFlightNumbers) &&
    sameSequence(inbound.flightNumbers, row.returnFlightNumbers)
  );
  if (exact) return { price: exact.price, currency: exact.currency || BASE_CURRENCY, matchType: "exact-round-trip-itinerary", row: exact };

  const schedule = candidates
    .map((row) => {
      const out = row.outbound || {};
      const ret = row.return || {};
      if (out.stops != null && outbound.stops != null && out.stops !== outbound.stops) return null;
      if (ret.stops != null && inbound.stops != null && ret.stops !== inbound.stops) return null;
      const score = minuteDiff(outbound.departMin, out.departMin) + minuteDiff(outbound.arriveMin, out.arriveMin) +
        minuteDiff(inbound.departMin, ret.departMin) + minuteDiff(inbound.arriveMin, ret.arriveMin);
      return Number.isFinite(score) && score <= 80 ? { row, score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score)[0];
  if (schedule) return { price: schedule.row.price, currency: schedule.row.currency || BASE_CURRENCY, matchType: "round-trip-schedule-match", row: schedule.row };

  const sameCarrier = candidates.filter((row) =>
    carrierOverlap(outbound.carriers || [], row.outbound?.carrierCodes || []) &&
    carrierOverlap(inbound.carriers || [], row.return?.carrierCodes || [])
  );
  const pool = sameCarrier.length ? sameCarrier : candidates;
  const price = median(pool.map((row) => Number(row.price)).filter(Number.isFinite));
  return {
    price,
    currency: pool[0]?.currency || BASE_CURRENCY,
    matchType: sameCarrier.length ? "same-carrier-round-trip-benchmark" : "route-date-cabin-round-trip-benchmark",
    row: pool.find((row) => row.price === price) || pool[0],
  };
}

function candidateSort(left, right) {
  const leftCost = Number.isFinite(left.economicCost) ? left.economicCost : Infinity;
  const rightCost = Number.isFinite(right.economicCost) ? right.economicCost : Infinity;
  return leftCost - rightCost || Number(left.points || 0) - Number(right.points || 0) || Number(left.totalMinutes || Infinity) - Number(right.totalMinutes || Infinity);
}

function pointBreakdown(outbound, inbound) {
  const result = {};
  result[outbound.program] = (result[outbound.program] || 0) + Number(outbound.points || 0);
  result[inbound.program] = (result[inbound.program] || 0) + Number(inbound.points || 0);
  return result;
}

function allocateDerivedCashShares(totalCash, outbound, inbound) {
  if (!Number.isFinite(totalCash)) return null;
  const outEconomic = Number(outbound.economicCost || 0);
  const retEconomic = Number(inbound.economicCost || 0);
  const outPoints = Number(outbound.points || 0);
  const retPoints = Number(inbound.points || 0);

  let weights = [1, 1];
  let method = 'equal-split';
  if (outEconomic > 0 && retEconomic > 0) {
    weights = [outEconomic, retEconomic];
    method = 'economic-cost-weighted';
  } else if (outPoints > 0 && retPoints > 0) {
    weights = [outPoints, retPoints];
    method = 'points-weighted';
  }

  const totalWeight = weights[0] + weights[1];
  const outboundCashShare = totalWeight > 0 ? (Number(totalCash) * weights[0]) / totalWeight : Number(totalCash) / 2;
  const returnCashShare = Number(totalCash) - outboundCashShare;
  return {
    method,
    outboundCashShare,
    returnCashShare,
  };
}

function buildCombination(outbound, inbound, cashRows, kind, pax) {
  const cash = selectRoundTripCash(outbound, inbound, cashRows);
  const sameProgram = outbound.program === inbound.program;
  const totalPointUnits = Number(outbound.points || 0) + Number(inbound.points || 0);
  const totalPoints = sameProgram ? totalPointUnits : null;
  const taxesUsd = Number.isFinite(outbound.taxesUsd) && Number.isFinite(inbound.taxesUsd)
    ? outbound.taxesUsd + inbound.taxesUsd
    : null;
  const economicCost = Number.isFinite(outbound.economicCost) && Number.isFinite(inbound.economicCost)
    ? outbound.economicCost + inbound.economicCost
    : null;
  const cpp = sameProgram ? computeCPP(cash.price, taxesUsd, totalPoints) : null;
  const derivedCashShares = !sameProgram ? allocateDerivedCashShares(cash.price, outbound, inbound) : null;
  const legCppBreakdown = !sameProgram && derivedCashShares
    ? [
        {
          label: 'Outbound',
          program: outbound.program,
          programLabel: outbound.programLabel,
          points: Number(outbound.points || 0),
          cashShare: derivedCashShares.outboundCashShare,
          taxesUsd: Number.isFinite(outbound.taxesUsd) ? outbound.taxesUsd : null,
          cpp: computeCPP(derivedCashShares.outboundCashShare, outbound.taxesUsd, outbound.points),
        },
        {
          label: 'Return',
          program: inbound.program,
          programLabel: inbound.programLabel,
          points: Number(inbound.points || 0),
          cashShare: derivedCashShares.returnCashShare,
          taxesUsd: Number.isFinite(inbound.taxesUsd) ? inbound.taxesUsd : null,
          cpp: computeCPP(derivedCashShares.returnCashShare, inbound.taxesUsd, inbound.points),
        },
      ]
    : [];
  const derivedBlendedCpp = !sameProgram ? computeCPP(cash.price, taxesUsd, totalPointUnits) : null;
  const savingsVsCash = Number.isFinite(cash.price) && Number.isFinite(economicCost) ? cash.price - economicCost : null;
  const knownSeats = [outbound.seats, inbound.seats].filter(Number.isFinite);
  const seats = knownSeats.length ? Math.min(...knownSeats) : null;
  return {
    id: `${outbound.origin}-${outbound.date}-${outbound.program}-${outbound.id}::${inbound.origin}-${inbound.date}-${inbound.program}-${inbound.id}`,
    kind,
    sameProgram,
    outbound,
    return: inbound,
    origin: outbound.origin,
    destination: outbound.destination,
    outboundDate: outbound.date,
    returnDate: inbound.date,
    datePairKey: `${outbound.date}|${inbound.date}`,
    cabin: outbound.cabin,
    program: sameProgram ? outbound.program : null,
    programLabel: sameProgram ? outbound.programLabel : null,
    pointBreakdown: pointBreakdown(outbound, inbound),
    totalPointUnits,
    totalPoints,
    taxesUsd,
    economicCost,
    cashFare: cash.price,
    cashCurrency: cash.currency,
    cashMatchType: cash.matchType,
    cashItinerary: cash.row,
    cpp,
    derivedBlendedCpp,
    legCppBreakdown,
    cashSplitMethod: derivedCashShares?.method || null,
    savingsVsCash,
    seats,
    pax,
    totalMinutes: Number.isFinite(outbound.totalMinutes) && Number.isFinite(inbound.totalMinutes)
      ? outbound.totalMinutes + inbound.totalMinutes
      : null,
    totalStops: Number.isFinite(outbound.stops) && Number.isFinite(inbound.stops)
      ? outbound.stops + inbound.stops
      : null,
    bookingStructure: sameProgram ? "two-one-way-same-program" : "two-one-way-split-program",
    separateReservations: true,
  };
}

export function buildRoundTripCombinations({ outboundRows = [], returnRows = [], cashRows = [], pax = 1, maxPerDirection = 14 }) {
  const outbound = [...outboundRows].filter((row) => row.seats == null || row.seats >= pax).sort(candidateSort).slice(0, maxPerDirection);
  const inbound = [...returnRows].filter((row) => row.seats == null || row.seats >= pax).sort(candidateSort).slice(0, maxPerDirection);
  const sameProgram = [];
  const splitProgram = [];

  for (const out of outbound) {
    for (const ret of inbound) {
      if (out.cabin !== ret.cabin || out.date >= ret.date) continue;
      const kind = out.program === ret.program ? "same-program" : "split-program";
      const combination = buildCombination(out, ret, cashRows, kind, pax);
      (kind === "same-program" ? sameProgram : splitProgram).push(combination);
    }
  }

  const sortCombos = (left, right) => {
    const leftCost = Number.isFinite(left.economicCost) ? left.economicCost : Infinity;
    const rightCost = Number.isFinite(right.economicCost) ? right.economicCost : Infinity;
    const leftCash = Number.isFinite(left.cashFare) ? left.cashFare : Infinity;
    const rightCash = Number.isFinite(right.cashFare) ? right.cashFare : Infinity;
    return leftCost - rightCost || (right.cpp ?? -Infinity) - (left.cpp ?? -Infinity) || leftCash - rightCash || left.id.localeCompare(right.id);
  };

  return {
    sameProgram: sameProgram.sort(sortCombos).slice(0, 20),
    splitProgram: splitProgram.sort(sortCombos).slice(0, 20),
  };
}
