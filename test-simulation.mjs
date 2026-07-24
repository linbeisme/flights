// test-simulation.mjs — end-to-end simulation of the LIVE pipeline.
// This harness mocks the
// network layer (global.fetch) with realistic seats.aero Partner API
// and /api/cashfare payloads, then runs the REAL searchAwards code
// path and verifies every normalized field the UI depends on.
import assert from "node:assert";
import { searchAwards, searchCashFares, applyFilters, DEFAULT_FILTERS, computeCPP, applyCashFilters, CASH_FILTERS, hasDemoData } from "./src/api/flightApi.js";

let n = 0;
const test = (name, fn) => { fn(); n++; console.log("✓", name); };

// ── Canned upstream payloads ─────────────────────────────────────────
const AV1 = {
  ID: "av-united-0901", Source: "united", Date: "2026-09-01",
  Route: { OriginAirport: "TPE", DestinationAirport: "NRT", Source: "united" },
  YAvailable: true, WAvailable: false, JAvailable: true, FAvailable: false,
  YMileageCost: "22000", JMileageCost: "70000",
  YTotalTaxes: 3150, JTotalTaxes: 6200, YDirect: true, JDirect: false,
};
const AV2 = {
  ID: "av-turkish-0902", Source: "turkish", Date: "2026-09-02",
  Route: { OriginAirport: "TPE", DestinationAirport: "NRT", Source: "turkish" },
  YAvailable: false, WAvailable: false, JAvailable: true, FAvailable: false,
  JMileageCost: "91500", JTotalTaxes: 21100, JDirect: false,
};
const AV_IGNORED = { // program the search didn't ask for → must be filtered out
  ID: "av-delta-0901", Source: "delta", Date: "2026-09-01",
  Route: { OriginAirport: "TPE", DestinationAirport: "NRT", Source: "delta" },
  YAvailable: true, YMileageCost: "30000", YTotalTaxes: 4000, YDirect: true,
};

const TRIPS_UNITED = { data: [
  { ID: "trip-ua-1", Cabin: "business", MileageCost: 70000, TotalTaxes: 6200,
    Carriers: "UA, NH", FlightNumbers: "UA838, NH820", Stops: 1,
    DepartsAt: "2026-09-01T08:30:00Z", ArrivesAt: "2026-09-01T15:41:00Z",
    TotalDuration: 431, RemainingSeats: 2,
    AvailabilitySegments: [
      { OriginAirport: "TPE", DestinationAirport: "ICN", DepartsAt: "2026-09-01T08:30:00Z", ArrivesAt: "2026-09-01T11:00:00Z" },
      { OriginAirport: "ICN", DestinationAirport: "NRT", DepartsAt: "2026-09-01T13:20:00Z", ArrivesAt: "2026-09-01T15:41:00Z" },
    ]},
  { ID: "trip-ua-2", Cabin: "economy", MileageCost: 22000, TotalTaxes: 3150,
    Carriers: "UA", FlightNumbers: "UA838", Stops: 0,
    DepartsAt: "2026-09-01T10:10:00Z", ArrivesAt: "2026-09-01T13:37:00Z",
    TotalDuration: 207, RemainingSeats: 6, AvailabilitySegments: [
      { OriginAirport: "TPE", DestinationAirport: "NRT", DepartsAt: "2026-09-01T10:10:00Z", ArrivesAt: "2026-09-01T13:37:00Z" },
    ]},
]};
const TRIPS_TURKISH = { data: [
  { ID: "trip-tk-1", Cabin: "business", MileageCost: 91500, TotalTaxes: 21100,
    Carriers: "TK", FlightNumbers: "TK25, TK198", Stops: 1,
    DepartsAt: "2026-09-02T21:45:00Z", ArrivesAt: "2026-09-03T17:25:00Z",
    TotalDuration: 1180, RemainingSeats: 1, AvailabilitySegments: [
      { OriginAirport: "TPE", DestinationAirport: "IST", DepartsAt: "2026-09-02T21:45:00Z", ArrivesAt: "2026-09-03T04:55:00Z" },
      { OriginAirport: "IST", DestinationAirport: "NRT", DepartsAt: "2026-09-03T01:40:00Z", ArrivesAt: "2026-09-03T17:25:00Z" },
    ]},
]};

