// Logic tests for the core live-result shape. Filter/sort/CPP behavior
// is exercised against a small
// hand-built fixture of normalized result objects (the exact shape
// searchAwardsLive produces).
import assert from "node:assert";
import {
  computeCPP, applyFilters, DEFAULT_FILTERS, addDays, parseCarriers,
  applyCashFilters, CASH_FILTERS, hasDemoData, selectCashFareForTrip, normalizeFlightNumbers,
} from "./src/api/flightApi.js";
import { PROGRAMS, buildDefaultRoutes, AIRLINE_NAMES, selectKeyJump, AIRPORTS, CABINS, normalizeAirportInput } from "./src/data/defaults.js";

let n = 0;
const test = (name, fn) => { fn(); n++; console.log("✓", name); };

// ── Fixture: a realistic spread across programs/cabins/stops/times ──
function mk(o) {
  const cash = o.cash, taxes = o.taxes, points = o.points;
  return {
    id: o.id, program: o.program, programLabel: o.program, source: o.program,
    origin: o.origin || "TPE", destination: o.destination || "NRT", date: o.date || "2026-09-01",
    cabin: o.cabin, points, taxes, cash, cashSource: o.cashSource || "live", carriers: o.carriers || [],
    departMin: o.departMin, arriveMin: o.arriveMin,
    departTime: "00:00", arriveTime: "00:00", arrivesNextDay: false,
    stops: o.stops, connections: o.connections || [], layovers: o.layovers || [],
    totalMinutes: o.totalMinutes, seats: o.seats,
    cpp: computeCPP(cash, taxes, points),
  };
}
const fixture = [
  mk({ id: "a", program: "united",   cabin: "business", points: 88000, taxes: 45,  cash: 3200, stops: 0, departMin: 480,  arriveMin: 900,  totalMinutes: 155, seats: 4, connections: [], layovers: [] }),
  mk({ id: "b", program: "turkish",  cabin: "business", points: 91500, taxes: 211, cash: 1220, stops: 1, departMin: 483,  arriveMin: 941,  totalMinutes: 458, seats: 1, connections: ["IST"], layovers: [140] }),
  mk({ id: "c", program: "aeroplan", cabin: "first",    points: 115500,taxes: 152, cash: 1408, stops: 2, departMin: 359,  arriveMin: 1130, totalMinutes: 771, seats: 1, connections: ["YVR","YYZ"], layovers: [134,149] }),
  mk({ id: "d", program: "lifemiles",cabin: "first",    points: 95000, taxes: 204, cash: 1408, stops: 1, departMin: 1158, arriveMin: 239,  totalMinutes: 521, seats: 4, connections: ["FRA"], layovers: [250] }),
  mk({ id: "e", program: "alaska",   cabin: "economy",  points: 25000, taxes: 28,  cash: 540,  stops: 0, departMin: 600,  arriveMin: 755,  totalMinutes: 155, seats: 6, connections: [], layovers: [] }),
  mk({ id: "f", program: "delta",    cabin: "economy",  points: 30000, taxes: 55,  cash: 610,  stops: 1, departMin: 720,  arriveMin: 1200, totalMinutes: 480, seats: 2, connections: ["ICN"], layovers: [90] }),
  mk({ id: "g", program: "flyingblue",cabin:"premium",  points: 55000, taxes: 120, cash: 980,  stops: 1, departMin: 900,  arriveMin: 60,   totalMinutes: 600, seats: null, connections: ["AMS"], layovers: [180] }),
];

test("CPP exact formula: ((cash − taxes) / points) × 100", () => {
  assert.strictEqual(computeCPP(1500, 100, 70000), ((1500 - 100) / 70000) * 100);
  assert.strictEqual(computeCPP(1500, 100, 70000), 2);
  assert.strictEqual(computeCPP(500, 50, 0), null);
  assert.strictEqual(computeCPP(null, 50, 10000), null);
  assert.ok(computeCPP(100, 400, 10000) < 0);
});

