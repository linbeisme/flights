import assert from "node:assert/strict";
import { onRequest as search } from "./functions/api/search.js";
import { onRequest as cashfare, medianPrice } from "./functions/api/cashfare.js";
import { onRequest as health } from "./functions/api/health.js";
import workerModule from "./worker/index.js";

const req = (url, method = "GET", origin) => ({
  request: new Request(url, { method, headers: origin ? { Origin: origin } : {} }),
});

// Same-origin preflight is allowed and does not use a wildcard.
let r = await search({ ...req("https://x.dev/api/search", "OPTIONS", "https://x.dev"), env: {} });
assert.equal(r.status, 204);
assert.equal(r.headers.get("Access-Control-Allow-Origin"), "https://x.dev");
assert.notEqual(r.headers.get("Access-Control-Allow-Origin"), "*");
console.log("✓ search: same-origin CORS preflight is restricted");

// Cross-origin requests are blocked unless explicitly allowlisted.
r = await search({ ...req("https://x.dev/api/search", "OPTIONS", "https://evil.example"), env: {} });
assert.equal(r.status, 403);
r = await search({ ...req("https://x.dev/api/search", "OPTIONS", "https://app.example"), env: { ALLOWED_ORIGINS: "https://app.example" } });
assert.equal(r.status, 204);
assert.equal(r.headers.get("Access-Control-Allow-Origin"), "https://app.example");
console.log("✓ search: cross-origin access requires ALLOWED_ORIGINS");

// Missing key → 500 with clear guidance.
r = await search({ ...req("https://x.dev/api/search?origin_airport=TPE&destination_airport=ICN&start_date=2026-08-15"), env: {} });
assert.equal(r.status, 500);
assert.match((await r.json()).error, /SEATS_AERO_API_KEY/);
console.log("✓ search: missing seats.aero key is reported");

// Validation hardening.
const searchEnv = { SEATS_AERO_API_KEY: "k" };
for (const url of [
  "https://x.dev/api/search?origin_airport=TAIPEI&destination_airport=ICN&start_date=2026-08-15",
  "https://x.dev/api/search?origin_airport=TPE&destination_airport=TPE&start_date=2026-08-15",
  "https://x.dev/api/search?origin_airport=TPE&destination_airport=ICN&start_date=2026-02-30",
  "https://x.dev/api/search?origin_airport=TPE&destination_airport=ICN&start_date=2026-08-16&end_date=2026-08-15",
  "https://x.dev/api/search?origin_airport=TPE&destination_airport=ICN&start_date=2026-08-15&take=0",
  "https://x.dev/api/search?trips=../etc",
]) {
  r = await search({ ...req(url), env: searchEnv });
  assert.equal(r.status, 400, url);
}
r = await search({ ...req("https://x.dev/api/search", "POST"), env: searchEnv });
assert.equal(r.status, 405);
console.log("✓ search: airports, real dates, range, take, trip id, and method validated");

// Live mode has no deterministic cash-fare fallback.
r = await cashfare({ ...req("https://x.dev/api/cashfare?origin=LAX&destination=TPE&date=2026-08-15&cabin=business"), env: {} });
let body = await r.json();
assert.equal(r.status, 200);
assert.equal(body.source, "unavailable");
assert.equal(body.price, null);
assert.match(body.reason, /SERPAPI_KEY/);
r = await cashfare({ ...req("https://x.dev/api/cashfare?origin=TPE&destination=SIN&date=2026-09-15&cabin=economy&list=1"), env: {} });
body = await r.json();
assert.equal(body.source, "unavailable");
assert.equal(body.benchmarkPrice, null);
assert.deepEqual(body.flights, []);
console.log("✓ cashfare: missing SerpApi key returns unavailable, never a synthetic fare");

// Cash endpoint validation.
for (const url of [
  "https://x.dev/api/cashfare?origin=LAX&destination=LAX&date=2026-08-15&cabin=economy",
  "https://x.dev/api/cashfare?origin=LAX&destination=TPE&date=2026-02-30&cabin=economy",
  "https://x.dev/api/cashfare?origin=LAX&destination=TPE&date=2026-08-15&cabin=suite",
]) {
  r = await cashfare({ ...req(url), env: {} });
  assert.equal(r.status, 400, url);
}
console.log("✓ cashfare: route, real date, and cabin validated");

// Median-price calculation used only with live SerpApi rows.
assert.equal(medianPrice([95, 95, 99, 99, 151, 158, 182, 207, 207]), 151);
assert.equal(medianPrice([95, 200]), 148);
assert.equal(medianPrice([300]), 300);
assert.equal(medianPrice([]), null);
console.log("✓ cashfare: live median calculation is correct");

// Health endpoint discloses configuration state, never secret values.
r = await health({ ...req("https://x.dev/api/health"), env: { SEATS_AERO_API_KEY: "award-secret", SERPAPI_KEY: "cash-secret" } });
body = await r.json();
assert.equal(r.status, 200);
assert.equal(body.ok, true);
assert.equal(body.version, "11.3.2");
assert.equal(body.liveAwardConfigured, true);
assert.equal(body.liveCashConfigured, true);
assert.doesNotMatch(JSON.stringify(body), /award-secret|cash-secret/);
console.log("✓ health: configuration status is safe and useful");

// Worker routing.
const mockAssets = { fetch: async () => new Response("STATIC_APP", { status: 200 }) };
r = await workerModule.fetch(new Request("https://x.dev/api/search?origin_airport=TPE&destination_airport=ICN&start_date=2026-08-15"), { ASSETS: mockAssets });
assert.equal(r.status, 500);
r = await workerModule.fetch(new Request("https://x.dev/api/cashfare?origin=LAX&destination=TPE&date=2026-08-15&cabin=economy"), { ASSETS: mockAssets });
assert.equal((await r.json()).source, "unavailable");
r = await workerModule.fetch(new Request("https://x.dev/api/health"), { ASSETS: mockAssets, SEATS_AERO_API_KEY: "k" });
assert.equal((await r.json()).liveAwardConfigured, true);
r = await workerModule.fetch(new Request("https://x.dev/api/nope"), { ASSETS: mockAssets });
assert.equal(r.status, 404);
r = await workerModule.fetch(new Request("https://x.dev/"), { ASSETS: mockAssets });
assert.equal(await r.text(), "STATIC_APP");
console.log("✓ worker: API and static-asset routes are correctly dispatched");

console.log("\nAll function and Worker tests passed.");
