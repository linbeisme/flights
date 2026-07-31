import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const wrangler = JSON.parse(read("wrangler.jsonc"));
const workflow = read(".github/workflows/verify.yml");
const gitignore = read(".gitignore");
const devVars = read(".dev.vars.example");
const headers = read("public/_headers");
const activeSource = [
  "src/api/flightApi.js",
  "src/api/modeIntegrity.js",
  "src/components/CashFares.jsx",
  "src/components/FlightResults.jsx",
  "src/components/RecommendationPanel.jsx",
  "src/components/SameFlightView.jsx",
  "src/components/RedemptionActions.jsx",
  "src/api/nearbyAirports.js",
  "src/api/sameFlightGroups.js",
  "src/api/redemptionLinks.js",
  "functions/api/cashfare.js",
  "worker/index.js",
].map(read).join("\n");

assert.equal(pkg.version, "11.4.4");
assert.equal(lock.version, pkg.version);
assert.equal(lock.packages[""].version, pkg.version);
assert.match(pkg.engines.node, />=20/);
assert.ok(pkg.scripts.build && pkg.scripts.test && pkg.scripts["deploy:dry"]);
console.log("✓ deployment: package metadata and scripts are consistent");

assert.equal(wrangler.name, "flights");
assert.equal(wrangler.main, "worker/index.js");
assert.equal(wrangler.assets.directory, "./dist");
assert.equal(wrangler.assets.binding, "ASSETS");
assert.equal(wrangler.assets.not_found_handling, "single-page-application");
assert.match(wrangler.compatibility_date, /^\d{4}-\d{2}-\d{2}$/);
console.log("✓ deployment: Wrangler Worker and SPA asset configuration is complete");

for (const fragment of ["actions/checkout@v6", "actions/setup-node@v6", "npm ci", "npm test", "npm run build", "npm run deploy:dry"]) {
  assert.match(workflow, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.ok(existsSync(".nvmrc"));
assert.equal(read(".nvmrc").trim(), "22");
console.log("✓ deployment: GitHub Actions performs clean install, tests, build, and dry run");

for (const secret of ["SEATS_AERO_API_KEY", "SERPAPI_KEY", "ALLOWED_ORIGINS"]) assert.match(devVars, new RegExp(secret));
assert.doesNotMatch(activeSource, /replace_with_your_|api[_-]?key\s*[:=]\s*["'][A-Za-z0-9_-]{16,}/i);
assert.match(gitignore, /^\.dev\.vars$/m);
assert.match(gitignore, /^node_modules\/$/m);
assert.match(gitignore, /^dist\/$/m);
assert.match(gitignore, /^\.wrangler-dry-run\/$/m);
console.log("✓ deployment: secrets are externalized and generated folders are ignored");

assert.match(headers, /Content-Security-Policy:/);
assert.match(headers, /X-Content-Type-Options: nosniff/);
assert.ok(existsSync("functions/api/health.js"));
assert.match(read("worker/index.js"), /\/api\/health/);
console.log("✓ deployment: security headers and health endpoint are present");

assert.doesNotMatch(activeSource, /estimateCashFare\s*\(/);
assert.doesNotMatch(read("functions/api/cashfare.js"), /deterministic-estimate|source:\s*["']estimate["']/);
assert.match(read("src/api/modeIntegrity.js"), /containsSyntheticLiveFallback/);
console.log("✓ deployment: Live mode has no active synthetic cash-fare fallback");

console.log("\nAll deployment-readiness checks passed.");
