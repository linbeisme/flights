import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/App.jsx", "utf8");
const routes = fs.readFileSync("src/components/RouteManager.jsx", "utf8");
const cash = fs.readFileSync("src/components/CashFares.jsx", "utf8");
const api = fs.readFileSync("src/api/flightApi.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

// The existing add-route form is moved, not redesigned or duplicated.
const formStart = routes.indexOf('<form onSubmit={handleAdd}');
const savedHeading = routes.indexOf('id="routes-heading"');
assert.ok(formStart >= 0 && savedHeading >= 0 && formStart < savedHeading);
assert.equal((routes.match(/<form onSubmit=\{handleAdd\}/g) || []).length, 1);
for (const label of ["Add a route", "Save route", "Saved routes", "Hide routes", "Restore defaults"]) {
  assert.ok(routes.includes(label));
}

// Reward search reuses the same live cash datasets and passes them to the unchanged Cash Fares view.
assert.match(api, /export async function searchAwardsWithCash/);
assert.match(api, /cashRowsFromDatasets/);
assert.match(app, /searchAwardsWithCash\(/);
assert.match(app, /autoResults=\{cashAutoResults\}/);
assert.match(cash, /autoResults/);
assert.match(cash, /setRows\(liveRows\)/);

// Previous controls remain present.
for (const label of ["Clear results", "Clear all", "Search award space", "Recommendations + Results", "Exact Same Flight", "Cash Fares"]) {
  assert.ok(app.includes(label));
}
for (const label of ["Get cash fares", "Clear fares", "Reset filters", "Saved searches"]) {
  assert.ok(cash.includes(label));
}

// The bookmark icon now uses the uploaded red-airplane PNG; the page title contains no airplane emoji.
assert.ok(fs.existsSync("public/red-airplane-favicon.png"));
assert.match(html, /red-airplane-favicon\.png/);
assert.doesNotMatch(html, /✈|✈️/);
assert.match(html, /PointsBoard v11\.4\.4/);

console.log("✓ v11.4.4 retained-v11.3.7 regression checks passed: original controls retained, add-route moved, cash fares reused, and uploaded red-airplane favicon configured");
