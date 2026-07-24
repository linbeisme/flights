import assert from "node:assert/strict";
import fs from "node:fs";
import { buildRecommendations, recommendationExclusionReasons } from "./src/api/recommendationEngine.js";

const recSource = fs.readFileSync("src/components/RecommendationPanel.jsx", "utf8");
const fxSource = fs.readFileSync("src/components/FxPanel.jsx", "utf8");
const appSource = fs.readFileSync("src/App.jsx", "utf8");
const wrangler = fs.readFileSync("wrangler.jsonc", "utf8");

assert.match(recSource, /bg-deal-soft p-2 font-data text-xs/, "economic metrics should use the light-green panel");
assert.match(recSource, /FlightInfoPopover/, "recommendation cards should include the flight information popover");
assert.match(recSource, /Other qualifying redemptions or not recommended flights/, "alternative recommendation section should be present");
assert.match(recSource, /Not recommended under current settings/, "not-recommended subsection should be present");
assert.match(fxSource, /Hide FX conversion/);
assert.match(fxSource, /Show FX conversion/);
assert.match(fxSource, /Recommendations \+ Results, Exact Same Flight, and Cash Fares/);

const fxIndex = appSource.indexOf("<FxPanel");
const cashIndex = appSource.indexOf('<div hidden={activeTab !== "cash"}>');
const rewardsIndex = appSource.indexOf('<div hidden={![');
assert.ok(fxIndex > 0 && fxIndex < cashIndex && fxIndex < rewardsIndex, "FX panel should be mounted above all tab-specific content");
assert.match(wrangler, /"name": "flights"/);
assert.match(wrangler, /"run_worker_first": \[/);
assert.match(wrangler, /"\/api\/\*"/);

const cppLibrary = { map: { united: { cpp: 1.3, source: "test", asOf: "2026-07-01" } } };
const base = {
  id: "ok", program: "united", programLabel: "United MileagePlus", origin: "LAX", destination: "LHR", date: "2026-10-15",
  cabin: "business", points: 80000, taxesOriginal: 6, taxesCurrency: "USD", cash: 4150, cashSource: "live", cashMatchType: "exact-itinerary",
  totalMinutes: 630, departMin: 1050, arriveMin: 720, stops: 0, connections: [], layovers: [], carriers: ["UA"], flightNumbers: "UA 923",
};
const rejected = { ...base, id: "reject", stops: 2, connections: ["LHR", "FRA"], layovers: [500, 80] };
const prefs = { preset: "balanced", maxStops: 1, layoverMinH: 1.25, layoverMaxH: 4, maxDurationH: 24, departStart: 6, departEnd: 22, arriveStart: 5, arriveEnd: 23, requiredAirports: "", preferredAirports: "", avoidAirports: "LHR" };
const reasons = recommendationExclusionReasons(rejected, prefs);
assert.ok(reasons.some((x) => x.includes("maximum stops")));
assert.ok(reasons.some((x) => x.includes("excluded connection")));
const rec = buildRecommendations([base, rejected], prefs, cppLibrary, {});
assert.equal(rec.notRecommended.length, 1);
assert.equal(rec.notRecommended[0].id, "reject");

console.log("✓ v11.3.2 recommendation presentation, FX visibility, alternatives, and deployment configuration checks passed");
