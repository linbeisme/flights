import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DEMO_RESULTS, DEMO_ROUTES, getDemoResultsForRoutes } from "./src/data/demoData.js";
import {
  enrichResult,
  buildRecommendations,
  DEFAULT_RECOMMENDATION_PREFS,
  groupRecommendationResults,
  isMinuteInWindow,
  validateRecommendationPrefs,
} from "./src/api/recommendationEngine.js";
import { buildCppLibrary } from "./src/api/cppLibrary.js";
import { assertLiveResults, containsDemoData, containsSyntheticLiveFallback, sanitizeLiveHistory } from "./src/api/modeIntegrity.js";

const cppRaw = JSON.parse(await readFile(new URL("./public/cpp-library.json", import.meta.url), "utf8"));
const cppLibrary = buildCppLibrary(cppRaw);

assert.equal(DEMO_ROUTES.length, 7);
assert.equal(DEMO_RESULTS.length, 20);
assert(DEMO_RESULTS.some((r) => r.origin === "LAX" && ["LHR", "CDG", "FCO"].includes(r.destination)));
assert(DEMO_RESULTS.some((r) => r.origin === "TPE" && ["NRT", "ICN", "BKK", "SIN"].includes(r.destination)));
assert(DEMO_RESULTS.every((r) => r.demo === true && r.cashSource === "demo" && r.cashMatchType === "demo-illustrative"));
assert.equal(getDemoResultsForRoutes([{ origin: "LAX", destination: "LHR" }]).length, 4);

assert.equal(Object.keys(cppLibrary.map).length, 9);
assert.equal(cppLibrary.map.united.cpp, 1.3);
const ua = enrichResult(DEMO_RESULTS.find((r) => r.id === "LHR-UA-1"), cppLibrary);
assert.equal(ua.referenceCpp, 1.3);
assert.equal(Math.round(ua.economicCost), 1046);

const rec = buildRecommendations(DEMO_RESULTS.filter((r) => r.origin === "LAX" && r.destination === "LHR"), DEFAULT_RECOMMENDATION_PREFS, cppLibrary);
assert(rec.cards.length >= 3);
assert(rec.scored.every((r) => Number.isFinite(r.recommendationScore)));
assert(rec.scored[0].recommendationScore >= rec.scored.at(-1).recommendationScore);

// Overnight time windows: 22:00–06:00 accepts late-night and early-morning values.
assert.equal(isMinuteInWindow(23 * 60, 22, 6), true);
assert.equal(isMinuteInWindow(5 * 60 + 30, 22, 6), true);
assert.equal(isMinuteInWindow(12 * 60, 22, 6), false);
assert.equal(isMinuteInWindow(12 * 60, 6, 22), true);

// Invalid settings stop ranking instead of silently falling back.
const invalidPrefs = { ...DEFAULT_RECOMMENDATION_PREFS, layoverMinH: 5, layoverMaxH: 2 };
const validation = validateRecommendationPrefs(invalidPrefs);
assert.equal(validation.valid, false);
assert(validation.errors.some((x) => /Minimum layover/.test(x)));
assert.equal(buildRecommendations(DEMO_RESULTS.slice(0, 4), invalidPrefs, cppLibrary).cards.length, 0);
const invalidAirportPrefs = { ...DEFAULT_RECOMMENDATION_PREFS, preferredAirports: "HND,TOOLONG" };
assert.equal(validateRecommendationPrefs(invalidAirportPrefs).valid, false);

// Route/date/cabin isolation: adding a much cheaper unrelated route cannot alter LAX→LHR ranking.
const laxRows = DEMO_RESULTS.filter((r) => r.origin === "LAX" && r.destination === "LHR");
const laxOnlyTop = groupRecommendationResults(laxRows, DEFAULT_RECOMMENDATION_PREFS, cppLibrary)[0][1].scored[0].id;
const grouped = groupRecommendationResults([...laxRows, ...DEMO_RESULTS.filter((r) => r.origin === "TPE" && r.destination === "ICN")], DEFAULT_RECOMMENDATION_PREFS, cppLibrary);
const laxMixedTop = grouped.find(([key]) => key.startsWith("LAX→LHR"))[1].scored[0].id;
assert.equal(laxMixedTop, laxOnlyTop);

// Confidence follows cash-fare provenance, not merely whether the fare is live.
const base = { ...laxRows[0], demo: false, cashSource: "live", totalMinutes: 600, stops: 0 };
assert.equal(buildRecommendations([{ ...base, id: "exact", cashMatchType: "exact-itinerary" }], DEFAULT_RECOMMENDATION_PREFS, cppLibrary).scored[0].confidence, "High");
assert.equal(buildRecommendations([{ ...base, id: "benchmark", cashMatchType: "route-cabin-benchmark" }], DEFAULT_RECOMMENDATION_PREFS, cppLibrary).scored[0].confidence, "Medium");
assert.equal(buildRecommendations([{ ...base, id: "unavailable", cash: null, cashSource: "unavailable", cashMatchType: "unavailable" }], DEFAULT_RECOMMENDATION_PREFS, cppLibrary).scored[0].confidence, "Low");

// Live/Demo integrity rejects contaminated rows and sanitizes history.
assert.equal(containsDemoData(DEMO_RESULTS), true);
assert.throws(() => assertLiveResults(DEMO_RESULTS), /rejected demo-tagged data/);
assert.deepEqual(assertLiveResults([{ id: "live" }]), [{ id: "live" }]);
assert.equal(containsSyntheticLiveFallback([{ id: "old", cashSource: "estimate" }]), true);
assert.throws(() => assertLiveResults([{ id: "old", cashSource: "estimate" }]), /synthetic cash-fare fallback/);
const history = sanitizeLiveHistory([
  { id: "live", results: [{ id: "x", cashSource: "live" }] },
  { id: "demo", results: [{ id: "y", demo: true }] },
  { id: "legacy-estimate", results: [{ id: "z", cashSource: "estimate" }] },
]);
assert.deepEqual(history.map((x) => x.id), ["live"]);

console.log(JSON.stringify({
  routes: DEMO_ROUTES.length,
  rows: DEMO_RESULTS.length,
  cppPrograms: Object.keys(cppLibrary.map).length,
  recommendationCards: rec.cards.map(([title, row]) => [title, row.id]),
  isolatedTop: laxOnlyTop,
  validationErrors: validation.errors,
}, null, 2));