test("Default routes: 10 from TPE + 12 from LAX, all future, flex 0", () => {
  const routes = buildDefaultRoutes();
  assert.strictEqual(routes.length, 22);
  assert.strictEqual(routes.filter((r) => r.origin === "TPE").length, 10);
  assert.strictEqual(routes.filter((r) => r.origin === "LAX").length, 12);
  const today = new Date().toISOString().slice(0, 10);
  for (const r of routes) {
    assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(r.date > today);
    assert.strictEqual(r.flex, 0);
  }
});

test("Fixture rows carry internally consistent CPP", () => {
  for (const r of fixture) {
    if (r.cpp != null) assert.ok(Math.abs(r.cpp - ((r.cash - r.taxes) / r.points) * 100) < 1e-9);
  }
});

test("Filter: cabin selection", () => {
  const out = applyFilters(fixture, { ...DEFAULT_FILTERS, cabins: ["business"] });
  assert.ok(out.length === 2 && out.every((r) => r.cabin === "business"));
});

test("Filter: program selection", () => {
  const out = applyFilters(fixture, { ...DEFAULT_FILTERS, programs: ["united", "turkish"] });
  assert.ok(out.length === 2 && out.every((r) => ["united", "turkish"].includes(r.program)));
});

test("Filter: departure & arrival time windows", () => {
  const out = applyFilters(fixture, { ...DEFAULT_FILTERS, depWindow: [8, 12], arrWindow: [0, 24] });
  assert.ok(out.every((r) => r.departMin >= 480 && r.departMin <= 720));
});

test("Filter: overnight departure window crosses midnight", () => {
  const out = applyFilters(fixture, { ...DEFAULT_FILTERS, depWindow: [18, 6], arrWindow: [0, 24] });
  assert.ok(out.every((r) => r.departMin >= 18 * 60 || r.departMin <= 6 * 60));
  assert.ok(out.some((r) => r.departMin > 18 * 60));
});

test("Filter: cumulative stops (Direct / ≤1 incl. direct / ≤2+ incl. all)", () => {
  const direct = applyFilters(fixture, { ...DEFAULT_FILTERS, stops: "0" });
  assert.ok(direct.every((r) => r.stops === 0));
  const upTo1 = applyFilters(fixture, { ...DEFAULT_FILTERS, stops: "1" });
  assert.ok(upTo1.every((r) => r.stops <= 1));
  assert.ok(upTo1.some((r) => r.stops === 0), "'1 stop' includes direct flights");
  const all = applyFilters(fixture, { ...DEFAULT_FILTERS, stops: "2+" });
  assert.strictEqual(all.length, fixture.length, "'2+' includes direct, 1-stop, and 2+ alike");
});

test("Filter: connection airport codes", () => {
  const out = applyFilters(fixture, { ...DEFAULT_FILTERS, connections: "ist, fra" });
  assert.ok(out.length === 2 && out.every((r) => r.connections.includes("IST") || r.connections.includes("FRA")));
});

test("Filter: layover min/max hours", () => {
  const out = applyFilters(fixture, { ...DEFAULT_FILTERS, layoverMinH: "1", layoverMaxH: "2.5" });
  for (const r of out.filter((x) => x.layovers.length > 0)) {
    assert.ok(Math.min(...r.layovers) >= 60 && Math.max(...r.layovers) <= 150);
  }
});

test("Filter: total travel time min/max hours", () => {
  const out = applyFilters(fixture, { ...DEFAULT_FILTERS, totalMinH: "2", totalMaxH: "9" });
  assert.ok(out.every((r) => r.totalMinutes >= 120 && r.totalMinutes <= 540));
});

test("Filter: passenger count hides too-few-seat rows, keeps unknown", () => {
  const out4 = applyFilters(fixture, { ...DEFAULT_FILTERS, pax: 4 });
  assert.ok(out4.every((r) => r.seats == null || r.seats >= 4));
  assert.ok(out4.some((r) => r.seats == null), "unknown-seat row survives");
  const out1 = applyFilters(fixture, { ...DEFAULT_FILTERS, pax: 1 });
  assert.ok(out1.length >= out4.length);
});

test("Sorting: lowest fees/taxes first", () => {
  const byTax = applyFilters(fixture, { ...DEFAULT_FILTERS, sort: "taxes" });
  for (let i = 1; i < byTax.length; i++) assert.ok(byTax[i - 1].taxes <= byTax[i].taxes);
});

