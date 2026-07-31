import { AIRPORTS } from "./airports.js";

// ── Reward program → seats.aero source code mapping ────────────────
// seats.aero identifies each mileage program by a "source" string.
// These nine are the programs this app searches and filters on.
// Each program gets a fixed badge color so results scan at a glance,
// plus the program's own site for redeeming the points (booking must
// happen there — this app finds and values space, airlines issue it).
export const PROGRAMS = [
  { id: "alaska",         source: "alaska",         label: "Alaska Atmos Rewards",  short: "AS", color: "#1b6e8c", redeemUrl: "https://www.alaskaair.com/atmosrewards/content/use-points" },
  { id: "american",       source: "american",       label: "American AAdvantage",   short: "AA", color: "#c41230", redeemUrl: "https://www.aa.com/web/i18n/aadvantage-program/use-miles/use-miles.html" },
  { id: "delta",          source: "delta",          label: "Delta SkyMiles",        short: "DL", color: "#5c2d91", redeemUrl: "https://www.delta.com/flightsearch/book-a-flight" },
  { id: "united",         source: "united",         label: "United MileagePlus",    short: "UA", color: "#1a4480", redeemUrl: "https://www.united.com/en/us/book-flight/united-award-travel" },
  { id: "flyingblue",     source: "flyingblue",     label: "KLM/AF Flying Blue",    short: "FB", color: "#0f8bb0", redeemUrl: "https://www.flyingblue.com/en/flights/reward-tickets" },
  { id: "virginatlantic", source: "virginatlantic", label: "Virgin Atlantic",       short: "VS", color: "#d9366b", redeemUrl: "https://www.virginatlantic.com/reward-flight-finder" },
  { id: "aeroplan",       source: "aeroplan",       label: "Air Canada Aeroplan",   short: "AC", color: "#0e7c6b", redeemUrl: "https://www.aircanada.com/us/en/aco/home/aeroplan/redeem/air-canada.html" },
  { id: "lifemiles",      source: "lifemiles",      label: "Avianca LifeMiles",     short: "LM", color: "#d1541e", redeemUrl: "https://www.lifemiles.com/fly/find" },
  { id: "turkish",        source: "turkish",        label: "Turkish Miles&Smiles",  short: "TK", color: "#8c1d40", redeemUrl: "https://www.turkishairlines.com/en-us/miles-and-smiles/book-award-tickets" },
];

// IATA carrier code → airline name, for the "operated by" chip.
// Unknown codes fall back to showing the raw code.
export const AIRLINE_NAMES = {
  AS: "Alaska", AA: "American", DL: "Delta", UA: "United", AC: "Air Canada",
  TK: "Turkish Airlines", VS: "Virgin Atlantic", AV: "Avianca", KL: "KLM",
  AF: "Air France", NH: "ANA", JL: "JAL", BR: "EVA Air", CI: "China Airlines",
  KE: "Korean Air", OZ: "Asiana", SQ: "Singapore Airlines", TG: "Thai Airways",
  CX: "Cathay Pacific", JX: "Starlux Airlines", MH: "Malaysia Airlines", GA: "Garuda", LH: "Lufthansa",
  LX: "SWISS", OS: "Austrian", SN: "Brussels Airlines", SK: "SAS", TP: "TAP Portugal",
  IB: "Iberia", AY: "Finnair", BA: "British Airways", QR: "Qatar Airways",
  EK: "Emirates", EY: "Etihad", QF: "Qantas", NZ: "Air New Zealand",
  HA: "Hawaiian", B6: "JetBlue", WS: "WestJet", MU: "China Eastern",
  CZ: "China Southern", CA: "Air China", HX: "Hong Kong Airlines",
  UO: "HK Express", VN: "Vietnam Airlines", PR: "Philippine Airlines",
  AZ: "ITA Airways", LO: "LOT Polish", EW: "Eurowings", FI: "Icelandair",
};

// Each cabin gets its own tint so results scan by class at a glance
// (rendered as tinted pills, distinct from the solid program badges).
export const CABINS = [
  { id: "economy",  code: "Y", label: "Economy",         color: "#2e7d32" },
  { id: "premium",  code: "W", label: "Premium Economy", color: "#b07d1a" },
  { id: "business", code: "J", label: "Business",        color: "#29539b" },
  { id: "first",    code: "F", label: "First",           color: "#8e3ba8" },
];

// Coordinates power the demo-mode distance model (duration + cash
// fare estimates) and are handy for future map features.
export { AIRPORTS };

function futureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

// ── Pre-loaded routes ──────────────────────────────────────────────
// TPE fan-out across East/Southeast Asia, LAX fan-out to Asia +
// Europe. Dates default ~45 days out; the user edits them freely.
const TPE_DESTS = ["ICN", "NRT", "HND", "BKK", "SIN", "HKG", "KUL", "KIX", "CTS", "NGO"];
const LAX_DESTS = ["TPE", "NRT", "AMS", "CDG", "FRA", "ZRH", "FCO", "MUC", "BCN", "LIS", "MAD", "IST"];

export function buildDefaultRoutes() {
  const routes = [];
  TPE_DESTS.forEach((dest, i) =>
    routes.push({ id: `tpe-${dest.toLowerCase()}`, origin: "TPE", destination: dest, date: futureDate(45 + (i % 3)), flex: 0 })
  );
  LAX_DESTS.forEach((dest, i) =>
    routes.push({ id: `lax-${dest.toLowerCase()}`, origin: "LAX", destination: dest, date: futureDate(45 + (i % 3)), flex: 0 })
  );
  return routes;
}

// Date-flexibility choices offered on every route strip. `flex: 3`
// means "search the chosen date ± 3 days" (a 7-day window).
export const FLEX_OPTIONS = [
  { value: 0,  label: "Exact date" },
  { value: 1,  label: "± 1 day" },
  { value: 3,  label: "± 3 days" },
  { value: 7,  label: "± 7 days" },
  { value: 14, label: "± 14 days" },
  { value: 30, label: "± 30 days" },
];

// Type-to-jump for airport <select>s: pressing a letter cycles through
// the options whose CODE starts with that letter (native type-ahead can
// stall on long lists; this makes it deterministic and cyclic).
export function selectKeyJump(e, codes, currentValue, onPick) {
  const ch = e.key.length === 1 ? e.key.toUpperCase() : "";
  if (!/^[A-Z]$/.test(ch)) return;
  const matches = codes.filter((c) => c.startsWith(ch));
  if (matches.length === 0) return;
  e.preventDefault();
  const idx = matches.indexOf(currentValue);
  onPick(matches[(idx + 1) % matches.length]);
}

// Parse a free-typed airport value ("ont", "ONT — Ontario CA", "SNA ")
// into a clean 3-letter IATA code, or "" if it isn't one. Any valid
// code is accepted — the catalog is suggestions, not a restriction.
export function normalizeAirportInput(value) {
  const m = /^\s*([A-Za-z]{3})(\s*[—-].*)?\s*$/.exec(value || "");
  return m ? m[1].toUpperCase() : "";
}
