import { useEffect, useMemo, useState } from "react";
import RouteManager, { MAX_SELECTED } from "./components/RouteManager.jsx";
import FilterSidebar from "./components/FilterSidebar.jsx";
import FlightResults from "./components/FlightResults.jsx";
import CashFares from "./components/CashFares.jsx";
import RecommendationPanel from "./components/RecommendationPanel.jsx";
import FxPanel from "./components/FxPanel.jsx";
import SameFlightView from "./components/SameFlightView.jsx";
import { buildDefaultRoutes } from "./data/defaults.js";
import { DEMO_ROUTES, getDemoResultsForRoutes } from "./data/demoData.js";
import { DEFAULT_RECOMMENDATION_PREFS, enrichResult } from "./api/recommendationEngine.js";
import { EMPTY_CPP_LIBRARY, loadCppLibrary } from "./api/cppLibrary.js";
import { assertLiveResults, isSafeLiveHistoryEntry, sanitizeLiveHistory } from "./api/modeIntegrity.js";
import { searchAwards, applyFilters, DEFAULT_FILTERS } from "./api/flightApi.js";
import { currenciesNeedingFx } from "./api/currency.js";
import { dedupeExpandedResults, expandSelectedRoutes } from "./api/nearbyAirports.js";

// ── Persistent state (LocalStorage) ─────────────────────────────────
const LS_ROUTES = "pointsboard.routes.v1";
const LS_SETTINGS = "pointsboard.settings.v2";
const LS_HISTORY = "pointsboard.history.v1";
const LS_FX = "pointsboard.fx.v1";
const HISTORY_MAX = 20;

async function mapWithConcurrency(items, limit, fn) {
  const output = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      output[current] = await fn(items[current]);
    }
  });
  await Promise.all(workers);
  return output;
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — keep working in memory */
  }
}

function loadSafeHistory() {
  return sanitizeLiveHistory(loadJSON(LS_HISTORY, []), HISTORY_MAX);
}


