import assert from "node:assert/strict";
import fs from "node:fs";
import { buildCppLibrary } from "./src/api/cppLibrary.js";
import { fxEntryStatus, normalizeFxEntry } from "./src/api/currency.js";
import { buildRecommendations } from "./src/api/recommendationEngine.js";
import { onRequest as cashFareWorker } from "./functions/api/cashfare.js";

const app = fs.readFileSync("src/App.jsx", "utf8");
const cash = fs.readFileSync("src/components/CashFares.jsx", "utf8");
const routes = fs.readFileSync("src/components/RouteManager.jsx", "utf8");
const roundTrip = fs.readFileSync("src/components/RoundTripResults.jsx", "utf8");
const fxPanel = fs.readFileSync("src/components/FxPanel.jsx", "utf8");
const cppPanel = fs.readFileSync("src/components/CppReferencePanel.jsx", "utf8");
const recEngine = fs.readFileSync("src/api/recommendationEngine.js", "utf8");
const worker = fs.readFileSync("functions/api/cashfare.js", "utf8");

assert.match(app, /displayedRoundTripData = useMemo/);
assert.match(app, /roundTripData\.scenarios/);
assert.match(app, /applyFilters\([\s\S]*effectiveFilters/);
assert.match(app, /activeFilters: effectiveFilters/);
assert.match(roundTrip, /Programs, cabin, stops, time windows, layover duration, total travel time/);

assert.match(cash, /grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8/);
assert.match(cash, /md:grid-cols-\[minmax\(0,1fr\)_minmax\(230px,auto\)\]/);
assert.match(cash, /visibleShown = tripType === "roundtrip" \? shown\.slice\(0, 20\)/);
assert.match(roundTrip, /rows\.slice\(0, 20\)/);

assert.match(worker, /operating_airline \|\| segment\.operated_by/);
assert.match(worker, /operatingCarriers/);
assert.match(cash, /\[Operated by \{airlines\.operating\}\]/);

assert.match(routes, /sortSavedRoutes/);
assert.match(routes, /routeTypeFilter/);
assert.match(routes, /One way \(\$\{oneWayCount\}\)/);
assert.match(routes, /Round trip \(\$\{roundTripCount\}\)/);
assert.match(app, /useState\(loadStartupRoutes\)/);
assert.match(app, /setRoutes\(\(rs\) => \[route, \.\.\.rs\]\)/);

assert.match(recEngine, /slice\(0, 20\)/);
const sampleRows = Array.from({ length: 30 }, (_, index) => ({
  id: `r-${index}`,
  program: "united",
  programLabel: "United MileagePlus",
  origin: "LAX",
  destination: "JFK",
  date: "2026-10-10",
  cabin: "economy",
  points: 10000 + index,
  taxesOriginal: 5,
  taxesCurrency: "USD",
  taxesUsd: 5,
  cash: 500,
  cashSource: "live",
  cashMatchType: "exact-itinerary",
  totalMinutes: 300 + index,
  departMin: 480,
  arriveMin: 780,
  stops: 0,
  connections: [],
  layovers: [],
  carriers: ["UA"],
  economicCost: 150 + index,
  cpp: 2,
}));
const library = { map: { united: { cpp: 1.3, source: "test", asOf: "2026-07-01" } }, rows: [], meta: {} };
const rec = buildRecommendations(sampleRows, undefined, library, {});
assert.ok(rec.cards.length + rec.other.length <= 25);
assert.ok(rec.other.length <= 20);

assert.equal(fxEntryStatus({ rate: 1.2, asOf: "2026-06-01" }, new Date("2026-07-02T00:00:00Z")).reason, "expired");
assert.equal(normalizeFxEntry({ rate: 1.2, asOf: "2026-06-02" }, new Date("2026-07-02T00:00:00Z")).daysRemaining, 0);
assert.match(fxPanel, /FX_VALID_DAYS/);
assert.match(fxPanel, /Expired after/);

const cppRaw = JSON.parse(fs.readFileSync("public/cpp-library.json", "utf8"));
const cppLibrary = buildCppLibrary(cppRaw);
assert.ok(cppLibrary.rows.filter((row) => row.type === "Airline").length >= 20);
assert.match(cppPanel, /Reference CPP library/);
assert.match(cppPanel, /Valuation date/);
assert.match(cppPanel, /Open source valuation page/);

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify({
  best_flights: [{
    price: 500,
    total_duration: 120,
    flights: [{
      airline: "Ticketing Air",
      operating_airline: "Operating Air",
      flight_number: "TA 10",
      departure_airport: { time: "2026-10-10 08:00" },
      arrival_airport: { time: "2026-10-10 10:00" },
    }],
    layovers: [],
  }],
}), { status: 200, headers: { "Content-Type": "application/json" } });
try {
  const response = await cashFareWorker({
    request: new Request("https://app.test/api/cashfare?origin=LAX&destination=JFK&date=2026-10-10&cabin=economy&list=1"),
    env: { SERPAPI_KEY: "test" },
  });
  const body = await response.json();
  assert.deepEqual(body.flights[0].carriers, ["Ticketing Air"]);
  assert.deepEqual(body.flights[0].operatingCarriers, ["Operating Air"]);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("✓ v11.4.4 live filters, aligned layout, operating-airline labels, saved-route sorting/filtering, result caps, FX expiry, and CPP reference checks passed");
