# PointsBoard — Reward Flight Search Engine

Search award availability across **nine mileage programs** (Alaska, American, Delta, United, KLM/Flying Blue, Virgin Atlantic, Aeroplan, LifeMiles, Turkish), see **points + taxes/fees + live cash fare** side by side, and rank everything by **CPP = ((cash fare − taxes and fees) ÷ points) × 100**.

There are two ways to run it, from easiest to most powerful:

| Option | Effort | Data |
|---|---|---|
| **A. Claude artifact** (`PointsBoard.jsx`) | Point it at your Worker | Live seats.aero data via your deployed Worker |
| **B. Cloudflare Pages** (this folder) | ~15 min, free tier | Live seats.aero + optional live cash fares |

Claude artifacts cannot hold your seats.aero API key or call seats.aero directly (the key would be exposed and the browser is blocked by CORS). That is not a limitation of this app — it is why *every* production app hides keys behind a server. Option B gives you that server for free.

---

## What's in this folder

```
reward-flights/
├── package.json              ← dependencies + scripts
├── vite.config.js            ← Vite + Tailwind config
├── index.html
├── src/
│   ├── main.jsx
│   ├── index.css             ← design tokens
│   ├── App.jsx               ← layout, LocalStorage persistence, search orchestration
│   ├── components/
│   │   ├── RouteManager.jsx  ← saved routes, date editing, one-click reverse (⇄)
│   │   ├── FilterSidebar.jsx ← cabin/time/stops/connections/layover/total-time filters
│   │   └── FlightResults.jsx ← results with points, taxes, cash fare, CPP badge
│   ├── api/flightApi.js      ← seats.aero client, cash-fare service, CPP math, filters
│   └── data/defaults.js      ← program→source mapping, 22 pre-loaded routes
├── functions/
│   └── api/
│       ├── search.js         ← Cloudflare Function: seats.aero proxy (key stays server-side)
│       └── cashfare.js       ← Cloudflare Function: live cash fares (SerpApi) or estimate
├── test-logic.mjs            ← 13 logic test groups (run: node test-logic.mjs)
└── test-functions.mjs        ← proxy validation tests (run: node test-functions.mjs)
```

---

## Option A — Run as a Claude artifact (zero setup)

1. Paste `PointsBoard.jsx` into Claude (or ask Claude to render it).
2. Use it immediately: all 22 routes are pre-loaded, dates are editable, every filter and the CPP math work on realistic **demo data** (marked with `*` on fares).
3. Your saved routes persist between sessions automatically.
4. Later, if you complete Option B: open **Settings** in the app, paste your `https://your-app.pages.dev` URL, tick **Use live seats.aero data** — the artifact now shows real award space.

## Option B — Deploy to Cloudflare Pages (free, ~15 minutes)

You'll need: a free [Cloudflare](https://dash.cloudflare.com/sign-up) account, a free [GitHub](https://github.com/signup) account, and a seats.aero Partner API key (seats.aero → your account → API; the Partner API requires their Pro subscription).

### Step 1 — Put the code on GitHub
1. On github.com click **＋ → New repository**, name it `reward-flights`, keep it **Private**, click **Create repository**.
2. Click **uploading an existing file**, drag in everything in this folder **except** `node_modules/` and `dist/` (if present), and click **Commit changes**.
   *(Comfortable with git? `git init && git add . && git commit -m "init" && git push` works too.)*

### Seeing "Create a Worker" instead of Pages?

Cloudflare's newer dashboard may put you in a **Worker** setup flow ("Set up your application", with a *Deploy command* field and no Framework preset). That flow is fully supported — the repo includes `wrangler.jsonc` and `worker/index.js` for it. On that screen set: Build command `npm run build`, Deploy command `npx wrangler deploy` (the default), Path `/`, and make sure **Project name matches the `name` in `wrangler.jsonc`** (default `rewards` — edit the file if yours differs). After deploying, add your keys under the Worker's **Settings → Variables and Secrets** (type *Secret*): `SEATS_AERO_API_KEY` and optionally `SERPAPI_KEY`, then redeploy from the Deployments tab. Everything else (Live mode, empty proxy URL) works identically. Prefer the classic Pages screens? On the Create screen, look for the **Pages** tab / "looking for Pages?" link.