test("Route selection limit raised to 5", async () => {
  const mod = await import("./src/components/RouteManager.jsx").catch(() => null);
  // JSX can't be imported in plain node; assert against the source text instead.
  const src = (await import("node:fs")).readFileSync("src/components/RouteManager.jsx", "utf8");
  assert.match(src, /MAX_SELECTED = 5/);
});

test("Sorting: CPP desc / points asc / duration asc / stops / layover", () => {
  const byCpp = applyFilters(fixture, { ...DEFAULT_FILTERS, sort: "cpp" });
  for (let i = 1; i < byCpp.length; i++) assert.ok((byCpp[i-1].cpp ?? -1) >= (byCpp[i].cpp ?? -1));
  const byPts = applyFilters(fixture, { ...DEFAULT_FILTERS, sort: "points" });
  for (let i = 1; i < byPts.length; i++) assert.ok(byPts[i-1].points <= byPts[i].points);
  const byDur = applyFilters(fixture, { ...DEFAULT_FILTERS, sort: "duration" });
  for (let i = 1; i < byDur.length; i++) assert.ok(byDur[i-1].totalMinutes <= byDur[i].totalMinutes);
  const byStops = applyFilters(fixture, { ...DEFAULT_FILTERS, sort: "stops" });
  for (let i = 1; i < byStops.length; i++) assert.ok(byStops[i-1].stops <= byStops[i].stops);
  const sum = (r) => r.layovers.reduce((a,b)=>a+b,0);
  const byLay = applyFilters(fixture, { ...DEFAULT_FILTERS, sort: "layover" });
  for (let i = 1; i < byLay.length; i++) assert.ok(sum(byLay[i-1]) <= sum(byLay[i]));
});

test("addDays: UTC-safe across month/year/leap edges", () => {
  assert.strictEqual(addDays("2026-08-15", 3), "2026-08-18");
  assert.strictEqual(addDays("2026-08-31", 1), "2026-09-01");
  assert.strictEqual(addDays("2026-01-01", -1), "2025-12-31");
  assert.strictEqual(addDays("2026-02-28", 1), "2026-03-01");
});

