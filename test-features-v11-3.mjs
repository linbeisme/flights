import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DEMO_RESULTS } from "./src/data/demoData.js";
import { buildCppLibrary } from "./src/api/cppLibrary.js";
import { enrichResult } from "./src/api/recommendationEngine.js";
import { exactFlightIdentity, groupExactSameFlights, groupCashFareSummary } from "./src/api/sameFlightGroups.js";
import { buildRedemptionHandoff, bookingPacket } from "./src/api/redemptionLinks.js";
import {
  MAX_EXPANDED_ROUTES_PER_SAVED_ROUTE,
  MAX_EXPANDED_ROUTES_TOTAL,
  distanceMiles,
  expandSelectedRoutes,
  findNearbyAirports,
  nearbyPreview,
} from "./src/api/nearbyAirports.js";
import { AIRPORTS, PROGRAMS } from "./src/data/defaults.js";

const cppRaw = JSON.parse(await readFile(new URL("./public/cpp-library.json", import.meta.url), "utf8"));
const cpp = buildCppLibrary(cppRaw);
const fx = { GBP: { rate: 1.29, asOf: "2026-07-24" }, EUR: { rate: 1.17, asOf: "2026-07-24" }, JPY: { rate: 0.0068, asOf: "2026-07-24" }, SGD: { rate: 0.78, asOf: "2026-07-24" } };
const enriched = DEMO_RESULTS.map((row) => enrichResult(row, cpp, fx));

// Exact same physical NH824 is available through United and Virgin Atlantic.
const groups = groupExactSameFlights(enriched);
const nh824 = groups.find((group) => group.rows.some((row) => row.id === "NRT-UA-1"));
assert(nh824);
assert.equal(nh824.exact, true);
assert.equal(nh824.multiProgram, true);
assert.deepEqual(new Set(nh824.rows.map((row) => row.program)), new Set(["united", "virginatlantic"]));
assert.equal(exactFlightIdentity(nh824.rows[0]), exactFlightIdentity(nh824.rows[1]));
assert.equal(groupCashFareSummary(nh824).min, 720);
assert.equal(groupCashFareSummary(nh824).max, 720);
assert(nh824.rows.every((row) => Number.isFinite(row.economicCost)));
console.log("✓ v11.3 same-flight grouping uses exact flight sequence and shows cash plus economic cost");

const noFlightNumber = { ...nh824.rows[0], id: "no-flight", flightNumbers: "" };
const unverified = groupExactSameFlights([noFlightNumber])[0];
assert.equal(unverified.exact, false);
assert.equal(unverified.multiProgram, false);
console.log("✓ v11.3 missing flight numbers are not falsely merged into exact groups");

// Official redemption links and route/date handoff.
for (const program of PROGRAMS) {
  assert.match(program.redeemUrl, /^https:\/\//);
}
const aa = enriched.find((row) => row.program === "american");
const aaHandoff = buildRedemptionHandoff(aa, 2);
assert.equal(aaHandoff.prefilled, true);
assert.match(aaHandoff.url, /origin=LAX/);
assert.match(aaHandoff.url, /destination=LHR/);
assert.match(aaHandoff.url, /departureDate=2026-10-15/);
assert.match(aaHandoff.url, /adultPassengerCount=2/);
assert.match(bookingPacket(aa, 2), /Flight number\(s\) supplied by source: AA 134/);
const flyingBlue = enriched.find((row) => row.program === "flyingblue");
const fbHandoff = buildRedemptionHandoff(flyingBlue, 1);
assert.equal(fbHandoff.prefilled, false);
assert.match(fbHandoff.packet, /Departure date: 2026-10-17/);
console.log("✓ v11.3 redemption handoff provides official links and prefilled/copyable trip details");

// Nearby airport expansion.
assert(distanceMiles(AIRPORTS.LAX, AIRPORTS.BUR) < 50);
const laxNearby = findNearbyAirports("LAX", 50);
for (const airport of ["LAX", "BUR", "LGB", "SNA", "ONT"]) assert(laxNearby.includes(airport));
const londonNearby = findNearbyAirports("LHR", 50);
for (const airport of ["LHR", "LGW", "LCY"]) assert(londonNearby.includes(airport));
const route = {
  id: "test-lax-lhr",
  origin: "LAX",
  destination: "LHR",
  date: "2026-10-15",
  flex: 0,
  nearbyOrigin: true,
  nearbyDestination: true,
  nearbyRadiusMiles: 50,
};
const preview = nearbyPreview(route);
assert(preview.rawCombinations > 1);
assert(preview.combinations <= MAX_EXPANDED_ROUTES_PER_SAVED_ROUTE);
const expanded = expandSelectedRoutes([route]);
assert(expanded.routes.length <= MAX_EXPANDED_ROUTES_PER_SAVED_ROUTE);
assert(expanded.routes.length <= MAX_EXPANDED_ROUTES_TOTAL);
assert(expanded.routes.some((item) => item.origin === "LAX" && item.destination === "LHR"));
assert(expanded.routes.some((item) => item.nearbyExpanded));
console.log("✓ v11.3 nearby-airport expansion is curated, bounded, deduplicated, and includes the base route");

console.log("\nAll v11.3 feature checks passed.");
