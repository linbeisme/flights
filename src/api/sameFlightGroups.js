import { normalizeFlightNumbers } from "./flightApi.js";

const clean = (value) => String(value || "").trim().toUpperCase();

export function exactFlightIdentity(row) {
  const flights = normalizeFlightNumbers(row.flightNumbers);
  if (!flights.length) return null;
  return [
    clean(row.date),
    clean(row.origin),
    clean(row.destination),
    clean(row.cabin),
    flights.join("-"),
  ].join("|");
}

export function groupExactSameFlights(rows = []) {
  const exact = new Map();
  const unverified = [];
  for (const row of rows) {
    const identity = exactFlightIdentity(row);
    if (!identity) {
      unverified.push({
        key: `unverified|${row.id}`,
        exact: false,
        multiProgram: false,
        rows: [row],
        representative: row,
      });
      continue;
    }
    if (!exact.has(identity)) exact.set(identity, []);
    exact.get(identity).push(row);
  }

  const groups = [...exact.entries()].map(([key, groupRows]) => {
    const sortedRows = [...groupRows].sort((a, b) => {
      const aCost = Number.isFinite(a.economicCost) ? a.economicCost : Infinity;
      const bCost = Number.isFinite(b.economicCost) ? b.economicCost : Infinity;
      return aCost - bCost || Number(a.points || 0) - Number(b.points || 0);
    });
    const programs = new Set(sortedRows.map((row) => row.program));
    return {
      key,
      exact: true,
      multiProgram: programs.size > 1,
      rows: sortedRows,
      representative: sortedRows[0],
      bestEconomic: sortedRows.find((row) => Number.isFinite(row.economicCost)) || null,
    };
  });

  return [...groups, ...unverified].sort((a, b) => {
    if (a.multiProgram !== b.multiProgram) return a.multiProgram ? -1 : 1;
    if (a.exact !== b.exact) return a.exact ? -1 : 1;
    const left = a.representative;
    const right = b.representative;
    return String(left.date).localeCompare(String(right.date)) || Number(left.departMin ?? Infinity) - Number(right.departMin ?? Infinity);
  });
}

export function groupCashFareSummary(group) {
  const values = group.rows.map((row) => Number(row.cash)).filter(Number.isFinite).sort((a, b) => a - b);
  if (!values.length) return { min: null, max: null, label: "Cash fare unavailable" };
  const min = values[0];
  const max = values.at(-1);
  return { min, max, label: min === max ? "Cash fare" : "Cash fare range" };
}