// ── fetch mock: routes URLs to canned payloads, records calls ───────
const calls = [];
globalThis.fetch = async (url) => {
  calls.push(url);
  const u = new URL(url);
  const ok = (obj) => new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json" } });
  if (u.pathname === "/api/search" && u.searchParams.get("trips")) {
    const id = u.searchParams.get("trips");
    if (id === "av-united-0901") return ok(TRIPS_UNITED);
    if (id === "av-turkish-0902") return ok(TRIPS_TURKISH);
    return ok({ data: [] });
  }
  if (u.pathname === "/api/search") {
    return ok({ data: [AV1, AV2, AV_IGNORED], count: 3 });
  }
  if (u.pathname === "/api/cashfare" && u.searchParams.get("list") === "1") {
    const cabin = u.searchParams.get("cabin");
    const date = u.searchParams.get("date");
    const destination = u.searchParams.get("destination");
    if (destination === "NRT" && cabin === "business") {
      const exact = date === "2026-09-01"
        ? { id: "gf-ua", price: 2898, departTime: "08:30", arriveTime: "15:41", totalMinutes: 431, stops: 1, carriers: ["United", "ANA"], carrierCodes: ["UA", "NH"], flightNumbers: ["UA838", "NH820"], connections: ["ICN"], layovers: [140] }
        : { id: "gf-tk", price: 2898, departTime: "21:45", arriveTime: "17:25", totalMinutes: 1180, stops: 1, carriers: ["Turkish Airlines"], carrierCodes: ["TK"], flightNumbers: ["TK25", "TK198"], connections: ["IST"], layovers: [165] };
      return ok({ source: "serpapi", currency: "USD", benchmarkPrice: 3050, benchmarkMethod: "median", scope: "route-date-cabin", flights: [exact] });
    }
    if (destination === "NRT" && cabin === "economy") {
      return ok({ source: "unavailable", currency: "USD", benchmarkPrice: null, benchmarkMethod: null, scope: "route-date-cabin", flights: [], reason: "No priced live flights were returned" });
    }
    if (cabin === "economy") {
      return ok({ source: "serpapi", currency: "USD", benchmarkPrice: 151, benchmarkMethod: "median", scope: "route-date-cabin", flights: [
        { id: "gf-0", price: 207, departTime: "07:30", arriveTime: "11:55", totalMinutes: 265, stops: 0, carriers: ["EVA Air"], carrierCodes: ["BR"], flightNumbers: ["BR225"], connections: [], layovers: [] },
        { id: "gf-1", price: 95,  departTime: "01:35", arriveTime: "06:00", totalMinutes: 265, stops: 0, carriers: ["Scoot"], carrierCodes: ["TR"], flightNumbers: ["TR897"], connections: [], layovers: [] },
        { id: "gf-2", price: 151, departTime: "03:15", arriveTime: "00:10", totalMinutes: 1255, stops: 1, carriers: ["Cebu Pacific"], carrierCodes: ["5J"], flightNumbers: ["5J311", "5J803"], connections: ["MNL"], layovers: [870] },
      ]});
    }
    return ok({ source: "unavailable", currency: "USD", benchmarkPrice: null, benchmarkMethod: null, scope: "route-date-cabin", flights: [], reason: "No priced live flights were returned" });
  }
  if (u.pathname === "/api/cashfare") {
    const cabin = u.searchParams.get("cabin");
    // business → live SerpApi fare; other cabins remain unavailable.
    if (cabin === "business") return ok({ price: 2898, currency: "USD", source: "serpapi" });
    return ok({ price: null, currency: "USD", source: "unavailable" });
  }
  throw new Error(`Unexpected URL in simulation: ${url}`);
};

// ── Run the real pipeline ────────────────────────────────────────────
const results = await searchAwards({
  proxyBase: "https://sim.example",
  origin: "TPE",
  destination: "NRT",
  date: "2026-09-01",
  programIds: ["united", "turkish"], // delta intentionally excluded
  flex: 1,
});

test("Simulation: date window ±1 forwarded to seats.aero as start/end", () => {
  const searchCall = calls.find((c) => c.includes("origin_airport=TPE"));
  assert.ok(searchCall.includes("start_date=2026-08-31"), searchCall);
  assert.ok(searchCall.includes("end_date=2026-09-02"), searchCall);
  assert.ok(searchCall.includes("sources=united,turkish"));
});

