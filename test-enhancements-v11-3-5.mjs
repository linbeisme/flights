import assert from "node:assert/strict";
import fs from "node:fs";
import { cashSearchDates } from "./src/api/flightApi.js";

const app = fs.readFileSync("src/App.jsx", "utf8");
const fx = fs.readFileSync("src/components/FxPanel.jsx", "utf8");
const routes = fs.readFileSync("src/components/RouteManager.jsx", "utf8");
const filters = fs.readFileSync("src/components/FilterSidebar.jsx", "utf8");
const cash = fs.readFileSync("src/components/CashFares.jsx", "utf8");
const rec = fs.readFileSync("src/components/RecommendationPanel.jsx", "utf8");
const health = fs.readFileSync("functions/api/health.js", "utf8");

assert.match(app, /v11\.4\.1/);
assert.match(health, /version: "11\.4\.1"/);
assert.match(app, /details\[data-pb-popover\]\[open\]/);
assert.match(app, /removeAttribute\("open"\)/);
assert.match(rec, /data-pb-popover/);

assert.match(rec, /border-blue-300 bg-blue-100/);
assert.match(fx, /border-blue-300 bg-blue-100/);
assert.match(fx, /useState\(false\)/);
assert.match(fx, /signature && signature !== previousSignature\.current/);
assert.match(fx, /setOpen\(true\)/);

assert.match(routes, /showSavedRoutes/);
assert.match(routes, /Hide routes/);
assert.match(routes, /Show routes \(\$\{routes\.length\}\)/);

assert.match(filters, /role="tooltip"/);
assert.match(filters, /group-hover:block/);
assert.match(filters, /\{p\.label\}/);

assert.match(cash, /const \[dateFlex, setDateFlex\] = useState\(0\)/);
assert.match(cash, /Exact date/);
assert.match(cash, /<option value=\{1\}>± 1 day<\/option>/);
assert.match(cash, /<option value=\{3\}>± 3 days<\/option>/);
assert.match(cash, /<option value=\{7\}>± 7 days<\/option>/);
assert.match(cash, /flex: dateFlex/);
assert.match(cash, /lookupCount/);
assert.match(cash, /f\.searchDate/);

assert.deepEqual(cashSearchDates("2026-07-24", 0), ["2026-07-24"]);
assert.deepEqual(cashSearchDates("2026-07-24", 1), ["2026-07-23", "2026-07-24", "2026-07-25"]);
assert.equal(cashSearchDates("2026-07-24", 3).length, 7);
assert.equal(cashSearchDates("2026-07-24", 7).length, 15);
assert.deepEqual(cashSearchDates("bad-date", 7), []);

console.log("✓ retained v11.3.5 features with v11.4.1 version badge, click-away popovers, blue controls, automatic FX reveal, saved-route toggle, program hover labels, and flexible cash-date checks passed");
