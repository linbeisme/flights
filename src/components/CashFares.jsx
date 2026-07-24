import { useEffect, useState } from "react";
import { AIRPORTS, CABINS, normalizeAirportInput } from "../data/defaults.js";
import { searchCashFares, formatDuration, applyCashFilters, CASH_FILTERS } from "../api/flightApi.js";
import { BASE_CURRENCY, formatMoney } from "../api/currency.js";

// ── CashFares (v9) ──────────────────────────────────────────────────
// • Route/date pre-fill from the reward tab's first selected route
//   (fields only — nothing runs until "Get cash fares" is pressed).
// • Airport inputs accept ANY typed 3-letter code, with the 400+
//   airport catalog offered as suggestions.
// • Full client-side filter suite: airlines (multi), stops (cumulative,
//   same semantics as rewards), connection airports, total travel
//   time, layover duration, and departure/arrival time windows.
// • Airlines shown prominently right next to the fare.

const CASH_HISTORY_MAX = 20; // saved cash-fare searches
const LS_CASH_HISTORY = "pointsboard.cashhistory.v1";
const loadCashHistory = () => {
  try {
    const rows = JSON.parse(localStorage.getItem(LS_CASH_HISTORY)) || [];
    return rows.filter((entry) => Array.isArray(entry.rows) && entry.rows.every((row) => row.source === "live"));
  } catch {
    return [];
  }
};
const saveCashHistory = (h) => {
  try { localStorage.setItem(LS_CASH_HISTORY, JSON.stringify(h)); } catch { /* ignore */ }
};

const AIRPORT_OPTIONS = Object.entries(AIRPORTS)
  .map(([code, a]) => ({ code, label: `${code} — ${a.name}` }))
  .sort((x, y) => x.code.localeCompare(y.code));

const cabinMeta = (id) => CABINS.find((c) => c.id === id) || { label: id, color: "#4a586f" };
const FIELD_LABEL = "text-[10px] font-semibold uppercase tracking-[0.12em] text-heading";
const FIELD_INPUT = "rounded border border-line bg-card px-2 py-2 font-data text-xs";

