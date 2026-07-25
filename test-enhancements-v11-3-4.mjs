import assert from "node:assert/strict";
import fs from "node:fs";
import { filterCashRowsByCabins } from "./src/api/flightApi.js";

const cash = fs.readFileSync("src/components/CashFares.jsx", "utf8");
const same = fs.readFileSync("src/components/SameFlightView.jsx", "utf8");
const rec = fs.readFileSync("src/components/RecommendationPanel.jsx", "utf8");
const defaults = fs.readFileSync("src/data/defaults.js", "utf8");
const css = fs.readFileSync("src/index.css", "utf8");

assert.match(rec, /className="mt-2 rounded border border-line bg-card px-3 py-1\.5 text-xs font-semibold"/);
assert.match(rec, /text-favorable/);
assert.match(css, /--color-favorable: #5b2c83/);
assert.match(rec, /FastestAcceptablePopover/);
assert.match(rec, /Fastest acceptable recommendation/);
assert.match(rec, /Realized CPP \{r\.cpp == null \? "—"/);
assert.match(rec, /OperatingCarrierLine/);
assert.match(same, /OperatingCarrierLine/);
assert.match(defaults, /JX: "Starlux Airlines"/);

assert.match(cash, /const \[searchedCabins, setSearchedCabins\] = useState\(\[\]\)/);
assert.match(cash, /activeCabinRows = filterCashRowsByCabins\(rows, cabins\)/);
assert.match(cash, /Stored search results remain available until Clear fares is clicked/);
assert.match(cash, /No new fares were returned\. Your previous cash-fare results remain available/);
assert.match(cash, /The new cash-fare search failed\. Your previous results remain available/);
assert.doesNotMatch(cash, /Cabin selection changed\. Previous cash-fare results were cleared/);
assert.match(cash, /setRows\(\[\]\); setSearchedCabins\(\[\]\); setSearched\(false\)/);

const cabinRows = [
  { id: "Y", cabin: "economy" },
  { id: "W", cabin: "premium" },
  { id: "J", cabin: "business" },
];
assert.deepEqual(filterCashRowsByCabins(cabinRows, ["economy", "premium"]).map((r) => r.id), ["Y", "W"]);
assert.deepEqual(filterCashRowsByCabins(cabinRows, ["premium"]).map((r) => r.id), ["W"]);
assert.equal(cabinRows.length, 3, "cabin filtering must not mutate or clear stored results");

assert.match(same, /Cash fare<\/span><span>CPP<\/span><span>Economic cost/);
console.log("✓ v11.3.4 persistent multi-cabin fares, recommendation layout, positive savings color, fastest-info help, alternative CPP, carrier styling, and JX mapping checks passed");