### Step 2 — Connect Cloudflare Pages
1. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
2. Authorize GitHub and pick your `reward-flights` repo.
3. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Click **Save and Deploy**. First build takes 1–2 minutes.

### Step 3 — Add your API key (the important part)
1. In your new Pages project: **Settings → Environment variables → Add variable**.
2. Name: `SEATS_AERO_API_KEY` — Value: *your seats.aero Partner API key*. Mark it **Secret**. Save for **Production**.
3. Optional, for live cash fares: add `SERPAPI_KEY` with a [SerpApi](https://serpapi.com) key (free tier: 100 searches/month). Without it, the app uses clearly-marked estimates and everything else still works. (Prefer Amadeus? `functions/api/cashfare.js` documents where to swap the adapter.)
4. **Deployments → Retry deployment** so the new variables take effect.

### Step 4 — Use it
1. Open `https://your-project.pages.dev`.
2. Click **Settings** in the app header → tick **Use live seats.aero data**. Leave the proxy URL **empty** (same-origin `/api/...` is used automatically).
3. Pick a route, set a date, **Search award space**.

Because the key lives only in Cloudflare's environment, viewing the page source or network tab never reveals it — the browser only ever talks to `/api/search` on your own domain.

### Local development (optional)
```bash
npm install
npx wrangler pages dev . --port 8788   # terminal 1: runs the Functions locally
npm run dev                            # terminal 2: Vite dev server (proxies /api → 8788)
```
Put your key in a `.dev.vars` file (never commit it): `SEATS_AERO_API_KEY=xxxx`

---

## GitHub Pages instead?

GitHub Pages serves only static files — it cannot run the proxy, so it cannot hide your API key by itself. Two workable setups:

- **Demo hosting:** `npm run build`, publish `dist/` to GitHub Pages. The app runs in demo mode.
- **Hybrid:** deploy Option B once for the proxy, host the frontend anywhere (including GitHub Pages), and paste the Cloudflare URL into the app's Settings. The Functions send `Access-Control-Allow-Origin: *`, so cross-origin calls work; tighten that header to your own domain in `functions/api/search.js` once you know it.

**Recommendation:** just use Cloudflare Pages for everything — one deploy, no CORS thought required.

---

## Feature checklist (as built and tested)

- **seats.aero integration** — cached search + per-trip detail (times, stops, layovers) through the proxy; taxes converted from minor units; rate-limit-aware (max 15 trip lookups, 3 concurrent, 5-min edge cache, 429 surfaced with a friendly message).
- **Cash fares** — async service; SerpApi Google Flights adapter server-side, deterministic estimate fallback everywhere (estimates marked `*`).
- **Program mapping** — all nine programs mapped to seats.aero sources; proxy whitelists exactly these.
- **Pre-loaded routes** — TPE→ICN/NRT/HND/BKK/SIN/HKG/KUL/KIX/CTS (Sapporo)/NGO (Nagoya) and LAX→TPE/NRT/AMS/CDG/FRA/ZRH/FCO (Rome)/MUC/BCN (Barcelona)/LIS (Lisbon)/MAD/IST, each with an editable date.
- **Persistence** — routes and settings survive reloads (LocalStorage in the web app; artifact storage in the artifact).
- **Reverse route** — the ⇄ button swaps origin/destination in one click and saves instantly.
- **Transparent costs** — every row shows points, taxes/fees, cash fare, and CPP.
- **CPP** — exact formula ((cash − taxes) ÷ points) × 100; ≥1.5¢ highlighted green, <0.8¢ dimmed.
- **Filters** — cabin (all four), departure/arrival time windows, exact stops (direct/1/2+), connection airport codes, min/max layover hours, min/max total travel hours, plus program toggles and four sort orders.

## v2 updates

- **Multi-route search** — check up to 3 saved routes and search them together; every result row shows its own route and date.
- **More sort orders** — CPP, fewest points, shortest travel time, fewest stops, shortest total layover time, earliest departure.
- **Prominent cash fare** — headline-size in each row, labeled "cash fare".
- **Bigger route line** — departure/arrival times at 2xl, city codes at lg, all monospace.
- **Program color coding** — nine fixed, distinct badge colors (defined in `src/data/defaults.js`).
- **Day/Night theme** — ☾/☀ toggle in the header; night mode restyles every token and persists.
- **Clear button** — wipes the current result set (history keeps its snapshots).
- **Recent searches** — dropdown restores any of the last 10 searches, with results snapshot and timestamp.
- **Award seat counts** — each row shows "N award seats" (green pill; amber when barely enough; "unknown" when the API doesn't say).
- **Passenger count** — set 1–9 passengers; options with a *known* seat count below that number are hidden. Unknown-seat rows stay visible rather than being wrongly discarded.
- **Freshness stamp** — every result set shows "updated \<date time\>" in small type; when fetched within the last 10 minutes it reads **● CURRENT** in red. History-loaded results show their original (gray) timestamp.

## v10 update — 20 saved searches, result-row reorg

- **20 saved searches on both tabs**: reward search history raised from 10 → 20; the Cash Fares tab gains its own "Saved searches" dropdown (up to 20, reloadable) — persisted to localStorage in the deployed build, session-scoped in the single-file artifact.
- **Result-row reorganization**: the mileage-program description moved out of the left chip row to sit directly **above the CPP box** in the right column, pairing program and value together.
- **Bigger, clearer chips**: cabin class, operating airlines, award-seat count, and the Redeem button are ~30% larger (10px → 13px text, roomier padding), each with a leading glyph.
- **Slow-flashing airline icon**: the ✈ on the operating-airlines chip pulses on a gentle 1.6s loop (respects `prefers-reduced-motion`) so the operating carrier is easy to spot at a glance.

## v9 update — filters, prefill, 400+ airports, integrity flag

- **Flashing red demo flag**: if any result row is ever flagged as demo/test data (`demo: true`), the results meta line replaces the green LIVE stamp with a flashing red "⚠ TEST/DEMO DATA IN RESULTS" alert. The live pipeline never produces such rows — the guard (`hasDemoData`) exists so nothing synthetic could ever blend in silently.
- **Restore defaults selects nothing**: restoring the 22 presets no longer auto-selects TPE→ICN (or anything). The Restore link is also 25% bigger (11→15px) in bright magenta semibold.
- **Cash tab prefill**: selecting a route on the reward tab automatically fills the Cash Fares origin/destination/date (first selected route). No search runs until "Get cash fares" is pressed. The cash tab now also stays mounted across tab switches, so its results survive tabbing away.
- **411-airport catalog + manual entry**: 316 new airports worldwide (incl. ONT, SNA, LGB, BUR, PEK). Airport fields are now datalist combo inputs — pick from suggestions or type ANY valid 3-letter IATA code; `normalizeAirportInput` cleans typed values ("ont", "PEK — Beijing Capital" → PEK).
- **Cash Fares filter suite** (client-side, appears once results load): airlines (multi-select chips built from the results), cumulative stops (same semantics as rewards), connection airports, total travel time min/max, layover duration min/max, and departure/arrival hour windows. Reset button + "showing X of Y" count. Server list rows now carry layover durations to power the layover filter.
- **Airlines prominent in cash results**: the operating airline(s) now appear in bold directly above the fare pill on the right — identifiable at a glance.
- **Polish**: uppercase tracked field labels, consistent rounded-md cards, hover states on result rows, uniform control heights.

### Test coverage at v9
- 33 logic groups (adds: 400+ airport validity incl. requested codes, manual-entry parsing, six cash-filter behaviors, demo-guard truth table)
- 15 function tests (adds: layovers on list-mode rows)
- 16 simulation scenarios (adds: arrival-minute/layover normalization, full filter suite on live-shaped rows, red-flag guard never trips on live pipelines)

## v8 update — Cash Fares tab, data-integrity indicators, dropdown key-jump

- **Cash Fares tab (Option A)**: a second tab next to "Reward Results". Pick a departing city, destination, date, and any combination of the four cabins (each cabin is one SerpApi lookup, individually toggleable via color-coded buttons). The tab returns the **full Google Flights price list** — up to 25 flights per cabin with times, duration, stops, connection airports, and operating airlines — sorted cheapest first. Server side this is a new `list=1` mode on `/api/cashfare` that returns normalized flight rows; it degrades to a single clearly-marked estimate row when SerpApi is unavailable, and the client degrades the same way on network failure.
- **UI consistency in the cash tab**: rows deliberately reuse the reward-results visual language — big monospace times, magenta-highlighted connection airports, ✈ airline chips, colored cabin pills, and the same green "LIVE CASH FARE" / yellow "ESTIMATED FARE *" price treatment.
- **Dropdown type-to-jump**: in every airport dropdown (route builder + cash tab), pressing a letter key jumps to the first airport code starting with that letter and cycles through the rest on repeated presses.
- **Data-integrity indicators**: the results meta line now opens with a green "● LIVE seats.aero data · no demo/test data" stamp plus a yellow count of any estimated fares; the header gains a "demo data: off ✓" button that expands an explanation that no demo/test data exists anywhere in the build.
- Footer build tag bumped to **v8**.

### Test coverage at v8
- 25 logic groups (adds: type-to-jump cycling/wrapping/ignoring non-letters, 95-airport catalog validity, distinct cabin colors)
- 14 function tests (adds: `list=1` estimate fallback returns one marked schedule-less row)
- 13 end-to-end simulation scenarios (adds: cash rows sorted by price across cabins, per-row cabin tagging and live/estimate sources, schedule/connection/departMin normalization, network-failure degradation to a marked estimate)

## v7 update — median fares, expanded catalog, layout polish

- **Median cash fare (Option B)**: the SerpApi integration now uses the **median** of all Google Flights fares instead of the minimum. On routes with budget carriers (Scoot's $95 TPE→SIN vs EVA/China Airlines at ~$200), the floor price made every full-service redemption look weak; the median filters those outliers. Verified against the exact fare list from a real TPE→SIN Google Flights result: [95,95,99,99,151,158,182,207,207] → **$151**, not $95.
- **Expanded airport catalog**: 63 new airports (95 total) across the US, Canada, Latin America, Europe, Asia, Middle East, Oceania, and Africa — all selectable in the route-builder dropdowns, all with coordinates so the fallback fare estimator stays distance-aware.
- **Visible result dates**: each row's date is now a bold monospace pill instead of small gray text — essential when flexible-date windows mix dates.
- **Color-coded cabins**: Economy (green), Premium Economy (gold), Business (blue), First (purple) as tinted pills, visually distinct from the solid program badges.
- **Darker Clear buttons** (ink-on-dark) and a **slightly darker search field** (paper-deep vs the page's paper) so the search controls read as a distinct zone.
- **Sort by relocated**: now its own bar directly between the search box and the results, where sorting decisions actually happen.
- Footer build tag bumped to **v7**.

## v6 update — cleaner start, wider search

- **Clean first start**: the app opens with no saved routes. Add your first via the new dropdowns, or click "Restore defaults" for the 22 presets. Previously saved routes still load.
- **Dropdown route builder**: departing city and destination are chosen from a dropdown of the known airport catalog (code + city name) — no typing codes. Up to **5 routes** can be selected and searched together (was 3).
- **One-click program toggle**: a Select all / Deselect all button above the nine program chips.
- **Sort menu rebuilt** to exactly: Best CPP first · Shortest travel time first · Shortest layover time first · Lowest fees/taxes first (new sorter) · Least number of stops first · Lowest points redemption first.
- **Connection airports 25% bigger** (11px → 14px) on top of the bold magenta highlight.
- **Cumulative stops filter**: "Direct" = nonstop only; "≤1 stop" now *includes* direct; "≤2+" includes direct, 1-stop, and 2+ (i.e., no cap). Tooltips on each button spell it out.
- **Two clear buttons**: "Clear results" wipes only the results; "Clear all" also unselects every route.
- Footer build tag bumped to **v6**.

### Simulation harness (new)

`test-simulation.mjs` mocks the seats.aero Partner API and the cash-fare endpoint at the network layer, then runs the **real** `searchAwards` pipeline end-to-end — verifying the ±N date window hits seats.aero as `start_date`/`end_date`, program exclusion, carrier parsing, live-vs-estimate cash sources, connection/layover/time/seat/tax normalization, exact CPP math, the cumulative stops filter, all six sort orders, and the passenger seat filter. Run it with `node test-simulation.mjs`.

## v5 update — richer results

- **Connection airports highlighted**: layover airports in the routing line ("1 stop via NRT") now render as bold, magenta-tinted codes so connections jump out at a glance.
- **Operating airlines shown**: each itinerary displays an "✈ United · ANA" chip built from the seats.aero trip data (`Carriers`), with ~45 IATA codes mapped to full airline names (unknown codes show as-is). Day-level fallback rows have no carrier data, so no chip.
- **Redeem links**: every result carries a "Redeem ↗" button linking to that program's own website (aa.com, united.com, lifemiles.com, etc.), opening in a new tab — this app finds and values the space; booking happens with the airline.
- **Bigger Sort control**: the highlighted Sort-by dropdown got larger text and padding plus a heavier border.
- **Color-coded cash fares**: a fare pulled live from Google Flights (SerpApi) is highlighted **green** and labeled "live cash fare"; a fallback estimate is highlighted **yellow/amber** and labeled "estimated fare *". The cash *source* now flows from the server through to every row (previously the server's own estimate could display indistinguishably from a live fare — that's fixed).

## v4 update — live-only (demo data removed)

The synthetic demo generator and the demo/live mode toggle are gone. The app is now **always live**: it calls `/api/search` and `/api/cashfare` on its own origin (your Cloudflare Worker), which hold the seats.aero key server-side. Settings keeps only an optional Proxy base URL for the case where you host the frontend on a different origin than the Worker.

The single-file artifact (`PointsBoard.jsx`) is likewise demo-free; it points at your deployed Worker (`DEFAULT_PROXY` constant near the top) so it shows live data too — edit that one line if your Worker URL changes.

The cash-fare **estimator** remains, but only as a clearly-marked (`*`) fallback for the specific case where the live cash-fare lookup (SerpApi) returns no price — most often premium cabins. Every points figure, tax, seat count, and the award availability itself is always live. If you want zero estimated numbers at all, remove the `estimateCashFare` fallback calls in `src/api/flightApi.js` (search for `estimateCashFare`) and `functions/api/cashfare.js`; premium cabins with no live fare will then show a blank cash figure and no CPP.

## v3 update — flexible dates

Every route now carries a **date-flexibility** setting next to its date: Exact date, ± 1, ± 3, ± 7, ± 14, or ± 30 days (also available when adding a new route). A non-exact setting highlights the selector and shows a magenta "±Nd" tag in the search bar and history labels.

How it searches: in **live mode** the window maps directly onto seats.aero's `start_date`/`end_date` range — still a single search call even at ± 30 days — with cash fares fetched per (cabin, date) pair up to a cap of 12 live lookups (the rest use the marked estimator, protecting your SerpApi quota). In **demo mode** the generator runs once per date in the window. Every result row already shows its own date, so mixed-date results stay unambiguous, and wide windows are kept snappy by rendering at most 200 rows with a note explaining how to narrow down.

## Test results

Run yourself with `node test-logic.mjs && node test-functions.mjs`:

- ✓ 22/22 logic groups + 9/9 end-to-end simulation scenarios (v5 adds: carrier-string parsing incl. dedupe/validation, airline-name coverage for alliance carriers, https redeem URLs for all nine programs, cash-source value constraints) (live-only build; filter/sort/CPP/pax now tested against a fixed fixture rather than the removed demo generator) (v3 adds: UTC-safe date arithmetic across month/year/leap edges, ±3 window spans exactly 7 dates, flex-0 stays exact with unique ids, filters and CPP sorting across the whole window) (v2 adds: stops/layover sorting, passenger seat filtering incl. unknown-seat handling, multi-route merge with no id collisions, nine distinct program colors): exact CPP formula (incl. divide-by-zero and negative-CPP cases), 22 default routes with future dates, deterministic demo generator with internally consistent CPP/stops/layovers, every filter, every sort, cash-estimator determinism, all nine program mappings.
- ✓ 12/12 proxy + worker tests: CORS preflight, missing-key guidance, IATA/date/trips-id validation, method rejection, deterministic fare fallback, and Worker-flow routing (/api/search, /api/cashfare, unknown-API 404, static-asset fallthrough).
- ✓ `npm run build` compiles clean (Vite 6, ~56 KB gzipped JS).

## Honest limitations

- Live search of one route/date typically costs 1 search + up to 15 trip calls + up to 4 fare calls against seats.aero/SerpApi quotas.
- Trip times are displayed as printed by seats.aero (local airport clock times); day-level fallback rows have no times/stops, so time-window and stop filters keep them visible rather than wrongly hiding them.
- CPP compares against the *cheapest* cash fare in that cabin, which is the standard—but conservative—way to value points.
- This tool finds and values space; booking happens on the airline's site.