export default function App() {
  // First start = a clean slate: no routes until the user adds one (or
  // clicks "Restore defaults" for the 22 presets). Persisted routes
  // from earlier sessions load normally.
  const [routes, setRoutes] = useState(() => loadJSON(LS_ROUTES, []));
  const [settings, setSettings] = useState(() =>
    loadJSON(LS_SETTINGS, { proxyBase: "", theme: "day", dataMode: "live" })
  );
  const [history, setHistory] = useState(loadSafeHistory);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pax, setPax] = useState(1);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [results, setResults] = useState([]);
  const [searchedAt, setSearchedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDataNote, setShowDataNote] = useState(false);
  const [activeTab, setActiveTab] = useState("rewards"); // rewards | sameFlight | cash
  const [recommendationPrefs, setRecommendationPrefs] = useState({ ...DEFAULT_RECOMMENDATION_PREFS });
  const [cppLibrary, setCppLibrary] = useState(EMPTY_CPP_LIBRARY);
  const [cppLibraryError, setCppLibraryError] = useState("");
  const [fxRates, setFxRates] = useState(() => loadJSON(LS_FX, {}));

  useEffect(() => saveJSON(LS_ROUTES, routes), [routes]);
  useEffect(() => saveJSON(LS_SETTINGS, settings), [settings]);
  useEffect(() => saveJSON(LS_HISTORY, history), [history]);
  useEffect(() => saveJSON(LS_FX, fxRates), [fxRates]);
  useEffect(() => {
    let cancelled = false;
    loadCppLibrary()
      .then((library) => { if (!cancelled) { setCppLibrary(library); setCppLibraryError(""); } })
      .catch((err) => { if (!cancelled) setCppLibraryError(err.message || "CPP library failed to load"); });
    return () => { cancelled = true; };
  }, []);

  // Day/Night: flip the .dark class on <html>; tokens do the rest.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "night");
  }, [settings.theme]);

  const selectedRoutes = routes.filter((r) => selectedIds.includes(r.id));
  const routeExpansion = useMemo(() => expandSelectedRoutes(selectedRoutes), [selectedRoutes]);

  // Cash tab pre-fills from the first selected route (fields only —
  // no search runs until "Get cash fares" is pressed).
  const cashPrefill = selectedRoutes[0]
    ? { origin: selectedRoutes[0].origin, destination: selectedRoutes[0].destination, date: selectedRoutes[0].date }
    : null;
  const effectiveFilters = useMemo(() => ({ ...filters, pax }), [filters, pax]);
  const valuedResults = useMemo(() => results.map((row) => enrichResult(row, cppLibrary, fxRates)), [results, cppLibrary, fxRates]);
  const foreignCurrencies = useMemo(() => currenciesNeedingFx(results), [results]);
  const filtered = useMemo(() => applyFilters(valuedResults, effectiveFilters), [valuedResults, effectiveFilters]);

  // ── Route CRUD ────────────────────────────────────────────────────
  const toggleSelect = (id) =>
    setSelectedIds((ids) =>
      ids.includes(id)
        ? ids.filter((x) => x !== id)
        : ids.length >= MAX_SELECTED
          ? ids
          : [...ids, id]
    );

  const updateDate = (id, date) =>
    setRoutes((rs) => rs.map((r) => (r.id === id ? { ...r, date } : r)));

  const updateFlex = (id, flex) =>
    setRoutes((rs) => rs.map((r) => (r.id === id ? { ...r, flex } : r)));

  const updateNearby = (id, patch) =>
    setRoutes((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  // Reverse Route Feature: one click swaps origin/destination and the
  // change persists immediately via the routes effect above.
  const reverseRoute = (id) =>
    setRoutes((rs) =>
      rs.map((r) =>
        r.id === id ? { ...r, origin: r.destination, destination: r.origin } : r
      )
    );

  const deleteRoute = (id) => {
    setRoutes((rs) => rs.filter((r) => r.id !== id));
    setSelectedIds((ids) => ids.filter((x) => x !== id));
  };

  const addRoute = ({ origin, destination, date, flex = 0, nearbyOrigin = false, nearbyDestination = false, nearbyRadiusMiles = 50 }) => {
    const route = { id: `${origin}-${destination}-${Date.now()}`, origin, destination, date, flex, nearbyOrigin, nearbyDestination, nearbyRadiusMiles };
    setRoutes((rs) => [route, ...rs]);
    setSelectedIds((ids) => (ids.length < MAX_SELECTED ? [...ids, route.id] : ids));
  };

  const resetDefaults = () => {
    setRoutes(buildDefaultRoutes());
    setSelectedIds([]); // nothing pre-selected — not even TPE-ICN
  };

  // ── Search across up to 5 selected routes ─────────────────────────
  async function runSearch() {
    if (selectedRoutes.length === 0) return;
    const expandedRoutes = routeExpansion.routes;
    if (settings.dataMode === "demo") {
      const ts = Date.now();
      const demo = getDemoResultsForRoutes(expandedRoutes).map((row) => ({ ...row, checkedAt: ts }));
      setResults(demo);
      setSearchedAt(ts);
      setSearched(true);
      setError(demo.length ? "" : "No pre-built demo results exist for the selected base or nearby routes. Demo mode never calls live APIs.");
      return;
    }
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const perRoute = await mapWithConcurrency(expandedRoutes, 4, (r) =>
        searchAwards({
          proxyBase: settings.proxyBase,
          origin: r.origin,
          destination: r.destination,
          date: r.date,
          programIds: filters.programs,
          flex: r.flex || 0,
        })
      );
      const ts = Date.now();
      const merged = dedupeExpandedResults(assertLiveResults(perRoute.flat())).map((row) => ({ ...row, checkedAt: ts }));
      setResults(merged);
      setSearchedAt(ts);

      const label =
        selectedRoutes
          .map((r) => `${r.origin}→${r.destination} ${r.date}${r.flex ? `±${r.flex}d` : ""}${r.nearbyOrigin || r.nearbyDestination ? " +nearby" : ""}`)
          .join(" · ") + (pax > 1 ? ` · ${pax} pax` : "");
      setHistory((h) =>
        [
          { id: `h-${ts}`, schemaVersion: 3, dataMode: "live", label, ts, pax, routes: selectedRoutes, results: merged.slice(0, 180) },
          ...h,
        ].slice(0, HISTORY_MAX)
      );
    } catch (e) {
      setResults([]);
      setSearchedAt(null);
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // Clear results: wipe the current result set (history keeps its copies).
  function clearResults() {
    setResults([]);
    setSearchedAt(null);
    setSearched(false);
    setError("");
  }

  // Clear all: results AND the route selection, back to a blank slate.
  function clearAll() {
    clearResults();
    setSelectedIds([]);
  }

  function loadHistory(id) {
    const entry = history.find((h) => h.id === id);
    if (!entry) return;
    if (settings.dataMode !== "live" || !isSafeLiveHistoryEntry(entry)) {
      setError("Recent-search history can only restore verified live results while Live mode is active.");
      return;
    }
    setResults(entry.results);
    setSearchedAt(entry.ts);
    setPax(entry.pax || 1);
    setSearched(true);
    setError("");
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ── Ops bar ── */}
      <header className="border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <h1 className="font-data text-lg font-bold tracking-[0.2em]">
            POINTS<span className="text-magenta">BOARD</span>
          </h1>
          <p className="hidden text-xs text-ink-soft sm:block">
            award space · taxes · cash fares · cents per point
          </p>
          <div className="ml-auto flex items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 font-data text-[10px] uppercase tracking-wider ${settings.dataMode === "live" ? "border-deal text-deal" : "border-warn text-warn"}`}>
              {settings.dataMode === "live" ? "live · seats.aero" : "demo · pre-built data"}
            </span>
            <label className="flex items-center gap-2 rounded-full border border-line bg-card px-2 py-1 font-data text-[10px] font-semibold uppercase tracking-wider">
              <span>Demo data</span>
              <input type="checkbox" checked={settings.dataMode === "demo"} onChange={(e) => {
                const dataMode = e.target.checked ? "demo" : "live";
                setSettings((x) => ({ ...x, dataMode })); clearResults();
                if (dataMode === "demo") { setRoutes(DEMO_ROUTES); setSelectedIds(DEMO_ROUTES.slice(0,3).map((r)=>r.id)); }
              }} aria-label="Toggle demo data mode"/>
            </label>
            <button type="button" onClick={() => setShowDataNote((v) => !v)} className="rounded-full border border-line bg-card px-2 py-1 font-data text-[10px] uppercase">Mode details</button>
            <button
              type="button"
              onClick={() =>
                setSettings((s) => ({ ...s, theme: s.theme === "night" ? "day" : "night" }))
              }
              className="rounded border border-line bg-card px-2 py-1 text-xs hover:border-ink"
              aria-pressed={settings.theme === "night"}
              title="Toggle day/night theme"
            >
              {settings.theme === "night" ? "☀ Day" : "☾ Night"}
            </button>
            <button
              type="button"
              onClick={() => setShowSettings((s) => !s)}
              className="rounded border border-line bg-card px-2 py-1 text-xs hover:border-ink"
              aria-expanded={showSettings}
            >
              Settings
            </button>
          </div>
        </div>

        {showDataNote && (
          <div className="border-t border-line bg-deal-soft">
            <p className="mx-auto max-w-6xl px-4 py-2 text-[11px] text-ink">
              <span className="font-semibold">Strict mode separation:</span> Live mode calls only seats.aero and the configured cash-fare service. Demo mode performs no award or cash-fare API calls and loads only clearly flagged pre-built scenarios. Turning Demo off clears demo results, and Live mode rejects demo-tagged history or returned rows.
            </p>
          </div>
        )}
        {showSettings && (
          <div className="border-t border-line bg-paper-deep">
            <div className="mx-auto flex max-w-6xl flex-wrap items-end gap-4 px-4 py-3">
              <label className="flex min-w-64 flex-1 flex-col gap-1 text-xs">
                Proxy base URL (optional)
                <input
                  value={settings.proxyBase}
                  onChange={(e) => setSettings((s) => ({ ...s, proxyBase: e.target.value.trim() }))}
                  placeholder="Leave empty — same origin as this app"
                  className="rounded border border-line bg-card px-2 py-1 font-data text-xs"
                />
              </label>
              <p className="w-full text-[11px] text-ink-soft">
                Served from your Cloudflare Worker, the app calls{" "}
                <code className="font-data">/api/search</code> on its own domain, so leave this
                empty. Only fill it in if you host the page somewhere else (e.g. GitHub Pages) and
                need to point it at your Cloudflare URL. Your seats.aero key always stays on the
                server.
              </p>
            </div>
          </div>
        )}
      </header>

      {/* ── Main grid ── */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[280px_1fr]">
        <aside className="flex flex-col gap-5">
          <RouteManager
            routes={routes}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onUpdateDate={updateDate}
            onUpdateFlex={updateFlex}
            onUpdateNearby={updateNearby}
            onReverse={reverseRoute}
            onDelete={deleteRoute}
            onAdd={addRoute}
            onResetDefaults={resetDefaults}
          />
          <FilterSidebar filters={filters} onChange={setFilters} />
        </aside>

        <section aria-label="Search results">
          {/* ── Tabs: Reward Results ↔ Cash Fares ── */}
          <div className="mb-3 flex gap-1 border-b-2 border-line" role="tablist">
            {[
              ["rewards", "Recommendations + Results"],
              ["sameFlight", "Exact Same Flight"],
              ["cash", "Cash Fares"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`-mb-0.5 rounded-t border-2 border-b-0 px-4 py-2 font-data text-sm font-semibold ${
                  activeTab === id
                    ? "border-ink bg-card text-ink"
                    : "border-transparent bg-paper-deep text-ink-soft hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div hidden={activeTab !== "cash"}>
            <CashFares proxyBase={settings.proxyBase} prefill={cashPrefill} />
          </div>

          <div hidden={!["rewards", "sameFlight"].includes(activeTab)}>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-ink bg-paper-deep p-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 font-data">
              {selectedRoutes.length > 0 ? (
                selectedRoutes.map((r) => (
                  <span key={r.id} className="whitespace-nowrap">
                    <span className="text-lg font-bold">{r.origin}</span>
                    <span aria-hidden="true" className="mx-1 text-ink-soft">→</span>
                    <span className="text-lg font-bold">{r.destination}</span>
                    <span className="ml-1.5 text-xs text-ink-soft">
                      {r.date}
                      {(r.flex || 0) > 0 && <span className="text-magenta"> ±{r.flex}d</span>}
                    </span>
                  </span>
                ))
              ) : (
                <p className="text-sm text-ink-soft" style={{ fontFamily: "inherit" }}>
                  Check up to {MAX_SELECTED} saved routes to search.
                </p>
              )}
            </div>

            {selectedRoutes.length > 0 && routeExpansion.routes.length !== selectedRoutes.length && (
              <div className="w-full rounded border border-deal bg-deal-soft px-2 py-1 text-[11px] text-deal">
                Nearby-airport expansion: {selectedRoutes.length} saved route{selectedRoutes.length === 1 ? "" : "s"} → {routeExpansion.routes.length} bounded route combination{routeExpansion.routes.length === 1 ? "" : "s"}{routeExpansion.truncated ? " (capped to protect API quota)" : ""}.
              </div>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs">
                Passengers
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={pax}
                  onChange={(e) => setPax(Math.max(1, Math.min(9, Number(e.target.value) || 1)))}
                  aria-label="Number of passengers (award seats required)"
                  className="w-14 rounded border border-line bg-card px-1.5 py-1 text-center font-data text-xs"
                />
              </label>

              {settings.dataMode === "live" && history.length > 0 && (
                <select
                  value=""
                  onChange={(e) => e.target.value && loadHistory(e.target.value)}
                  aria-label="Load one of the last 10 searches"
                  className="max-w-44 rounded border border-line bg-card px-1.5 py-1.5 text-xs"
                >
                  <option value="">Recent searches ({history.length})</option>
                  {history.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.label}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={clearResults}
                disabled={!searched && results.length === 0}
                className="rounded border border-ink bg-ink px-3 py-2 text-sm font-semibold text-paper hover:bg-magenta-deep hover:text-white disabled:opacity-40"
                title="Clear the search results only (selected routes stay)"
              >
                Clear results
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={!searched && results.length === 0 && selectedRoutes.length === 0}
                className="rounded border border-ink bg-ink px-3 py-2 text-sm font-semibold text-paper hover:bg-magenta-deep hover:text-white disabled:opacity-40"
                title="Clear the search results AND unselect all routes"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={runSearch}
                disabled={selectedRoutes.length === 0 || loading}
                className="rounded bg-magenta px-4 py-2 text-sm font-semibold text-white hover:bg-magenta-deep disabled:opacity-40"
              >
                {loading
                  ? "Searching…"
                  : `Search award space${routeExpansion.routes.length > 1 ? ` (${routeExpansion.routes.length} route combinations)` : ""}`}
              </button>
            </div>
          </div>

          {activeTab === "rewards" && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded border border-line bg-paper-deep px-3 py-2">
              <label htmlFor="sort-results" className="text-xs font-semibold uppercase tracking-[0.15em] text-heading">Sort by</label>
              <select id="sort-results" value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))} className="min-w-64 rounded border-2 border-magenta bg-magenta/10 px-2.5 py-2.5 text-sm font-semibold">
                <option value="cpp">Best CPP first</option>
                <option value="duration">Shortest travel time first</option>
                <option value="layover">Shortest layover time first</option>
                <option value="taxes">Lowest fees/taxes first</option>
                <option value="stops">Least number of stops first</option>
                <option value="points">Lowest points redemption first</option>
                <option value="economicCost">Lowest economic redemption cost first</option>
              </select>
            </div>
          )}

          <FxPanel
            currencies={foreignCurrencies}
            fxRates={fxRates}
            onChange={setFxRates}
          />

          {activeTab === "rewards" ? (
            <>
              <RecommendationPanel
                results={filtered}
                prefs={recommendationPrefs}
                onPrefsChange={setRecommendationPrefs}
                dataMode={settings.dataMode || "live"}
                cppLibrary={cppLibrary}
                cppLibraryError={cppLibraryError}
                fxRates={fxRates}
                searchedAt={searchedAt}
                pax={pax}
              />
              <FlightResults
                results={filtered}
                total={results.length}
                loading={loading}
                error={error}
                searched={searched}
                routes={selectedRoutes}
                pax={pax}
                searchedAt={searchedAt}
                dataMode={settings.dataMode || "live"}
              />
            </>
          ) : (
            <SameFlightView results={filtered} pax={pax} dataMode={settings.dataMode || "live"} />
          )}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-6 text-[11px] text-ink-soft">
        Award data © seats.aero. Live mode never creates a synthetic cash fare. CPP uses an exact cash itinerary when flight numbers match; otherwise it is labeled as a probable schedule match, same-airline benchmark, or route/cabin benchmark. When no live fare is available, cash fare, CPP, and cash-based savings remain unavailable. CPP = ((cash fare − taxes and fees) ÷ points) × 100. <span className="font-data font-semibold text-magenta">build v11.3.1 · full filters + recommendations retained + exact-flight grouping</span>
      </footer>
    </div>
  );
}
