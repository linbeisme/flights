import assert from "node:assert/strict";
import fs from "node:fs";
import { roundTripDatePairs, buildRoundTripCombinations } from "./src/api/roundTrip.js";
import { cashSearchDates } from "./src/api/flightApi.js";
import { onRequest as cashFareWorker } from "./functions/api/cashfare.js";

let passed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { passed += 1; console.log(`PASS ${name}`); })
    .catch((error) => { console.error(`FAIL ${name}`); throw error; });
}

await test("whole-trip ±3 shifts both dates together and preserves trip length", () => {
  const pairs = roundTripDatePairs("2026-10-10", "2026-10-20", 3);
  assert.equal(pairs.length, 7);
  assert.deepEqual(pairs[0], { shift: -3, outboundDate: "2026-10-07", returnDate: "2026-10-17", key: "2026-10-07|2026-10-17" });
  assert.deepEqual(pairs[6], { shift: 3, outboundDate: "2026-10-13", returnDate: "2026-10-23", key: "2026-10-13|2026-10-23" });
});

await test("round-trip flexibility rejects unsupported ±7 expansion", () => {
  assert.equal(roundTripDatePairs("2026-10-10", "2026-10-20", 7).length, 1);
  assert.equal(roundTripDatePairs("2026-10-20", "2026-10-10", 0).length, 0);
});

await test("legacy one-way ±7 behavior is unchanged", () => {
  assert.equal(cashSearchDates("2026-10-10", 7).length, 15);
  assert.equal(cashSearchDates("2026-10-10", 3).length, 7);
});

const outbound = {
  id: "out-1", origin: "LAX", destination: "TPE", date: "2026-10-10", cabin: "business",
  program: "aeroplan", programLabel: "Aeroplan", points: 70000, taxesUsd: 50, economicCost: 1050,
  seats: 2, flightNumbers: "BR5", carriers: ["BR"], stops: 0, totalMinutes: 840,
};
const sameReturn = {
  id: "ret-1", origin: "TPE", destination: "LAX", date: "2026-10-20", cabin: "business",
  program: "aeroplan", programLabel: "Aeroplan", points: 70000, taxesUsd: 50, economicCost: 1050,
  seats: 3, flightNumbers: "BR6", carriers: ["BR"], stops: 0, totalMinutes: 720,
};
const splitReturn = {
  ...sameReturn, id: "ret-2", program: "united", programLabel: "United MileagePlus", points: 80000, economicCost: 1200,
};
const cashRows = [{
  id: "cash-rt", cabin: "business", datePairKey: "2026-10-10|2026-10-20", price: 5000, currency: "USD",
  outboundFlightNumbers: ["BR5"], returnFlightNumbers: ["BR6"],
  outbound: { carrierCodes: ["BR"], stops: 0 }, return: { carrierCodes: ["BR"], stops: 0 },
}];

await test("same-program combination calculates combined points, CPP, economic cost, seats, and disclosure", () => {
  const result = buildRoundTripCombinations({ outboundRows: [outbound], returnRows: [sameReturn], cashRows, pax: 2 });
  assert.equal(result.sameProgram.length, 1);
  const combo = result.sameProgram[0];
  assert.equal(combo.totalPoints, 140000);
  assert.equal(combo.taxesUsd, 100);
  assert.equal(combo.economicCost, 2100);
  assert.equal(combo.savingsVsCash, 2900);
  assert.ok(Math.abs(combo.cpp - 3.5) < 1e-9);
  assert.equal(combo.seats, 2);
  assert.equal(combo.cashMatchType, "exact-round-trip-itinerary");
  assert.equal(combo.separateReservations, true);
  assert.equal(combo.bookingStructure, "two-one-way-same-program");
});

await test("split-program combination keeps point currencies separate and does not blend CPP", () => {
  const result = buildRoundTripCombinations({ outboundRows: [outbound], returnRows: [splitReturn], cashRows, pax: 1 });
  assert.equal(result.splitProgram.length, 1);
  const combo = result.splitProgram[0];
  assert.equal(combo.totalPoints, null);
  assert.equal(combo.cpp, null);
  assert.deepEqual(combo.pointBreakdown, { aeroplan: 70000, united: 80000 });
  assert.equal(combo.economicCost, 2250);
  assert.equal(combo.separateReservations, true);
  assert.equal(combo.bookingStructure, "two-one-way-split-program");
});

