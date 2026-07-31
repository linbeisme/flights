import assert from "node:assert/strict";
import fs from "node:fs";
import { applyFilters, DEFAULT_FILTERS } from "./src/api/flightApi.js";
import { CPP_TPG_UPDATE_PROMPT } from "./src/data/cppUpdatePrompt.js";

const bookingUi = fs.readFileSync("src/components/BookingOptions.jsx", "utf8");
const cashUi = fs.readFileSync("src/components/CashFares.jsx", "utf8");
const filtersUi = fs.readFileSync("src/components/FilterSidebar.jsx", "utf8");
const roundTripUi = fs.readFileSync("src/components/RoundTripResults.jsx", "utf8");
const cppUi = fs.readFileSync("src/components/CppReferencePanel.jsx", "utf8");
const app = fs.readFileSync("src/App.jsx", "utf8");

assert.match(bookingUi, /Open Google Flights/);
assert.doesNotMatch(bookingUi, /View booking options|Loading booking options|fetchBookingOptions|Booking options HTTP/);

assert.match(cashUi, /\{f\.totalMinutes != null && <span className="text-sm font-medium text-ink-soft">· \{formatDuration\(f\.totalMinutes\)\} total<\/span>\}/);
assert.match(cashUi, /text-sm font-medium text-ink-soft/);
assert.match(cashUi, /text-xs font-medium text-ink-soft/);

assert.match(filtersUi, /Maximum fees & taxes/);
assert.match(filtersUi, /Maximum award fees\/taxes in USD/);
assert.match(filtersUi, /maxTaxesUsd/);
assert.match(app, /maximumRoundTripTaxes/);
assert.match(app, /combo\.taxesUsd <= maximumRoundTripTaxes/);
assert.match(roundTripUi, /combo\.taxesUsd > maximumTaxes/);

const rows = [
  { id: "low", program: "united", cabin: "economy", seats: 1, taxesUsd: 90, departMin: 100, arriveMin: 200, stops: 0, connections: [], layovers: [], totalMinutes: 100, cpp: 1.5, points: 1 },
  { id: "high", program: "united", cabin: "economy", seats: 1, taxesUsd: 150, departMin: 100, arriveMin: 200, stops: 0, connections: [], layovers: [], totalMinutes: 100, cpp: 1.5, points: 1 },
  { id: "unknown", program: "united", cabin: "economy", seats: 1, taxesUsd: null, departMin: 100, arriveMin: 200, stops: 0, connections: [], layovers: [], totalMinutes: 100, cpp: 1.5, points: 1 },
];
const filtered = applyFilters(rows, { ...DEFAULT_FILTERS, programs: ["united"], cabins: ["economy"], maxTaxesUsd: "100" });
assert.deepEqual(filtered.map((row) => row.id), ["low"]);

assert.match(roundTripUi, /text-lg font-bold leading-tight text-deal/);
assert.match(roundTripUi, /True round-trip cash fare/);
assert.match(roundTripUi, /Round-trip CPP/);

assert.match(cppUi, /Copy TPG update prompt/);
assert.match(cppUi, /Download GitHub JSON/);
assert.match(cppUi, /Copy GitHub JSON/);
assert.match(cppUi, /Open GitHub editor/);
assert.match(cppUi, /public\/cpp-library\.json/);
assert.match(cppUi, /Number\(row\.cpp\) < 1\.25/);
assert.match(cppUi, /text-\[#dc2626\]/);
assert.match(CPP_TPG_UPDATE_PROMPT, /latest points-and-miles valuations published by The Points Guy/);
assert.match(CPP_TPG_UPDATE_PROMPT, /partner-redemption-comparator\.cpp-library\.v2/);
assert.match(CPP_TPG_UPDATE_PROMPT, /Return only the final valid JSON object/);

console.log("✓ v11.4.5 Google Flights-only links, duration placement, max tax filter, larger round-trip metrics, TPG prompt/GitHub flow, and low-CPP highlighting passed");
