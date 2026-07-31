import assert from "node:assert/strict";
import fs from "node:fs";
import { AIRPORTS } from "./src/data/airports.js";
import { DEFAULT_UI_FILTERS } from "./src/api/flightApi.js";

const app = fs.readFileSync("src/App.jsx", "utf8");
const cash = fs.readFileSync("src/components/CashFares.jsx", "utf8");
const roundTrip = fs.readFileSync("src/components/RoundTripResults.jsx", "utf8");
const html = fs.readFileSync("index.html", "utf8");

assert.equal(Object.keys(AIRPORTS).length, 1000, "airport catalog must contain exactly 1,000 suggestions");
for (const code of ["LAX", "TPE", "JFK", "LHR", "ONT", "PEK"]) assert.ok(AIRPORTS[code], `${code} must remain available`);
assert.deepEqual(DEFAULT_UI_FILTERS.cabins, ["economy"], "reward UI must default to Economy only");

assert.match(app, /priorRoundTripRef/);
assert.match(app, /cabins: \[cabin\]/);
assert.match(app, /cabins: \["economy"\]/);
assert.match(app, /roundTripRoute\?\.cashCabin/);
assert.match(app, /selectedPrograms=\{filters\.programs\}/);

assert.match(cash, /setTripType\(nextTripType\)/);
assert.match(cash, /setTripType\("oneway"\)/);
assert.match(cash, /source: "recommendations"/);
assert.match(cash, /Saved searches/);
assert.match(cash, /returnDate: savedReturnDate/);

assert.match(app, /Saved searches \(\{history\.length\}\)/);
assert.match(app, /setSelectedIds\(savedRoutes/);
assert.match(app, /savedRoundTrip\?\.cashRows/);
assert.match(app, /restoreOnly: true/);

assert.match(roundTrip, /Operated by \{operatingAirlines\(leg\.carriers\)\}/);
assert.match(roundTrip, /style=\{\{ color: program\.color \}\}/);
assert.match(roundTrip, /Savings vs\. cash/);
assert.match(roundTrip, /Derived \/ blended across both point currencies/);
assert.match(roundTrip, /filterCombinations/);
assert.match(roundTrip, /splitMethodLabel/);
assert.match(roundTrip, /pb-flash-medium text-fresh/);
assert.match(roundTrip, /border-fresh bg-card/);

for (const className of ["bg-magenta/10", "bg-warn/15", "bg-deal-soft"]) assert.ok(app.includes(className));
assert.match(app, /useState\("rewards"\)/);

assert.ok(fs.existsSync("public/red-airplane-favicon.png"));
assert.match(html, /red-airplane-favicon\.png/);
assert.doesNotMatch(html, /✈|✈️/);
assert.match(html, /PointsBoard v11\.4\.3/);
assert.match(cash, /multiple cabins allowed/);
assert.match(cash, /searchRoundTripCashFares\(\{ proxyBase, origin: o, destination: d, departDate: date, returnDate, flex: dateFlex, cabin, adults: 1 \}\)/);

console.log("✓ v11.4.3 UI synchronization, 1,000-airport catalog, round-trip savings, uploaded-airplane favicon, dynamic program re-filtering, split-program CPP, and multi-cabin cash-fare checks passed");
