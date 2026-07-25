import assert from "node:assert/strict";
import fs from "node:fs";

const cash = fs.readFileSync("src/components/CashFares.jsx", "utf8");
const same = fs.readFileSync("src/components/SameFlightView.jsx", "utf8");
const rec = fs.readFileSync("src/components/RecommendationPanel.jsx", "utf8");
const css = fs.readFileSync("src/index.css", "utf8");

assert.match(cash, /Cabin selection changed\. Previous cash-fare results were cleared/);
assert.match(cash, /setRows\(\[\]\);[\s\S]*setSearched\(false\);[\s\S]*setSearchedAt\(null\);/);
assert.match(cash, /press Get cash fares to search the selected cabin\(s\)/);

assert.match(same, /Best realized CPP/);
assert.match(same, /Cash fare<\/span><span>CPP<\/span><span>Economic cost/);
assert.ok(same.indexOf('>Cash fare</span>') < same.indexOf('>Realized CPP</span>'), "row-level CPP should follow cash fare");

assert.match(rec, /Hide Filter/);
assert.match(rec, /Show Filter/);
assert.doesNotMatch(rec, /Hide settings/);
assert.doesNotMatch(rec, /Show settings/);
assert.match(rec, /align="right"/);
assert.match(rec, /RecommendationMathPopover/);
assert.match(rec, /Economic redemption cost/);
assert.match(rec, /\(Points × reference CPP in cents ÷ 100\) \+ award taxes\/fees converted to USD/);
assert.match(rec, /\(\(Cash fare − award taxes\/fees in USD\) ÷ points\) × 100/);
assert.match(rec, /Economic savings = \$4,150 − \$1,046 = <strong>\$3,104<\/strong>/);
assert.match(rec, /savingsVsCash < 0 \? "pb-flash-medium text-fresh"/);
assert.match(css, /@keyframes pb-medium-flash/);
assert.match(css, /\.pb-flash-medium \{ animation: pb-medium-flash 1\.1s/);

console.log("✓ v11.3.3 cabin invalidation, same-flight CPP placement, filter labels, right-aligned flight details, negative-savings alert, and calculation help checks passed");