test("Simulation: 3 trip-level itineraries normalized; excluded program dropped", () => {
  assert.strictEqual(results.length, 3);
  assert.ok(results.every((r) => ["united", "turkish"].includes(r.program)));
  assert.ok(!results.some((r) => r.program === "delta"));
});

test("Simulation: operating carriers parsed from trip data", () => {
  const uaJ = results.find((r) => r.id === "trip-ua-1");
  assert.deepStrictEqual(uaJ.carriers, ["UA", "NH"]);
  const tk = results.find((r) => r.id === "trip-tk-1");
  assert.deepStrictEqual(tk.carriers, ["TK"]);
});

test("Simulation: exact live cash matches and unavailable fares stay distinct", () => {
  const biz = results.filter((r) => r.cabin === "business");
  assert.ok(biz.length === 2 && biz.every((r) => r.cashSource === "live" && r.cash === 2898));
  assert.ok(biz.every((r) => r.cashMatchType === "exact-itinerary"));
  const eco = results.find((r) => r.cabin === "economy");
  assert.strictEqual(eco.cashSource, "unavailable");
  assert.strictEqual(eco.cashMatchType, "unavailable");
  assert.strictEqual(eco.cash, null);
  assert.strictEqual(eco.cpp, null);
});

test("Simulation: connections, layovers, times, seats, taxes normalized", () => {
  const uaJ = results.find((r) => r.id === "trip-ua-1");
  assert.deepStrictEqual(uaJ.connections, ["ICN"]);
  assert.deepStrictEqual(uaJ.layovers, [140]); // 11:00 → 13:20
  assert.strictEqual(uaJ.departTime, "08:30");
  assert.strictEqual(uaJ.arriveTime, "15:41");
  assert.strictEqual(uaJ.stops, 1);
  assert.strictEqual(uaJ.seats, 2);
  assert.strictEqual(uaJ.taxes, 62); // 6200 minor units → $62
  assert.strictEqual(uaJ.date, "2026-09-01");
  const tk = results.find((r) => r.id === "trip-tk-1");
  assert.strictEqual(tk.date, "2026-09-02"); // row keeps its own date in the window
});

test("Simulation: CPP computed with the exact formula on live numbers", () => {
  const uaJ = results.find((r) => r.id === "trip-ua-1");
  assert.strictEqual(uaJ.cpp, computeCPP(2898, 62, 70000));
  assert.ok(Math.abs(uaJ.cpp - ((2898 - 62) / 70000) * 100) < 1e-9);
});

test("Simulation: cumulative stops filter — '1' includes direct, '2+' includes all", () => {
  const direct = applyFilters(results, { ...DEFAULT_FILTERS, stops: "0" });
  assert.ok(direct.every((r) => r.stops === 0) && direct.length === 1);
  const upTo1 = applyFilters(results, { ...DEFAULT_FILTERS, stops: "1" });
  assert.strictEqual(upTo1.length, 3); // the nonstop AND both 1-stops
  assert.ok(upTo1.some((r) => r.stops === 0), "'1 stop' includes direct");
  const all = applyFilters(results, { ...DEFAULT_FILTERS, stops: "2+" });
  assert.strictEqual(all.length, 3); // 2+ admits direct and 1-stop too
});

test("Simulation: all six sort orders hold on live-shaped data", () => {
  const ck = (sorted, key) => {
    for (let i = 1; i < sorted.length; i++) assert.ok(key(sorted[i - 1], sorted[i]), `sort violated at ${i}`);
  };
  ck(applyFilters(results, { ...DEFAULT_FILTERS, sort: "cpp" }), (a, b) => (a.cpp ?? -1) >= (b.cpp ?? -1));
  ck(applyFilters(results, { ...DEFAULT_FILTERS, sort: "duration" }), (a, b) => a.totalMinutes <= b.totalMinutes);
  const sum = (r) => r.layovers.reduce((x, y) => x + y, 0);
  ck(applyFilters(results, { ...DEFAULT_FILTERS, sort: "layover" }), (a, b) => sum(a) <= sum(b));
  ck(applyFilters(results, { ...DEFAULT_FILTERS, sort: "taxes" }), (a, b) => a.taxes <= b.taxes);
  ck(applyFilters(results, { ...DEFAULT_FILTERS, sort: "stops" }), (a, b) => a.stops <= b.stops);
  ck(applyFilters(results, { ...DEFAULT_FILTERS, sort: "points" }), (a, b) => a.points <= b.points);
});

