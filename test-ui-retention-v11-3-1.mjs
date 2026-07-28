import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const app = read("src/App.jsx");
const filters = read("src/components/FilterSidebar.jsx");
const routes = read("src/components/RouteManager.jsx");
const recs = read("src/components/RecommendationPanel.jsx");
const same = read("src/components/SameFlightView.jsx");

for (const fragment of [
  "<RouteManager",
  "<FilterSidebar",
  "<RecommendationPanel",
  "<FlightResults",
  "<SameFlightView",
  "Recommendations + Results",
  "Exact Same Flight",
  "Cash Fares",
]) assert.match(app, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

for (const fragment of [
  "Programs",
  "Cabin",
  "Departure",
  "Arrival",
  "Stops",
  "Connection airports",
  "Layover duration",
  "Total travel time",
  "Clear all",
]) assert.match(filters, new RegExp(fragment));

assert.match(routes, /Saved routes/i);
assert.match(recs, /Recommended redemptions/i);
assert.match(recs, /Other qualifying redemptions/i);
assert.match(recs, /Cash fare/i);
assert.match(recs, /Economic cost/i);
assert.match(same, /same program, cabin, time, stop, layover, connection-airport, and total-duration filters/i);

console.log("✓ v11.3.1 full original filters, saved routes, recommendations, and new views are retained in the actual React source");