function HourRange({ label, value, onChange }) {
  const [h1, h2] = value;
  const clamp = (v) => Math.max(0, Math.min(24, Number.isFinite(v) ? v : 0));
  return (
    <div className="flex flex-col gap-1">
      <span className={FIELD_LABEL}>{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number" min={0} max={24} value={h1}
          aria-label={`${label} from hour`}
          onChange={(e) => onChange([clamp(Number(e.target.value)), h2])}
          className={`${FIELD_INPUT} w-14 text-center`}
        />
        <span className="text-[10px] text-ink-soft">to</span>
        <input
          type="number" min={0} max={24} value={h2}
          aria-label={`${label} to hour`}
          onChange={(e) => onChange([h1, clamp(Number(e.target.value))])}
          className={`${FIELD_INPUT} w-14 text-center`}
        />
        <span className="text-[10px] text-ink-soft">h</span>
      </div>
    </div>
  );
}

function CashRow({ f }) {
  const cab = cabinMeta(f.cabin);
  const airlines = f.carriers?.length ? f.carriers.join(" · ") : null;
  return (
    <li className="rounded-md border border-line bg-card p-3 shadow-sm transition-colors hover:border-ink/50">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-52 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 font-data">
            <span className="text-2xl font-bold leading-none">{f.departTime || "—"}</span>
            <span aria-hidden="true" className="text-lg text-ink-soft">→</span>
            <span className="text-2xl font-bold leading-none">{f.arriveTime || "—"}</span>
          </div>
          <div className="mt-1 text-xs text-ink-soft">
            {f.stops == null ? (
              "Schedule unavailable"
            ) : f.stops === 0 ? (
              "Nonstop"
            ) : (
              <>
                {f.stops} stop{f.stops > 1 ? "s" : ""}
                {f.connections.length > 0 && (
                  <>
                    {" via "}
                    {f.connections.map((c, i) => (
                      <span key={`${c}-${i}`}>
                        {i > 0 && ", "}
                        <span
                          className="rounded bg-magenta/10 px-1 font-data text-sm font-bold text-magenta"
                          title={`Connection / layover airport: ${c}`}
                        >
                          {c}
                        </span>
                      </span>
                    ))}
                  </>
                )}
                {f.layovers?.length > 0 &&
                  ` · layover${f.layovers.length > 1 ? "s" : ""} ${f.layovers
                    .map((m) => formatDuration(m))
                    .join(", ")}`}
              </>
            )}
            {f.totalMinutes != null && <> · {formatDuration(f.totalMinutes)}</>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded border px-1.5 py-0.5 font-data text-[10px] font-semibold"
              style={{ color: cab.color, borderColor: cab.color, background: `${cab.color}1a` }}
            >
              {cab.label}
            </span>
          </div>
        </div>

        {/* Airline shown prominently, right next to the fare */}
        <div className="text-right">
          {airlines && (
            <div
              className="mb-1 font-data text-base font-bold leading-tight text-ink"
              title={`Airline${f.carriers.length > 1 ? "s" : ""}: ${airlines}`}
            >
              ✈ {airlines}
            </div>
          )}
          <span
            className="inline-block rounded bg-deal-soft px-2 py-1 font-data text-xl font-bold leading-tight text-deal"
            title="Live cash fare from Google Flights through SerpApi"
          >
            {formatMoney(f.price, f.currency || BASE_CURRENCY)}
          </span>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-deal">
            live cash fare
          </div>
        </div>
      </div>
    </li>
  );
}

export default function CashFares({ proxyBase, prefill }) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [cabins, setCabins] = useState(["economy"]);
  const [rows, setRows] = useState([]);
  const [cf, setCf] = useState(CASH_FILTERS);
  const [searchedAt, setSearchedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState(loadCashHistory);

  // Selecting a route on the reward tab pre-fills the fields here.
  // No search runs — that stays behind the "Get cash fares" button.
  useEffect(() => {
    if (prefill) {
      setOrigin(prefill.origin);
      setDestination(prefill.destination);
      setDate(prefill.date);
    }
  }, [prefill?.origin, prefill?.destination, prefill?.date]);

  useEffect(() => saveCashHistory(history), [history]);

  const toggleCabin = (id) =>
    setCabins((cs) => (cs.includes(id) ? cs.filter((x) => x !== id) : [...cs, id]));

  // Reload a saved cash search into the form + results (no refetch).
  function loadCashSearch(id) {
    const e = history.find((h) => h.id === id);
    if (!e) return;
    setOrigin(e.origin); setDestination(e.destination); setDate(e.date);
    setCabins(e.cabins); setRows(e.rows); setCf(CASH_FILTERS);
    setSearchedAt(e.searchedAt); setSearched(true); setError("");
  }

  const airlinesAvailable = [...new Set(rows.flatMap((r) => r.carriers || []))].sort();
  const toggleAirline = (name) =>
    setCf((f) => ({
      ...f,
      airlines: f.airlines.includes(name) ? f.airlines.filter((a) => a !== name) : [...f.airlines, name],
    }));
  const filtersActive = JSON.stringify(cf) !== JSON.stringify(CASH_FILTERS);
  const shown = applyCashFilters(rows, cf);

  async function run() {
    const o = normalizeAirportInput(origin);
    const d = normalizeAirportInput(destination);
    if (!o || !d) { setError("Enter or pick a 3-letter airport code for both cities (e.g. ONT)."); return; }
    if (o === d) { setError("Origin and destination must differ."); return; }
    if (!date) { setError("Pick a date."); return; }
    if (cabins.length === 0) { setError("Select at least one cabin."); return; }
    setError("");
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchCashFares({ proxyBase, origin: o, destination: d, date, cabins });
      const ts = Date.now();
      setRows(data);
      setCf(CASH_FILTERS);
      setSearchedAt(ts);
      if (!data.length) {
        setError("No live cash fares were returned. Confirm SERPAPI_KEY is configured, then retry.");
        return;
      }
      setHistory((h) =>
        [
          { id: `${o}-${d}-${date}-${ts}`, origin: o, destination: d, date,
            cabins: [...cabins], rows: data, searchedAt: ts },
          ...h.filter((x) => !(x.origin === o && x.destination === d && x.date === date &&
            x.cabins.join() === cabins.join())),
        ].slice(0, CASH_HISTORY_MAX)
      );
    } catch (e) {
      setRows([]);
      setError(e.message || "Cash fare search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="Cash fares">
      {/* ── Search form ── */}
      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-md border border-ink bg-paper-deep p-3">
        <label className="flex min-w-40 flex-1 flex-col gap-1">
          <span className={FIELD_LABEL}>Departing city</span>
          <input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            list="pb-airports-cash"
            placeholder="Type or pick — e.g. ONT"
            className={`${FIELD_INPUT} uppercase`}
          />
        </label>
        <span aria-hidden="true" className="pb-2 text-ink-soft">→</span>
        <label className="flex min-w-40 flex-1 flex-col gap-1">
          <span className={FIELD_LABEL}>Destination</span>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            list="pb-airports-cash"
            placeholder="Type or pick — e.g. PEK"
            className={`${FIELD_INPUT} uppercase`}
          />
        </label>
        <datalist id="pb-airports-cash">
          {AIRPORT_OPTIONS.map((a) => (
            <option key={a.code} value={a.code}>{a.label}</option>
          ))}
        </datalist>
        <label className="flex flex-col gap-1">
          <span className={FIELD_LABEL}>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD_INPUT} />
        </label>

        <fieldset className="flex flex-col gap-1">
          <legend className={FIELD_LABEL}>Cabins (one fare lookup each)</legend>
          <div className="flex flex-wrap gap-1">
            {CABINS.map((c) => {
              const on = cabins.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCabin(c.id)}
                  aria-pressed={on}
                  className="rounded border px-2 py-2 font-data text-xs font-semibold"
                  style={
                    on
                      ? { background: c.color, borderColor: c.color, color: "#fff" }
                      : { borderColor: c.color, color: c.color, background: `${c.color}14` }
                  }
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {history.length > 0 && (
          <label className="flex flex-col gap-1">
            <span className={FIELD_LABEL}>Saved searches</span>
            <select
              value=""
              onChange={(e) => e.target.value && loadCashSearch(e.target.value)}
              className={FIELD_INPUT}
              title="Reload one of your last 20 cash-fare searches"
            >
              <option value="">Saved searches ({history.length})</option>
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.origin}→{h.destination} {h.date} · {h.cabins.length} cabin{h.cabins.length > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="ml-auto rounded bg-magenta px-4 py-2 text-sm font-semibold text-white hover:bg-magenta-deep disabled:opacity-40"
        >
          {loading ? "Fetching fares…" : "Get cash fares"}
        </button>
        <button
          type="button"
          onClick={() => { setRows([]); setSearched(false); setError(""); setSearchedAt(null); setCf(CASH_FILTERS); }}
          disabled={!searched && rows.length === 0}
          className="rounded border border-ink bg-ink px-3 py-2 text-sm font-semibold text-paper hover:bg-magenta-deep hover:text-white disabled:opacity-40"
        >
          Clear fares
        </button>
        {error && <p className="w-full text-xs text-magenta">{error}</p>}
      </div>

      {/* ── Filters (appear once there are results) ── */}
      {rows.length > 0 && !loading && (
        <div className="mb-3 rounded-md border border-line bg-paper-deep p-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-heading">
              Filter cash fares
            </span>
            <button
              type="button"
              onClick={() => setCf(CASH_FILTERS)}
              disabled={!filtersActive}
              className="text-[11px] font-semibold text-magenta underline decoration-dotted disabled:opacity-40"
            >
              Reset filters
            </button>
          </div>

          {airlinesAvailable.length > 0 && (
            <div className="mb-2">
              <span className={FIELD_LABEL}>Airlines (pick any)</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {airlinesAvailable.map((name) => {
                  const on = cf.airlines.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleAirline(name)}
                      aria-pressed={on}
                      className={`rounded border px-2 py-1 font-data text-[11px] font-semibold ${
                        on
                          ? "border-ink bg-ink text-paper"
                          : "border-line bg-card text-ink hover:border-ink"
                      }`}
                    >
                      ✈ {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <div className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Stops</span>
              <div className="flex gap-1">
                {[
                  ["any", "Any", "No stop limit"],
                  ["0", "Direct", "Nonstop flights only"],
                  ["1", "≤1 stop", "Direct and 1-stop itineraries"],
                  ["2+", "≤2+", "Direct, 1-stop, and 2+ stop itineraries"],
                ].map(([val, label, tip]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCf((f) => ({ ...f, stops: val }))}
                    aria-pressed={cf.stops === val}
                    title={tip}
                    className={`rounded border px-2 py-1 text-[11px] ${
                      cf.stops === val
                        ? "border-magenta bg-magenta/10 font-semibold text-ink"
                        : "border-line bg-card text-ink-soft hover:border-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Connection airport(s)</span>
              <input
                value={cf.connections}
                onChange={(e) => setCf((f) => ({ ...f, connections: e.target.value }))}
                placeholder="e.g. MNL, KUL"
                className={`${FIELD_INPUT} w-32 uppercase`}
              />
            </label>

            <div className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Total travel time (h)</span>
              <div className="flex items-center gap-1">
                <input type="number" min={0} value={cf.totalMinH} placeholder="min"
                  onChange={(e) => setCf((f) => ({ ...f, totalMinH: e.target.value }))}
                  className={`${FIELD_INPUT} w-16 text-center`} aria-label="Minimum total travel time in hours" />
                <span className="text-[10px] text-ink-soft">to</span>
                <input type="number" min={0} value={cf.totalMaxH} placeholder="max"
                  onChange={(e) => setCf((f) => ({ ...f, totalMaxH: e.target.value }))}
                  className={`${FIELD_INPUT} w-16 text-center`} aria-label="Maximum total travel time in hours" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Layover duration (h)</span>
              <div className="flex items-center gap-1">
                <input type="number" min={0} step="0.5" value={cf.layoverMinH} placeholder="min"
                  onChange={(e) => setCf((f) => ({ ...f, layoverMinH: e.target.value }))}
                  className={`${FIELD_INPUT} w-16 text-center`} aria-label="Minimum layover in hours" />
                <span className="text-[10px] text-ink-soft">to</span>
                <input type="number" min={0} step="0.5" value={cf.layoverMaxH} placeholder="max"
                  onChange={(e) => setCf((f) => ({ ...f, layoverMaxH: e.target.value }))}
                  className={`${FIELD_INPUT} w-16 text-center`} aria-label="Maximum layover in hours" />
              </div>
            </div>

            <HourRange label="Departure window" value={cf.depWindow}
              onChange={(v) => setCf((f) => ({ ...f, depWindow: v }))} />
            <HourRange label="Arrival window" value={cf.arrWindow}
              onChange={(v) => setCf((f) => ({ ...f, arrWindow: v }))} />
          </div>
        </div>
      )}

      {loading && (
        <div aria-live="polite" className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-md border border-line bg-paper-deep" />
          ))}
        </div>
      )}

      {!loading && !searched && (
        <div className="rounded-md border border-dashed border-line p-6 text-center">
          <p className="font-data text-sm text-ink-soft">
            {prefill
              ? `Route ${prefill.origin} → ${prefill.destination} on ${prefill.date} is pre-filled from your reward selection — press "Get cash fares" to fetch prices.`
              : "Pick a route, date, and cabins to pull the full Google Flights price list — one live lookup per cabin."}
          </p>
        </div>
      )}

      {!loading && searched && rows.length > 0 && (
        <div>
          <p aria-live="polite" className="mb-2 text-xs text-ink-soft">
            <span className="font-data font-semibold text-deal">● LIVE cash fares only</span> · showing{" "}
            <span className="font-data font-semibold text-ink">{shown.length}</span> of{" "}
            <span className="font-data">{rows.length}</span> option{rows.length > 1 ? "s" : ""} ·
            cheapest first
            {searchedAt && (
              <span className="font-data text-[10px]">
                {" "}· fetched{" "}
                {new Date(searchedAt).toLocaleString("en-US", {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            )}
          </p>
          {shown.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {shown.map((f) => (
                <CashRow key={f.id} f={f} />
              ))}
            </ul>
          ) : (
            <div className="rounded-md border border-dashed border-line p-6 text-center">
              <p className="text-sm">No fares match the current filters — loosen them or Reset filters.</p>
            </div>
          )}
        </div>
      )}

      {!loading && searched && rows.length === 0 && !error && (
        <div className="rounded-md border border-dashed border-line p-6 text-center">
          <p className="text-sm">No fares returned for that route and date.</p>
        </div>
      )}
    </section>
  );
}