test("Simulation: passenger seat filter works on live seat counts", () => {
  const pax3 = applyFilters(results, { ...DEFAULT_FILTERS, pax: 3 });
  assert.ok(pax3.every((r) => r.seats == null || r.seats >= 3));
  assert.ok(!pax3.some((r) => r.id === "trip-tk-1"), "1-seat TK row hidden at 3 pax");
});

// ── Cash Fares tab pipeline (Option A) ──────────────────────────────
const cashRows = await searchCashFares({
  proxyBase: "https://sim.example",
  origin: "TPE", destination: "SIN", date: "2026-09-15",
  cabins: ["economy", "first"],
});

test("Cash tab: rows sorted by price across cabins, cheapest first", () => {
  assert.strictEqual(cashRows.length, 3);
  for (let i = 1; i < cashRows.length; i++) assert.ok(cashRows[i - 1].price <= cashRows[i].price);
  assert.strictEqual(cashRows[0].price, 95);
});

test("Cash tab: only live rows are returned; unavailable cabins add no synthetic row", () => {
  const eco = cashRows.filter((r) => r.cabin === "economy");
  assert.strictEqual(eco.length, 3);
  assert.ok(eco.every((r) => r.source === "live"));
  assert.equal(cashRows.some((r) => r.cabin === "first"), false);
});

test("Cash tab: schedule fields, connections, and departMin normalized", () => {
  const cebu = cashRows.find((r) => r.carriers.includes("Cebu Pacific"));
  assert.deepStrictEqual(cebu.connections, ["MNL"]);
  assert.strictEqual(cebu.stops, 1);
  assert.strictEqual(cebu.departMin, 3 * 60 + 15);
  const eva = cashRows.find((r) => r.carriers.includes("EVA Air"));
  assert.strictEqual(eva.departTime, "07:30");
  assert.strictEqual(eva.totalMinutes, 265);
});

test("Cash tab: network failure returns no synthetic cash rows", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("network down"); };
  const rows = await searchCashFares({
    proxyBase: "https://sim.example", origin: "TPE", destination: "SIN",
    date: "2026-09-15", cabins: ["business"],
  });
  globalThis.fetch = realFetch;
  assert.deepStrictEqual(rows, []);
});

test("Cash tab v9: arrival minutes and layover durations normalized", () => {
  const cebu = cashRows.find((r) => r.carriers.includes("Cebu Pacific"));
  assert.strictEqual(cebu.arriveMin, 10); // 00:10
  assert.deepStrictEqual(cebu.layovers, [870]);
  const eva = cashRows.find((r) => r.carriers.includes("EVA Air"));
  assert.strictEqual(eva.arriveMin, 11 * 60 + 55);
  assert.deepStrictEqual(eva.layovers, []);
});

test("Cash tab v9: full filter suite works on live-shaped rows", () => {
  const byAirline = applyCashFilters(cashRows, { ...CASH_FILTERS, airlines: ["EVA Air"] });
  assert.ok(byAirline.length === 1 && byAirline[0].carriers.includes("EVA Air"));
  const direct = applyCashFilters(cashRows, { ...CASH_FILTERS, stops: "0" });
  assert.ok(direct.every((r) => r.stops === 0) && direct.length === 2);
  const viaMnl = applyCashFilters(cashRows, { ...CASH_FILTERS, connections: "MNL" });
  assert.strictEqual(viaMnl.length, 1);
  const shortTrips = applyCashFilters(cashRows, { ...CASH_FILTERS, totalMaxH: "10" });
  assert.ok(shortTrips.every((r) => r.totalMinutes <= 600));
  const longLayover = applyCashFilters(cashRows, { ...CASH_FILTERS, layoverMinH: "10" });
  assert.deepStrictEqual(longLayover.map((r) => r.carriers[0]), ["Cebu Pacific"]);
  const morningDep = applyCashFilters(cashRows, { ...CASH_FILTERS, depWindow: [6, 12] });
  assert.ok(morningDep.every((r) => r.departMin >= 360 && r.departMin <= 720));
});

test("Data-integrity guard: live pipelines never trip the red flag", () => {
  assert.strictEqual(hasDemoData(results), false);
  assert.strictEqual(hasDemoData(cashRows), false);
  assert.strictEqual(hasDemoData([...results, { ...results[0], id: "fake", demo: true }]), true);
});

console.log(`\nSimulation complete: all ${n} scenario groups passed against the real live pipeline.`);
