import { useEffect, useMemo, useRef, useState } from "react";
import RouteManager, { MAX_SELECTED } from "./components/RouteManager.jsx";
import FilterSidebar from "./components/FilterSidebar.jsx";
import FlightResults from "./components/FlightResults.jsx";
import CashFares from "./components/CashFares.jsx";
import RecommendationPanel from "./components/RecommendationPanel.jsx";
import FxPanel from "./components/FxPanel.jsx";
import SameFlightView from "./components/SameFlightView.jsx";
import RoundTripResults from "./components/RoundTripResults.jsx";
import { buildDefaultRoutes } from "./data/defaults.js";
import { DEMO_ROUTES, getDemoResultsForRoutes } from "./data/demoData.js";
import { DEFAULT_RECOMMENDATION_PREFS, enrichResult } from "./api/recommendationEngine.js";
import { EMPTY_CPP_LIBRARY, loadCppLibrary } from "./api/cppLibrary.js";
import { assertLiveResults, isSafeLiveHistoryEntry, sanitizeLiveHistory } from "./api/modeIntegrity.js";
import { searchAwardsWithCash, applyFilters, DEFAULT_UI_FILTERS } from "./api/flightApi.js";
import { currenciesNeedingFx } from "./api/currency.js";
import { dedupeExpandedResults, expandSelectedRoutes } from "./api/nearbyAirports.js";
import { buildRoundTripCombinations, roundTripDatePairs, searchRoundTripAwardScenario, searchRoundTripCashFares } from "./api/roundTrip.js";

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
  const [filters, setFilters] = useState({ ...DEFAULT_UI_FILTERS });
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
  const [cashAutoResults, setCashAutoResults] = useState(null);
  const [roundTripData, setRoundTripData] = useState(null);

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

  // Any open information popover closes when the user clicks elsewhere.
  useEffect(() => {
    const closeOpenPopovers = (event) => {
      document.querySelectorAll("details[data-pb-popover][open]").forEach((details) => {
        if (!details.contains(event.target)) details.removeAttribute("open");
      });
    };
    document.addEventListener("pointerdown", closeOpenPopovers);
    return () => document.removeEventListener("pointerdown", closeOpenPopovers);
  }, []);

  const selectedRoutes = routes.filter((r) => selectedIds.includes(r.id));
  const routeExpansion = useMemo(() => expandSelectedRoutes(selectedRoutes), [selectedRoutes]);
  const roundTripRoute = selectedRoutes.length === 1 && selectedRoutes[0].tripType === "roundtrip" ? selectedRoutes[0] : null;
  const roundTripPairs = useMemo(
    () => roundTripRoute ? roundTripDatePairs(roundTripRoute.date, roundTripRoute.returnDate, roundTripRoute.flex || 0) : [],
    [roundTripRoute?.date, roundTripRoute?.returnDate, roundTripRoute?.flex]
  );

  useEffect(() => {
    if (roundTripRoute && activeTab === "sameFlight") setActiveTab("rewards");
  }, [roundTripRoute, activeTab]);

  // Round-trip reward comparisons must use the same single cabin as the
  // true round-trip cash benchmark. Returning to one-way restores the
  // requested default: Economy only, with additional cabins opt-in.
  const priorRoundTripRef = useRef(false);
  useEffect(() => {
    if (roundTripRoute) {
      const cabin = roundTripRoute.cashCabin || "economy";
      setFilters((current) =>
        current.cabins.length === 1 && current.cabins[0] === cabin
          ? current
          : { ...current, cabins: [cabin] }
      );
      priorRoundTripRef.current = true;
      return;
    }
    if (priorRoundTripRef.current) {
      setFilters((current) =>
        current.cabins.length === 1 && current.cabins[0] === "economy"
          ? current
          : { ...current, cabins: ["economy"] }
      );
      priorRoundTripRef.current = false;
    }
  }, [roundTripRoute?.id, roundTripRoute?.cashCabin]);

  // Cash tab fields follow the first selected route. A reward search also
  // sends its already-fetched live fare lists to the Cash Fares tab so the
  // same SerpApi lookups are not repeated.
  const cashPrefill = selectedRoutes[0]
    ? {
        origin: selectedRoutes[0].origin,
        destination: selectedRoutes[0].destination,
        date: selectedRoutes[0].date,
        returnDate: selectedRoutes[0].returnDate || "",
        tripType: selectedRoutes[0].tripType || "oneway",
        cashCabin: selectedRoutes[0].cashCabin || "economy",
        flex: selectedRoutes[0].tripType === "roundtrip" ? Math.min(3, selectedRoutes[0].flex || 0) : selectedRoutes[0].flex || 0,
      }
    : null;
  const effectiveFilters = useMemo(() => ({ ...filters, pax }), [filters, pax]);
  const valuedResults = useMemo(() => results.map((row) => enrichResult(row, cppLibrary, fxRates)), [results, cppLibrary, fxRates]);
  const foreignCurrencies = useMemo(() => currenciesNeedingFx(results), [results]);
  const filtered = useMemo(() => applyFilters(valuedResults, effectiveFilters), [valuedResults, effectiveFilters]);

  // ── Route CRUD ────────────────────────────────────────────────────
  const toggleSelect = (id) =>
    setSelectedIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      const route = routes.find((item) => item.id === id);
      const hasRoundTrip = ids.some((selectedId) => routes.find((item) => item.id === selectedId)?.tripType === "roundtrip");
      if (route?.tripType === "roundtrip" || hasRoundTrip) return [id];
      return ids.length >= MAX_SELECTED ? ids : [...ids, id];
    });

  const updateRoute = (id, patch) =>
    setRoutes((rs) => rs.map((r) => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch };
      if (next.tripType === "roundtrip") next.flex = Math.min(3, Number(next.flex || 0));
      return next;
    }));

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

  const addRoute = ({ origin, destination, date, returnDate = null, tripType = "oneway", cashCabin = "economy", flex = 0, nearbyOrigin = false, nearbyDestination = false, nearbyRadiusMiles = 50 }) => {
    const route = { id: `${origin}-${destination}-${Date.now()}`, origin, destination, date, returnDate, tripType, cashCabin, flex: tripType === "roundtrip" ? Math.min(3, flex) : flex, nearbyOrigin, nearbyDestination, nearbyRadiusMiles };
    setRoutes((rs) => [route, ...rs]);
    setSelectedIds((ids) => {
      if (tripType === "roundtrip") return [route.id];
      const hasRoundTrip = ids.some((selectedId) => routes.find((item) => item.id === selectedId)?.tripType === "roundtrip");
      if (hasRoundTrip) return [route.id];
      return ids.length < MAX_SELECTED ? [...ids, route.id] : ids;
    });
  };

  const resetDefaults = () => {
    setRoutes(buildDefaultRoutes());
    setSelectedIds([]); // nothing pre-selected — not even TPE-ICN
  };

  // ── Search across up to 5 one-way routes or one round trip ──────────
  async function runSearch() {
    if (selectedRoutes.length === 0) return;
    const expandedRoutes = routeExpansion.routes;

    if (settings.dataMode === "demo") {
      if (roundTripRoute) {
        setResults([]);
        setRoundTripData(null);
        setSearchedAt(Date.now());
        setSearched(true);
        setError("Round-trip mode requires live provider data. Demo mode preserves the existing one-way examples and performs no API calls.");
        return;
      }
      const ts = Date.now();
      const demo = getDemoResultsForRoutes(expandedRoutes).map((row) => ({ ...row, checkedAt: ts }));
      setRoundTripData(null);
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
      if (roundTripRoute) {
        if (!roundTripPairs.length) throw new Error("Return date must be after the departure date.");
        const cashCabin = roundTripRoute.cashCabin || "economy";
        const awardTasks = expandedRoutes.flatMap((route) =>
          roundTripDatePairs(route.date, route.returnDate, route.flex || 0).map((pair) => ({ route, pair }))
        );

        const [awardScenarios, cashPerRoute] = await Promise.all([
          mapWithConcurrency(awardTasks, 2, async ({ route, pair }) => ({
            route,
            pair,
            awards: await searchRoundTripAwardScenario({
              proxyBase: settings.proxyBase,
              origin: route.origin,
              destination: route.destination,
              outboundDate: pair.outboundDate,
              returnDate: pair.returnDate,
              programIds: filters.programs,
            }),
          })),
          mapWithConcurrency(expandedRoutes, 1, (route) => searchRoundTripCashFares({
            proxyBase: settings.proxyBase,
            origin: route.origin,
            destination: route.destination,
            departDate: route.date,
            returnDate: route.returnDate,
            flex: route.flex || 0,
            cabin: cashCabin,
            adults: 1,
          })),
        ]);

        const ts = Date.now();
        const cashRows = cashPerRoute.flat();
        const allAwardRows = [];
        const sameProgram = [];
        const splitProgram = [];
        const roundTripFilters = { ...effectiveFilters, cabins: [cashCabin] };

        for (const scenario of awardScenarios) {
          const outboundRaw = assertLiveResults(scenario.awards.outbound || []).map((row) => ({ ...row, checkedAt: ts }));
          const returnRaw = assertLiveResults(scenario.awards.return || []).map((row) => ({ ...row, checkedAt: ts }));
          const outbound = applyFilters(outboundRaw.map((row) => enrichResult(row, cppLibrary, fxRates)), roundTripFilters);
          const returning = applyFilters(returnRaw.map((row) => enrichResult(row, cppLibrary, fxRates)), roundTripFilters);
          allAwardRows.push(...outboundRaw, ...returnRaw);
          const scenarioCash = cashRows.filter((row) =>
            row.origin === scenario.route.origin &&
            row.destination === scenario.route.destination &&
            row.datePairKey === scenario.pair.key &&
            row.cabin === cashCabin
          );
          const combinations = buildRoundTripCombinations({ outboundRows: outbound, returnRows: returning, cashRows: scenarioCash, pax });
          sameProgram.push(...combinations.sameProgram);
          splitProgram.push(...combinations.splitProgram);
        }

        const sortCombos = (left, right) => {
          const leftCost = Number.isFinite(left.economicCost) ? left.economicCost : Infinity;
          const rightCost = Number.isFinite(right.economicCost) ? right.economicCost : Infinity;
          const leftCash = Number.isFinite(left.cashFare) ? left.cashFare : Infinity;
          const rightCash = Number.isFinite(right.cashFare) ? right.cashFare : Infinity;
          return leftCost - rightCost || (right.cpp || -Infinity) - (left.cpp || -Infinity) || leftCash - rightCash;
        };
        const unique = (rows) => [...new Map(rows.map((row) => [row.id, row])).values()].sort(sortCombos).slice(0, 60);
        const safeAwardRows = dedupeExpandedResults(allAwardRows);
        const data = {
          route: roundTripRoute,
          sameProgram: unique(sameProgram),
          splitProgram: unique(splitProgram),
          cashRows,
          searchedAt: ts,
        };
        setResults(safeAwardRows);
        setRoundTripData(data);
        setSearchedAt(ts);
        setCashAutoResults({
          id: ts,
          tripType: "roundtrip",
          rows: cashRows,
          searchedAt: ts,
          cabins: [cashCabin],
          cabin: cashCabin,
          routeCount: 1,
          origin: roundTripRoute.origin,
          destination: roundTripRoute.destination,
          date: roundTripRoute.date,
          returnDate: roundTripRoute.returnDate,
          flex: roundTripRoute.flex || 0,
        });
        const label = `${roundTripRoute.origin}⇄${roundTripRoute.destination} ${roundTripRoute.date}–${roundTripRoute.returnDate}${roundTripRoute.flex ? ` shift ±${roundTripRoute.flex}d` : ""} · ${cashCabin}${pax > 1 ? ` · ${pax} pax` : ""}`;
        setHistory((historyRows) => [
          {
            id: `h-${ts}`,
            schemaVersion: 4,
            tripType: "roundtrip",
            dataMode: "live",
            label,
            ts,
            pax,
            routes: selectedRoutes,
            results: safeAwardRows.slice(0, 220),
            roundTripData: data,
          },
          ...historyRows,
        ].slice(0, HISTORY_MAX));
        return;
      }

      setRoundTripData(null);
      const perRoute = await mapWithConcurrency(expandedRoutes, 4, (r) =>
        searchAwardsWithCash({
          proxyBase: settings.proxyBase,
          origin: r.origin,
          destination: r.destination,
          date: r.date,
          programIds: filters.programs,
          flex: r.flex || 0,
        })
      );
      const ts = Date.now();
      const merged = dedupeExpandedResults(assertLiveResults(perRoute.flatMap((bundle) => bundle.awards))).map((row) => ({ ...row, checkedAt: ts }));
      const cashRoute = selectedRoutes[0] || null;
      const cashRows = [...new Map(
        perRoute
          .flatMap((bundle) => bundle.cashFares || [])
          .filter((row) => !cashRoute || (row.origin === cashRoute.origin && row.destination === cashRoute.destination))
          .map((row) => [row.id, row])
      ).values()];
      setResults(merged);
      setSearchedAt(ts);
      setCashAutoResults({
        id: ts,
        tripType: "oneway",
        rows: cashRows,
        searchedAt: ts,
        cabins: [...filters.cabins],
        routeCount: cashRoute ? 1 : 0,
        origin: cashRoute?.origin || "",
        destination: cashRoute?.destination || "",
        date: cashRoute?.date || "",
        returnDate: "",
        flex: cashRoute?.flex || 0,
      });

      const label =
        selectedRoutes
          .map((r) => `${r.origin}→${r.destination} ${r.date}${r.flex ? `±${r.flex}d` : ""}${r.nearbyOrigin || r.nearbyDestination ? " +nearby" : ""}`)
          .join(" · ") + (pax > 1 ? ` · ${pax} pax` : "");
      setHistory((h) =>
        [
          { id: `h-${ts}`, schemaVersion: 3, tripType: "oneway", dataMode: "live", label, ts, pax, routes: selectedRoutes, results: merged.slice(0, 180) },
          ...h,
        ].slice(0, HISTORY_MAX)
      );
    } catch (e) {
      setResults([]);
      setRoundTripData(null);
      setSearchedAt(null);
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // Clear results: wipe the current result set (history keeps its copies).
  function clearResults() {
    setResults([]);
    setRoundTripData(null);
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
      setError("Saved-search history can only restore verified live results while Live mode is active.");
      return;
    }
    const savedRoutes = Array.isArray(entry.routes) ? entry.routes.filter((route) => route?.id) : [];
    if (savedRoutes.length) {
      setRoutes((current) => {
        const savedIds = new Set(savedRoutes.map((route) => route.id));
        return [...savedRoutes, ...current.filter((route) => !savedIds.has(route.id))];
      });
      setSelectedIds(savedRoutes.map((route) => route.id).slice(0, entry.tripType === "roundtrip" ? 1 : MAX_SELECTED));
    }
    setResults(entry.results);
    const savedRoundTrip = entry.tripType === "roundtrip" ? entry.roundTripData || null : null;
    setRoundTripData(savedRoundTrip);
    if (savedRoundTrip?.cashRows?.length) {
      const route = savedRoutes[0] || savedRoundTrip.route || {};
      setCashAutoResults({
        id: `saved-${entry.id}-${Date.now()}`,
        tripType: "roundtrip",
        rows: savedRoundTrip.cashRows,
        searchedAt: entry.ts,
        cabins: [route.cashCabin || "economy"],
        cabin: route.cashCabin || "economy",
        routeCount: 1,
        origin: route.origin,
        destination: route.destination,
        date: route.date,
        returnDate: route.returnDate,
        flex: route.flex || 0,
        restoreOnly: true,
      });
    }
    setSearchedAt(entry.ts);
    setPax(entry.pax || 1);
    setSearched(true);
    setError("");
    setActiveTab("rewards");
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ── Ops bar ── */}
      <header className="border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <h1 className="flex items-baseline gap-2 font-data text-lg font-bold tracking-[0.2em]">
            <span>POINTS<span className="text-magenta">BOARD</span></span>
            <span className="rounded border border-line bg-card px-1.5 py-0.5 text-[10px] font-bold tracking-normal text-ink-soft">v11.4.2</span>
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
            onUpdateRoute={updateRoute}
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
            ].map(([id, label]) => {
              const disabled = id === "sameFlight" && Boolean(roundTripRoute);
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  aria-disabled={disabled}
                  disabled={disabled}
                  title={disabled ? "Exact Same Flight remains available for one-way searches; round trips are shown as paired outbound and return legs." : undefined}
                  onClick={() => !disabled && setActiveTab(id)}
                  className={`-mb-0.5 rounded-t border-2 border-b-0 px-4 py-2 font-data text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                    activeTab === id
                      ? id === "rewards"
                        ? "border-magenta bg-magenta/10 text-magenta-deep"
                        : id === "sameFlight"
                          ? "border-warn bg-warn/15 text-warn"
                          : "border-deal bg-deal-soft text-deal"
                      : "border-transparent bg-paper-deep text-ink-soft hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <FxPanel
            currencies={foreignCurrencies}
            fxRates={fxRates}
            onChange={setFxRates}
          />

          <div hidden={activeTab !== "cash"}>
            <div className={activeTab === "cash" ? "rounded-b-md border border-deal bg-deal-soft/40 p-3" : ""}>
              <CashFares proxyBase={settings.proxyBase} prefill={cashPrefill} autoResults={cashAutoResults} />
            </div>
          </div>

          <div hidden={!["rewards", "sameFlight"].includes(activeTab)}>
            <div className={activeTab === "rewards" ? "rounded-b-md border border-magenta bg-magenta/5 p-3" : activeTab === "sameFlight" ? "rounded-b-md border border-warn bg-warn/5 p-3" : ""}>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-ink bg-paper-deep p-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 font-data">
              {selectedRoutes.length > 0 ? (
                selectedRoutes.map((r) => (
                  <span key={r.id} className="whitespace-nowrap">
                    <span className="text-lg font-bold">{r.origin}</span>
                    <span aria-hidden="true" className="mx-1 text-ink-soft">{r.tripType === "roundtrip" ? "⇄" : "→"}</span>
                    <span className="text-lg font-bold">{r.destination}</span>
                    <span className="ml-1.5 text-xs text-ink-soft">
                      {r.date}{r.tripType === "roundtrip" && r.returnDate ? ` to ${r.returnDate}` : ""}
                      {(r.flex || 0) > 0 && <span className="text-magenta"> {r.tripType === "roundtrip" ? "shift " : ""}±{r.flex}d</span>}
                      {r.tripType === "roundtrip" && <span className="ml-1 rounded border border-magenta px-1 py-0.5 text-[9px] font-bold uppercase text-magenta">{r.cashCabin || "economy"} cash cabin</span>}
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
            {roundTripRoute && (
              <div className="w-full rounded border border-magenta bg-magenta/5 px-2 py-1 text-[11px] text-ink">
                Round-trip mode will evaluate {routeExpansion.routes.length * roundTripPairs.length} route/date-pair scenario{routeExpansion.routes.length * roundTripPairs.length === 1 ? "" : "s"}. Dates shift together, cash flexibility is capped at ±3 days, and only the selected {roundTripRoute.cashCabin || "economy"} cabin is priced.
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
                  aria-label="Load a saved recommendation search"
                  className="max-w-44 rounded border border-line bg-card px-1.5 py-1.5 text-xs"
                >
                  <option value="">Saved searches ({history.length})</option>
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
                  : roundTripRoute
                    ? `Search round trip (${routeExpansion.routes.length * roundTripPairs.length} pair${routeExpansion.routes.length * roundTripPairs.length === 1 ? "" : "s"})`
                    : `Search award space${routeExpansion.routes.length > 1 ? ` (${routeExpansion.routes.length} route combinations)` : ""}`}
              </button>
            </div>
          </div>

          {activeTab === "rewards" && !roundTripRoute && (
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

          {activeTab === "rewards" ? (
            roundTripRoute ? (
              <RoundTripResults data={roundTripData} loading={loading} error={error} searched={searched} searchedAt={searchedAt} selectedPrograms={filters.programs} />
            ) : (
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
            )
          ) : (
            <SameFlightView results={filtered} pax={pax} dataMode={settings.dataMode || "live"} />
          )}
          </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-6 text-[11px] text-ink-soft">
        Award data © seats.aero. Live mode never creates a synthetic cash fare. CPP uses an exact cash itinerary when flight numbers match; otherwise it is labeled as a probable schedule match, same-airline benchmark, or route/cabin benchmark. When no live fare is available, cash fare, CPP, and cash-based savings remain unavailable. CPP = ((cash fare − taxes and fees) ÷ points) × 100. <span className="font-data font-semibold text-magenta">build v11.4.2 · round-trip cash-airline visibility + live program re-filtering + split-program CPP + multi-cabin cash fares</span>
      </footer>
    </div>
  );
}
