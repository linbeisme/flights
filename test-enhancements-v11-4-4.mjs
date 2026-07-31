import assert from "node:assert/strict";
import fs from "node:fs";
import { connectionLayoverDetails } from "./src/api/flightApi.js";
import { buildCppLibrary, cppLibraryToDocument } from "./src/api/cppLibrary.js";
import { onRequest as bookingHandler } from "./functions/api/booking.js";
import { onRequest as cashFareHandler } from "./functions/api/cashfare.js";

const cashUi = fs.readFileSync("src/components/CashFares.jsx", "utf8");
const roundTripUi = fs.readFileSync("src/components/RoundTripResults.jsx", "utf8");
const cppUi = fs.readFileSync("src/components/CppReferencePanel.jsx", "utf8");
const cppApi = fs.readFileSync("src/api/cppLibrary.js", "utf8");
const worker = fs.readFileSync("worker/index.js", "utf8");
const headers = fs.readFileSync("public/_headers", "utf8");

assert.deepEqual(connectionLayoverDetails(["NRT", "HKG"], [125, 90]), [
  { airport: "NRT", minutes: 125, label: "NRT (2h 05m)" },
  { airport: "HKG", minutes: 90, label: "HKG (1h 30m)" },
]);
assert.equal(connectionLayoverDetails(["ICN"], [null])[0].label, "ICN (layover unavailable)");

assert.match(cashUi, /sm:col-span-2 xl:col-span-2 2xl:col-span-2/);
assert.match(cashUi, /grid grid-cols-2 gap-1 sm:grid-cols-4/);
assert.match(cashUi, /connectionLayoverDetails\(f\.connections, f\.layovers\)/);
assert.match(cashUi, /BookingOptions/);
assert.match(roundTripUi, /connectionLayoverDetails\(leg\.connections, leg\.layovers\)/);
assert.match(cppUi, /Edit CPP manually/);
assert.match(cppUi, /Export JSON/);
assert.match(cppUi, /Import JSON/);
assert.match(cppApi, /pointsboard\.cpp-overrides\.v1/);
assert.match(worker, /\/api\/booking/);
assert.match(headers, /form-action 'self' https:\/\/www\.google\.com/);

const library = buildCppLibrary({
  schema: "partner-redemption-comparator.cpp-library.v2",
  source: "Manual test",
  asOf: "2026-07-31",
  cppLibrary: [
    { programId: "aeroplan", program: "Air Canada Aeroplan", type: "Airline", cpp: 1.6, source: "Manual test", asOf: "2026-07-31" },
  ],
});
const document = cppLibraryToDocument(library);
assert.equal(document.cppLibrary[0].cpp, 1.6);
assert.equal(buildCppLibrary(document).map.aeroplan.cpp, 1.6);

{
  const originalFetch = globalThis.fetch;
  let calledUrl = null;
  globalThis.fetch = async (url) => {
    calledUrl = new URL(url);
    return new Response(JSON.stringify({
      booking_options: [{
        together: {
          book_with: "Example Air",
          airline: true,
          price: 742,
          option_title: "Economy",
          booking_request: { url: "https://www.google.com/travel/clk/f", post_data: "u=test-value" },
        },
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const response = await bookingHandler({
      request: new Request("https://app.test/api/booking?bookingToken=ABCDEFGHIJKL1234567890"),
      env: { SERPAPI_KEY: "test-key" },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.bookingOptions.length, 1);
    assert.equal(body.bookingOptions[0].bookWith, "Example Air");
    assert.equal(body.bookingOptions[0].bookingRequest.url, "https://www.google.com/travel/clk/f");
    assert.equal(calledUrl.searchParams.get("engine"), "google_flights");
    assert.equal(calledUrl.searchParams.get("booking_token"), "ABCDEFGHIJKL1234567890");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    search_metadata: { google_flights_url: "https://www.google.com/travel/flights/example" },
    best_flights: [{
      price: 742,
      booking_token: "BOOKINGTOKEN1234567890",
      total_duration: 300,
      flights: [
        { airline: "Japan Airlines", flight_number: "JL 1", departure_airport: { time: "2027-03-10 08:00" }, arrival_airport: { time: "2027-03-10 12:00" } },
        { airline: "Japan Airlines", operating_airline: "ZIPAIR", flight_number: "JL 2", departure_airport: { time: "2027-03-10 14:05" }, arrival_airport: { time: "2027-03-10 17:00" } },
      ],
      layovers: [{ id: "NRT", duration: 125 }],
    }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const response = await cashFareHandler({
      request: new Request("https://app.test/api/cashfare?origin=LAX&destination=TPE&date=2027-03-10&cabin=economy&list=1"),
      env: { SERPAPI_KEY: "test-key" },
    });
    const body = await response.json();
    assert.equal(body.flights[0].bookingToken, "BOOKINGTOKEN1234567890");
    assert.equal(body.flights[0].searchUrl, "https://www.google.com/travel/flights/example");
    assert.deepEqual(body.flights[0].connections, ["NRT"]);
    assert.deepEqual(body.flights[0].layovers, [125]);
    assert.deepEqual(body.flights[0].operatingCarriers, ["ZIPAIR"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log("✓ v11.4.4 filter alignment, exact booking options, airport-specific layovers, and no-cost manual CPP controls passed");
