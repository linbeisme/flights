import assert from "node:assert/strict";
import {
  BASE_CURRENCY,
  convertToUsd,
  detectTaxCurrency,
  formatMoney,
  normalizeCurrencyCode,
} from "./src/api/currency.js";
import { applyFilters, DEFAULT_FILTERS, normalizeSeatCount, normalizeTaxesFromMinorUnits, selectCashFareForTrip } from "./src/api/flightApi.js";
import {
  DEFAULT_RECOMMENDATION_PREFS,
  buildRecommendations,
  enrichResult,
  scoreResults,
} from "./src/api/recommendationEngine.js";
import { DEMO_RESULTS } from "./src/data/demoData.js";
import cppData from "./public/cpp-library.json" with { type: "json" };
import { buildCppLibrary } from "./src/api/cppLibrary.js";
const cppLibrary = buildCppLibrary(cppData);

function test(name, fn) {
  fn();
  console.log(`✓ ${name}`);
}

test("Currency: ISO normalization and safe formatting", () => {
  assert.equal(normalizeCurrencyCode("gbp"), "GBP");
  assert.equal(normalizeCurrencyCode("$"), null);
  assert.match(formatMoney(810, "GBP"), /£|GBP/);
  assert.equal(formatMoney(null, "USD"), "—");
  assert.equal(BASE_CURRENCY, "USD");
});

test("Taxes: unavailable source data stays unknown instead of becoming zero", () => {
  assert.equal(normalizeTaxesFromMinorUnits(undefined), null);
  assert.equal(normalizeTaxesFromMinorUnits(null), null);
  assert.equal(normalizeTaxesFromMinorUnits(0), 0);
  assert.equal(normalizeTaxesFromMinorUnits(1290), 12.9);
  const raw = { ...DEMO_RESULTS[0], taxes: null, taxesOriginal: null, taxesUsd: null };
  const result = enrichResult(raw, cppLibrary, {});
  assert.equal(result.fxStatus, "taxes-unavailable");
  assert.equal(result.cpp, null);
  assert.equal(result.economicCost, null);
});

test("Seats: known unreliable zero counts are shown as unknown", () => {
  assert.equal(normalizeSeatCount(0, "american"), null);
  assert.equal(normalizeSeatCount(0, "turkish"), null);
  assert.equal(normalizeSeatCount(0, "united"), 0);
  assert.equal(normalizeSeatCount(3, "american"), 3);
});

test("Currency: provider field detected; legacy omission is explicitly marked", () => {
  assert.deepEqual(detectTaxCurrency({ TotalTaxesCurrency: "EUR" }, {}, "business"), { code: "EUR", source: "provider" });
  assert.deepEqual(detectTaxCurrency({}, {}, "business"), { code: "USD", source: "legacy-usd-assumption" });
});

test("FX: non-USD fee is blocked without manual rate", () => {
  const out = convertToUsd(810, "GBP", {});
  assert.equal(out.usd, null);
  assert.equal(out.status, "missing-rate");
});

test("FX: manual rate converts into USD", () => {
  const out = convertToUsd(810, "GBP", { GBP: { rate: 1.29, asOf: "2026-07-24" } });
  assert.equal(out.usd, 1044.9);
  assert.equal(out.rate, 1.29);
  assert.equal(out.asOf, "2026-07-24");
});

test("Reward result: CPP and economic cost remain unavailable until FX is entered", () => {
  const raw = DEMO_RESULTS.find((r) => r.id === "LHR-VS-1");
  const blocked = enrichResult(raw, cppLibrary, {});
  assert.equal(blocked.taxesCurrency, "GBP");
  assert.equal(blocked.taxesUsd, null);
  assert.equal(blocked.cpp, null);
  assert.equal(blocked.economicCost, null);

  const converted = enrichResult(raw, cppLibrary, { GBP: { rate: 1.29 } });
  assert.equal(converted.taxesUsd, 1044.9);
  assert.ok(converted.cpp > 0);
  assert.ok(converted.economicCost > 0);
});

test("Reward filters: include and exclude connection-airport rules", () => {
  const rows = [
    { id: "nrt", program: "united", cabin: "business", seats: 2, departMin: 600, arriveMin: 900, stops: 1, connections: ["NRT"], layovers: [120], totalMinutes: 600, cpp: 2, points: 1, taxes: 1 },
    { id: "lhr", program: "united", cabin: "business", seats: 2, departMin: 600, arriveMin: 900, stops: 1, connections: ["LHR"], layovers: [120], totalMinutes: 600, cpp: 2, points: 1, taxes: 1 },
    { id: "direct", program: "united", cabin: "business", seats: 2, departMin: 600, arriveMin: 900, stops: 0, connections: [], layovers: [], totalMinutes: 500, cpp: 2, points: 1, taxes: 1 },
  ];
  const f = { ...DEFAULT_FILTERS, connectionInclude: "NRT,LHR", connectionExclude: "LHR" };
  assert.deepEqual(applyFilters(rows, f).map((r) => r.id), ["nrt"]);
});

test("Cash provenance: same-airline benchmark outranks route-wide benchmark", () => {
  const selected = selectCashFareForTrip(
    { carriers: ["UA"], flightNumbers: "", departMin: null, arriveMin: null },
    {
      source: "live",
      currency: "USD",
      benchmarkPrice: 900,
      flights: [
        { id: "ua", price: 1300, carrierCodes: ["UA"], flightNumbers: ["UA999"] },
        { id: "lh", price: 900, carrierCodes: ["LH"], flightNumbers: ["LH111"] },
      ],
    }
  );
  assert.equal(selected.matchType, "same-carrier-benchmark");
  assert.equal(selected.price, 1300);
});

test("Recommendations: required and avoided connections are enforced", () => {
  const rows = DEMO_RESULTS.filter((r) => r.origin === "LAX" && r.destination === "FCO");
  const result = scoreResults(rows, { ...DEFAULT_RECOMMENDATION_PREFS, requiredAirports: "IST", preferredAirports: "", avoidAirports: "MUC" }, cppLibrary, { EUR: { rate: 1.1 } });
  assert.equal(result.eligibleCount, 1);
  assert.equal(result.scored[0].id, "FCO-TK-1");
});

test("Recommendations: up to five non-featured alternatives are returned", () => {
  const rows = DEMO_RESULTS.filter((r) => r.origin === "LAX" && r.destination === "LHR");
  const result = buildRecommendations(rows, DEFAULT_RECOMMENDATION_PREFS, cppLibrary, { GBP: { rate: 1.29 } });
  const featured = new Set(result.cards.map(([, r]) => r.id));
  assert.ok(result.other.length <= 5);
  assert.ok(result.other.every((r) => !featured.has(r.id)));
});

test("Demo coverage: foreign currencies, carriers, seats, and timestamps are present", () => {
  assert.ok(DEMO_RESULTS.some((r) => r.taxesCurrency !== "USD"));
  assert.ok(DEMO_RESULTS.every((r) => Array.isArray(r.carriers)));
  assert.ok(DEMO_RESULTS.every((r) => r.seats != null));
  assert.ok(DEMO_RESULTS.every((r) => r.availabilityUpdatedAt));
});

console.log("\nAll 12 currency, provenance, and expanded recommendation test groups passed.");