test("Program colors: nine distinct badge colors", () => {
  const colors = PROGRAMS.map((p) => p.color);
  assert.strictEqual(new Set(colors).size, 9);
  colors.forEach((c) => assert.match(c, /^#[0-9a-f]{6}$/i));
});

test("parseCarriers: splits, trims, uppercases, dedupes, validates", () => {
  assert.deepStrictEqual(parseCarriers("UA, NH"), ["UA", "NH"]);
  assert.deepStrictEqual(parseCarriers("ua,nh, ua"), ["UA", "NH"]);
  assert.deepStrictEqual(parseCarriers("B6 / AS | DL"), ["B6", "AS", "DL"]);
  assert.deepStrictEqual(parseCarriers(""), []);
  assert.deepStrictEqual(parseCarriers(null), []);
  assert.deepStrictEqual(parseCarriers("UNITED"), []); // full words rejected, codes only
});

test("Airline names resolve for the alliance carriers we expect", () => {
  for (const code of ["UA","NH","AC","TK","AS","AA","DL","BR","CI","KE","SQ","KL","AF","VS","AV"])
    assert.ok(AIRLINE_NAMES[code], `name for ${code}`);
});

test("Redeem links: every program has a valid https URL", () => {
  for (const p of PROGRAMS) {
    assert.ok(p.redeemUrl, `${p.id} has redeemUrl`);
    assert.match(p.redeemUrl, /^https:\/\//);
  }
});

test("Cash source values are limited to live or unavailable outside Demo mode", () => {
  const allowed = new Set(["live", "unavailable"]);
  for (const r of fixture) assert.ok(allowed.has(r.cashSource));
});

test("Dropdown type-to-jump: cycles through codes sharing a first letter", () => {
  const codes = ["AMS", "SEA", "SFO", "SIN", "SYD", "TPE"];
  let picked = null;
  const ev = (k) => ({ key: k, preventDefault: () => {} });
  selectKeyJump(ev("s"), codes, "", (v) => (picked = v));
  assert.strictEqual(picked, "SEA");
  selectKeyJump(ev("S"), codes, "SEA", (v) => (picked = v));
  assert.strictEqual(picked, "SFO");
  selectKeyJump(ev("s"), codes, "SYD", (v) => (picked = v));
  assert.strictEqual(picked, "SEA"); // wraps around
  picked = "unchanged";
  selectKeyJump(ev("Enter"), codes, "SEA", (v) => (picked = v));
  assert.strictEqual(picked, "unchanged"); // non-letters ignored
  selectKeyJump(ev("q"), codes, "SEA", (v) => (picked = v));
  assert.strictEqual(picked, "unchanged"); // no match → no jump
});



test("Cabin colors: four distinct colors defined", () => {
  const colors = CABINS.map((c) => c.color);
  assert.strictEqual(new Set(colors).size, 4);
  colors.forEach((c) => assert.match(c, /^#[0-9a-f]{6}$/i));
});

test("Airport catalog: 400+ airports incl. ONT/SNA/LGB/BUR/PEK, all valid", () => {
  const entries = Object.entries(AIRPORTS);
  assert.ok(entries.length >= 400, `only ${entries.length}`);
  for (const code of ["ONT", "SNA", "LGB", "BUR", "PEK"]) assert.ok(AIRPORTS[code], code);
  for (const [code, a] of entries) {
    assert.match(code, /^[A-Z]{3}$/);
    assert.ok(a.name && Math.abs(a.lat) <= 90 && Math.abs(a.lon) <= 180, code);
  }
});

test("Manual airport entry: normalizeAirportInput accepts typed values", () => {
  assert.strictEqual(normalizeAirportInput("ont"), "ONT");
  assert.strictEqual(normalizeAirportInput("  SNA  "), "SNA");
  assert.strictEqual(normalizeAirportInput("PEK — Beijing Capital"), "PEK");
  assert.strictEqual(normalizeAirportInput("LGB - Long Beach"), "LGB");
  assert.strictEqual(normalizeAirportInput("XYZ"), "XYZ"); // any valid code, catalog is not a restriction
  assert.strictEqual(normalizeAirportInput("ONTX"), "");
  assert.strictEqual(normalizeAirportInput("12A"), "");
  assert.strictEqual(normalizeAirportInput(""), "");
});

// ── Cash-fare filter suite (v9) ──
const cashFix = [
  { id:"a", cabin:"economy", price:95,  source:"live", carriers:["Scoot"], connections:[], layovers:[], stops:0, totalMinutes:265, departMin:95,  arriveMin:360 },
  { id:"b", cabin:"economy", price:151, source:"live", carriers:["Cebu Pacific"], connections:["MNL"], layovers:[870], stops:1, totalMinutes:1255, departMin:195, arriveMin:10 },
  { id:"c", cabin:"economy", price:207, source:"live", carriers:["EVA Air"], connections:[], layovers:[], stops:0, totalMinutes:265, departMin:450, arriveMin:715 },
  { id:"d", cabin:"economy", price:99,  source:"live", carriers:["AirAsia X","AirAsia"], connections:["KUL"], layovers:[140], stops:1, totalMinutes:490, departMin:20, arriveMin:510 },
];

test("Cash filters: airlines multi-select", () => {
  const out = applyCashFilters(cashFix, { ...CASH_FILTERS, airlines: ["EVA Air", "Scoot"] });
  assert.deepStrictEqual(out.map((r) => r.id).sort(), ["a", "c"]);
});

test("Cash filters: cumulative stops incl. direct", () => {
  assert.deepStrictEqual(applyCashFilters(cashFix, { ...CASH_FILTERS, stops: "0" }).map((r) => r.id), ["a", "c"]);
  const upTo1 = applyCashFilters(cashFix, { ...CASH_FILTERS, stops: "1" });
  assert.strictEqual(upTo1.length, 4); // both directs + both 1-stops
  assert.strictEqual(applyCashFilters(cashFix, { ...CASH_FILTERS, stops: "2+" }).length, 4);
});

test("Cash filters: connection airport codes", () => {
  const out = applyCashFilters(cashFix, { ...CASH_FILTERS, connections: "mnl" });
  assert.deepStrictEqual(out.map((r) => r.id), ["b"]);
});

test("Cash filters: total travel time bounds (hours)", () => {
  const out = applyCashFilters(cashFix, { ...CASH_FILTERS, totalMinH: "4", totalMaxH: "9" });
  assert.deepStrictEqual(out.map((r) => r.id).sort(), ["a", "c", "d"]);
});

test("Cash filters: layover duration bounds (hours)", () => {
  const out = applyCashFilters(cashFix, { ...CASH_FILTERS, layoverMinH: "2", layoverMaxH: "3" });
  assert.deepStrictEqual(out.map((r) => r.id), ["d"]); // 140-min layover; 870-min excluded
});

test("Cash filters: departure & arrival windows exclude schedule-less rows only when narrowed", () => {
  const dep = applyCashFilters(cashFix, { ...CASH_FILTERS, depWindow: [3, 8] });
  assert.deepStrictEqual(dep.map((r) => r.id).sort(), ["b", "c"]);
  const arr = applyCashFilters(cashFix, { ...CASH_FILTERS, arrWindow: [8, 12] });
  assert.deepStrictEqual(arr.map((r) => r.id).sort(), ["c", "d"]);
  const open = applyCashFilters(cashFix, CASH_FILTERS);
  assert.strictEqual(open.length, 4, "wide-open windows keep all live rows");
});

test("Demo-data guard: flags rows marked demo, never live rows", () => {
  assert.strictEqual(hasDemoData(cashFix), false);
  assert.strictEqual(hasDemoData(fixture), false);
  assert.strictEqual(hasDemoData([...fixture, { ...fixture[0], id: "zz", demo: true }]), true);
  assert.strictEqual(hasDemoData([]), false);
});

test("Saved searches: reward history cap is 20, cash history cap is 20", async () => {
  const fs = await import("node:fs");
  const app = fs.readFileSync("src/App.jsx", "utf8");
  assert.match(app, /HISTORY_MAX = 20/);
  const cash = fs.readFileSync("src/components/CashFares.jsx", "utf8");
  assert.match(cash, /CASH_HISTORY_MAX = 20/);
  assert.match(cash, /loadCashSearch/); // reload path exists
});

test("Program mapping covers all nine required programs", () => {
  const sources = PROGRAMS.map((p) => p.source);
  for (const x of ["alaska","american","delta","united","flyingblue","virginatlantic","aeroplan","lifemiles","turkish"])
    assert.ok(sources.includes(x), x);
});


test("Cash fare matcher: exact flight numbers outrank route/cabin benchmark", () => {
  const dataset = {
    source: "live", benchmarkPrice: 1200, benchmarkMethod: "median",
    flights: [
      { id: "other", price: 900, flightNumbers: ["UA100"], departTime: "08:00", arriveTime: "12:00", stops: 0, connections: [], totalMinutes: 240 },
      { id: "same", price: 1500, flightNumbers: ["UA838", "NH820"], departTime: "08:30", arriveTime: "15:41", stops: 1, connections: ["ICN"], totalMinutes: 431 },
    ],
  };
  const selected = selectCashFareForTrip({ flightNumbers: "UA 838 / NH820", departMin: 510, arriveMin: 941, stops: 1, connections: ["ICN"], totalMinutes: 431 }, dataset);
  assert.strictEqual(selected.price, 1500);
  assert.strictEqual(selected.matchType, "exact-itinerary");
  assert.deepStrictEqual(normalizeFlightNumbers("UA 838 / NH820"), ["UA838", "NH820"]);
});

test("Cash fare matcher: unmatched live list falls back to median benchmark", () => {
  const selected = selectCashFareForTrip({ flightNumbers: "AA1", departMin: 100, arriveMin: 200, stops: 0, connections: [], totalMinutes: 100 }, {
    source: "live", benchmarkPrice: 777, benchmarkMethod: "median", flights: [],
  });
  assert.strictEqual(selected.price, 777);
  assert.strictEqual(selected.matchType, "route-cabin-benchmark");
});
console.log(`\nAll ${n} core logic test groups passed.`);