await test("seat requirement applies to both directions", () => {
  const result = buildRoundTripCombinations({ outboundRows: [{ ...outbound, seats: 1 }], returnRows: [sameReturn], cashRows, pax: 2 });
  assert.equal(result.sameProgram.length, 0);
});

await test("Worker validates exact round-trip dates before provider calls", async () => {
  let called = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { called = true; throw new Error("should not call"); };
  try {
    const response = await cashFareWorker({
      request: new Request("https://app.test/api/cashfare?origin=LAX&destination=TPE&date=2026-10-20&returnDate=2026-10-10&tripType=roundtrip&cabin=business&list=1"),
      env: { SERPAPI_KEY: "test" },
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /after/);
    assert.equal(called, false);
  } finally { globalThis.fetch = originalFetch; }
});

await test("Worker uses true SerpApi round-trip flow with departure-token return lookup", async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const parsed = new URL(url);
    calls.push(parsed);
    if (!parsed.searchParams.has("departure_token")) {
      return new Response(JSON.stringify({ best_flights: [{
        price: 4800,
        departure_token: "token-out-1",
        total_duration: 840,
        flights: [{ airline: "EVA Air", flight_number: "BR 5", departure_airport: { time: "2026-10-10 12:30" }, arrival_airport: { time: "2026-10-11 17:30" } }],
        layovers: [],
      }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ best_flights: [{
      price: 5000,
      total_duration: 720,
      flights: [{ airline: "EVA Air", flight_number: "BR 6", departure_airport: { time: "2026-10-20 23:40" }, arrival_airport: { time: "2026-10-20 20:10" } }],
      layovers: [],
    }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const response = await cashFareWorker({
      request: new Request("https://app.test/api/cashfare?origin=LAX&destination=TPE&date=2026-10-10&returnDate=2026-10-20&tripType=roundtrip&cabin=business&adults=2&list=1"),
      env: { SERPAPI_KEY: "test" },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.source, "serpapi");
    assert.equal(body.tripType, "roundtrip");
    assert.equal(body.providerRequests, 2);
    assert.equal(body.flights.length, 1);
    assert.deepEqual(body.flights[0].outboundFlightNumbers, ["BR5"]);
    assert.deepEqual(body.flights[0].returnFlightNumbers, ["BR6"]);
    assert.equal(body.flights[0].price, 5000);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].searchParams.get("type"), "1");
    assert.equal(calls[0].searchParams.get("return_date"), "2026-10-20");
    assert.equal(calls[0].searchParams.get("travel_class"), "3");
    assert.equal(calls[0].searchParams.get("adults"), "2");
    assert.equal(calls[1].searchParams.get("departure_token"), "token-out-1");
  } finally { globalThis.fetch = originalFetch; }
});

await test("one-way Worker request remains type=2", async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(new URL(url));
    return new Response(JSON.stringify({ best_flights: [{
      price: 900,
      total_duration: 300,
      flights: [{ airline: "Example Air", flight_number: "EX 10", departure_airport: { time: "2026-10-10 08:00" }, arrival_airport: { time: "2026-10-10 13:00" } }],
      layovers: [],
    }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const response = await cashFareWorker({
      request: new Request("https://app.test/api/cashfare?origin=LAX&destination=JFK&date=2026-10-10&cabin=economy&list=1"),
      env: { SERPAPI_KEY: "test" },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.tripType, "oneway");
    assert.equal(body.flights.length, 1);
    assert.equal(calls[0].searchParams.get("type"), "2");
    assert.equal(calls[0].searchParams.has("return_date"), false);
  } finally { globalThis.fetch = originalFetch; }
});

await test("UI source retains explicit constraints and separate-reservation disclosure", () => {
  const routeUi = fs.readFileSync("src/components/RouteManager.jsx", "utf8");
  const cashUi = fs.readFileSync("src/components/CashFares.jsx", "utf8");
  const resultsUi = fs.readFileSync("src/components/RoundTripResults.jsx", "utf8");
  const appUi = fs.readFileSync("src/App.jsx", "utf8");
  assert.match(routeUi, /Maximum flexibility is ±3 days/);
  assert.match(cashUi, /Round-trip cash fares allow exactly one cabin at a time/);
  assert.match(resultsUi, /Two separate one-way awards/);
  assert.match(resultsUi, /Not combined across programs/);
  assert.match(resultsUi, /per traveler/);
  assert.match(appUi, /adults: 1/);
});

console.log(`\n${passed} round-trip v11.4.0 tests passed.`);
