import { useEffect, useRef, useState } from "react";
import { AIRPORTS, CABINS, normalizeAirportInput } from "../data/defaults.js";
import { searchCashFares, cashSearchDates, formatDuration, connectionLayoverDetails, applyCashFilters, filterCashRowsByCabins, CASH_FILTERS } from "../api/flightApi.js";
import { BASE_CURRENCY, formatMoney } from "../api/currency.js";
import { roundTripDatePairs, searchRoundTripCashFares } from "../api/roundTrip.js";
import BookingOptions from "./BookingOptions.jsx";

// ── CashFares (v9) ──────────────────────────────────────────────────
// • Route/date pre-fill from the reward tab's first selected route
//   (fields only — nothing runs until "Get cash fares" is pressed).
// • Airport inputs accept ANY typed 3-letter code, with the 1,000-airport
//   catalog offered as suggestions.
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

function airlineText(carriers = [], operatingCarriers = []) {
  const ticketing = [...new Set((carriers || []).filter(Boolean))];
  const operating = [...new Set((operatingCarriers || []).filter(Boolean))].filter((name) => !ticketing.includes(name));
  return {
    ticketing: ticketing.join(" · ") || "Airline not supplied",
    operating: operating.length ? operating.join(" · ") : "",
  };
}

function HourRange({ label, value, onChange }) {
  const [h1, h2] = value;
  const clamp = (v) => Math.max(0, Math.min(24, Number.isFinite(v) ? v : 0));
  return (
    <div className="min-w-0 rounded border border-line bg-card p-2">
      <span className={`${FIELD_LABEL} mb-1 block`}>{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number" min={0} max={24} value={h1}
          aria-label={`${label} from hour`}
          onChange={(e) => onChange([clamp(Number(e.target.value)), h2])}
          className={`${FIELD_INPUT} min-w-0 flex-1 text-center`}
        />
        <span className="text-[10px] text-ink-soft">to</span>
        <input
          type="number" min={0} max={24} value={h2}
          aria-label={`${label} to hour`}
          onChange={(e) => onChange([h1, clamp(Number(e.target.value))])}
          className={`${FIELD_INPUT} min-w-0 flex-1 text-center`}
        />
        <span className="text-[10px] text-ink-soft">h</span>
      </div>
    </div>
  );
}

function CashRow({ f, proxyBase }) {
  const cab = cabinMeta(f.cabin);
  const airlines = airlineText(f.carriers, f.operatingCarriers);
  return (
    <li className="rounded-md border border-line bg-card p-3 shadow-sm transition-colors hover:border-ink/50">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-52 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 font-data">
            <span className="text-2xl font-bold leading-none">{f.departTime || "—"}</span>
            <span aria-hidden="true" className="text-lg text-ink-soft">→</span>
            <span className="text-2xl font-bold leading-none">{f.arriveTime || "—"}</span>
            {f.totalMinutes != null && <span className="text-sm font-medium text-ink-soft">· {formatDuration(f.totalMinutes)} total</span>}
          </div>
          <div className="mt-1 text-xs text-ink-soft">
            {f.stops == null ? (
              "Schedule unavailable"
            ) : f.stops === 0 ? (
              "Nonstop"
            ) : (
              <>
                {f.stops} stop{f.stops > 1 ? "s" : ""}
                {connectionLayoverDetails(f.connections, f.layovers).length > 0 && (
                  <>
                    {" via "}
                    {connectionLayoverDetails(f.connections, f.layovers).map((detail, i) => (
                      <span key={`${detail.airport}-${i}`}>
                        {i > 0 && ", "}
                        <span
                          className="rounded bg-magenta/10 px-1 font-data text-sm font-bold text-magenta"
                          title={`Connection airport ${detail.airport}; ${detail.minutes == null ? "layover duration unavailable" : `layover ${formatDuration(detail.minutes)}`}`}
                        >
                          {detail.label}
                        </span>
                      </span>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded border px-1.5 py-0.5 font-data text-[10px] font-semibold"
              style={{ color: cab.color, borderColor: cab.color, background: `${cab.color}1a` }}
            >
              {cab.label}
            </span>
            {f.searchDate && <span className="rounded border border-line bg-paper-deep px-1.5 py-0.5 font-data text-[10px] font-semibold text-ink-soft">{f.searchDate}</span>}
          </div>
        </div>

        {/* Airline shown prominently, right next to the fare */}
        <div className="text-right">
          <div className="mb-1 font-data text-base font-bold leading-tight text-ink" title={`Ticketing airline: ${airlines.ticketing}${airlines.operating ? `; operated by ${airlines.operating}` : ""}`}>
            <span className="text-fresh" aria-hidden="true">✈</span> {airlines.ticketing}
            {airlines.operating && <span className="ml-1 text-xs font-semibold text-ink-soft">[Operated by {airlines.operating}]</span>}
          </div>
          <span
            className="inline-block rounded bg-deal-soft px-2 py-1 font-data text-xl font-bold leading-tight text-deal"
            title="Live cash fare from Google Flights through SerpApi"
          >
            {formatMoney(f.price, f.currency || BASE_CURRENCY)}
          </span>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-deal">
            live cash fare
          </div>
          <BookingOptions proxyBase={proxyBase} bookingToken={f.bookingToken} searchUrl={f.searchUrl} />
        </div>
      </div>
    </li>
  );
}

function RoundTripLeg({ label, leg }) {
  return (
    <div className="rounded border border-line bg-paper-deep p-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-magenta">{label}</p>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-2 font-data">
        <span className="text-xl font-bold">{leg?.departTime || "—"}</span>
        <span className="text-ink-soft">→</span>
        <span className="text-xl font-bold">{leg?.arriveTime || "—"}</span>
        {leg?.totalMinutes != null && <span className="text-xs font-medium text-ink-soft">· {formatDuration(leg.totalMinutes)} total</span>}
      </div>
      <p className="text-[11px] text-ink-soft">
        {leg?.stops == null ? "Schedule unavailable" : leg.stops === 0 ? "Nonstop" : `${leg.stops} stop${leg.stops === 1 ? "" : "s"}`}
        {connectionLayoverDetails(leg?.connections, leg?.layovers).length ? ` via ${connectionLayoverDetails(leg?.connections, leg?.layovers).map((detail) => detail.label).join(" · ")}` : ""}
      </p>
      {leg?.flightNumbers?.length > 0 && <p className="font-data text-[10px] text-ink-soft">{leg.flightNumbers.join(" / ")}</p>}
    </div>
  );
}

function RoundTripCashRow({ f, proxyBase }) {
  const cab = cabinMeta(f.cabin);
  const airlines = airlineText(f.carriers, f.operatingCarriers);
  return (
    <li className="rounded-md border-2 border-line bg-card p-3 shadow-sm transition-colors hover:border-ink/50">
      <div className="grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_minmax(230px,auto)]">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-magenta">True round-trip fare</p>
          <p className="font-data text-sm font-bold">{f.origin} ⇄ {f.destination} · {f.searchDate} to {f.returnDate}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded border px-1.5 py-0.5 font-data text-[10px] font-semibold" style={{ color: cab.color, borderColor: cab.color, background: `${cab.color}1a` }}>{cab.label}</span>
            {Number.isFinite(f.shift) && f.shift !== 0 && <span className="rounded border border-magenta bg-magenta/10 px-1.5 py-0.5 font-data text-[10px] font-semibold text-magenta">whole trip {f.shift > 0 ? "+" : ""}{f.shift}d</span>}
          </div>
        </div>
        <div className="rounded border border-line bg-paper-deep px-3 py-2 text-right">
          <div className="font-data text-sm font-bold leading-tight text-ink" title={`Ticketing airline: ${airlines.ticketing}${airlines.operating ? `; operated by ${airlines.operating}` : ""}`}>
            <span className="text-fresh" aria-hidden="true">✈</span> {airlines.ticketing}
            {airlines.operating && <span className="ml-1 block text-[10px] font-semibold text-ink-soft">[Operated by {airlines.operating}]</span>}
          </div>
          <span className="mt-1 inline-block rounded bg-deal-soft px-2.5 py-1 font-data text-2xl font-bold text-deal">{formatMoney(f.price, f.currency || BASE_CURRENCY)}</span>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-deal">complete round trip · 1 traveler</div>
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <RoundTripLeg label="Outbound" leg={f.outbound} />
        <RoundTripLeg label="Return" leg={f.return} />
      </div>
      <p className="mt-2 text-[10px] text-ink-soft">{f.providerRequests ? `${f.providerRequests} SerpApi request${f.providerRequests === 1 ? "" : "s"} used for this date pair` : "Live airline and operating-airline details are shown above the fare."}</p>
      <BookingOptions proxyBase={proxyBase} bookingToken={f.bookingToken} searchUrl={f.searchUrl} />
    </li>
  );
}

export default function CashFares({ proxyBase, prefill, autoResults }) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [tripType, setTripType] = useState("oneway");
  const [dateFlex, setDateFlex] = useState(0);
  const [cabins, setCabins] = useState(["economy"]);
  const [searchedCabins, setSearchedCabins] = useState([]);
  const [rows, setRows] = useState([]);
  const [cf, setCf] = useState(CASH_FILTERS);
  const [searchedAt, setSearchedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState(loadCashHistory);
  const lastAutoId = useRef(null);

  // Selecting a route on the reward tab pre-fills the fields here.
  // No search runs — that stays behind the "Get cash fares" button.
  useEffect(() => {
    if (prefill) {
      const nextTripType = prefill.tripType === "roundtrip" ? "roundtrip" : "oneway";
      setOrigin(prefill.origin);
      setDestination(prefill.destination);
      setDate(prefill.date);
      setReturnDate(prefill.returnDate || "");
      setTripType(nextTripType);
      setDateFlex(nextTripType === "roundtrip"
        ? ([0, 1, 3].includes(Number(prefill.flex)) ? Number(prefill.flex) : 0)
        : ([0, 1, 3, 7].includes(Number(prefill.flex)) ? Number(prefill.flex) : 0));
      if (nextTripType === "roundtrip") setCabins([prefill.cashCabin || "economy"]);
      return;
    }
    setTripType("oneway");
    setReturnDate("");
  }, [prefill?.origin, prefill?.destination, prefill?.date, prefill?.returnDate, prefill?.tripType, prefill?.cashCabin, prefill?.flex]);

  // Reward searches already request live cash-fare lists for CPP calculations.
  // Reuse those exact results here without changing the existing Cash Fares UI
  // or consuming a second set of cash-fare lookups.
  useEffect(() => {
    if (!autoResults?.id || lastAutoId.current === autoResults.id) return;
    lastAutoId.current = autoResults.id;
    const liveRows = (autoResults.rows || []).filter((row) => row.source === "live");
    const availableCabins = [...new Set(liveRows.map((row) => row.cabin).filter(Boolean))];
    const validCabins = new Set(CABINS.map((cabin) => cabin.id));
    const requestedCabins = Array.isArray(autoResults.cabins)
      ? autoResults.cabins.filter((cabin) => validCabins.has(cabin))
      : [];
    const nextCabins = requestedCabins.length ? requestedCabins : (availableCabins.length ? availableCabins : ["economy"]);

    const nextTripType = autoResults.tripType === "roundtrip" ? "roundtrip" : "oneway";
    const savedOrigin = autoResults.origin || prefill?.origin || liveRows[0]?.origin || "";
    const savedDestination = autoResults.destination || prefill?.destination || liveRows[0]?.destination || "";
    const savedDate = autoResults.date || prefill?.date || liveRows[0]?.searchDate || "";
    const savedReturnDate = nextTripType === "roundtrip" ? (autoResults.returnDate || prefill?.returnDate || liveRows[0]?.returnDate || "") : "";
    const savedFlex = nextTripType === "roundtrip" ? Math.min(3, Number(autoResults.flex || prefill?.flex || 0)) : Number(autoResults.flex || prefill?.flex || 0);
    const selectedCabins = nextCabins.length ? nextCabins : [autoResults.cabin || "economy"];
    setOrigin(savedOrigin);
    setDestination(savedDestination);
    setDate(savedDate);
    setReturnDate(savedReturnDate);
    setTripType(nextTripType);
    setDateFlex(savedFlex);
    setRows(liveRows);
    setCabins(selectedCabins);
    setSearchedCabins(availableCabins);
    setCf(CASH_FILTERS);
    setSearchedAt(autoResults.searchedAt || Date.now());
    setSearched(true);
    setLoading(false);
    setError("");
    setNotice("");
    if (!autoResults.restoreOnly && liveRows.length && savedOrigin && savedDestination && savedDate) {
      const savedAt = autoResults.searchedAt || Date.now();
      const savedEntry = {
        id: `auto-${nextTripType}-${savedOrigin}-${savedDestination}-${savedDate}-${savedReturnDate || "oneway"}-${savedAt}`,
        tripType: nextTripType,
        origin: savedOrigin,
        destination: savedDestination,
        date: savedDate,
        returnDate: savedReturnDate,
        flex: savedFlex,
        cabins: selectedCabins,
        rows: liveRows,
        searchedAt: savedAt,
        source: "recommendations",
      };
      setHistory((current) => [savedEntry, ...current.filter((entry) => entry.id !== savedEntry.id)].slice(0, CASH_HISTORY_MAX));
    }
  }, [autoResults]);

  useEffect(() => saveCashHistory(history), [history]);

  const toggleCabin = (id) => {
    const wasSelected = cabins.includes(id);
    const next = wasSelected ? cabins.filter((x) => x !== id) : [...cabins, id];
    setCabins(next);
    setError("");

    if (searched || rows.length > 0) {
      const label = cabinMeta(id).label;
      if (wasSelected) {
        setNotice(`${label} fares are hidden. Stored search results remain available until Clear fares is clicked.`);
      } else if (searchedCabins.includes(id)) {
        setNotice(`${label} fares are visible again from the stored search results.`);
      } else {
        setNotice(`${label} was added to the selection. Existing fares remain visible; press Get cash fares to fetch this newly selected cabin.`);
      }
    }
  };

  // Reload a saved cash search into the form + results (no refetch).
  function loadCashSearch(id) {
    const e = history.find((h) => h.id === id);
    if (!e) return;
    setOrigin(e.origin); setDestination(e.destination); setDate(e.date); setReturnDate(e.returnDate || "");
    setTripType(e.tripType === "roundtrip" ? "roundtrip" : "oneway"); setDateFlex(e.tripType === "roundtrip" ? Math.min(3, e.flex || 0) : (e.flex || 0));
    setCabins(e.cabins?.length ? e.cabins : ["economy"]); setSearchedCabins(e.cabins || []); setRows(e.rows); setCf(CASH_FILTERS);
    setSearchedAt(e.searchedAt); setSearched(true); setError(""); setNotice("");
  }

  const airlinesAvailable = [...new Set(rows.flatMap((r) => r.carriers || []))].sort();
  const toggleAirline = (name) =>
    setCf((f) => ({
      ...f,
      airlines: f.airlines.includes(name) ? f.airlines.filter((a) => a !== name) : [...f.airlines, name],
    }));
  const filtersActive = JSON.stringify(cf) !== JSON.stringify(CASH_FILTERS);
  const activeCabinRows = filterCashRowsByCabins(rows, cabins);
  const hiddenCabinRows = rows.length - activeCabinRows.length;
  const shown = applyCashFilters(activeCabinRows, cf);
  const visibleShown = tripType === "roundtrip" ? shown.slice(0, 20) : shown;
  const lookupDates = tripType === "roundtrip" ? roundTripDatePairs(date, returnDate, dateFlex) : cashSearchDates(date, dateFlex);
  const lookupCount = lookupDates.length * cabins.length;

  async function run() {
    const o = normalizeAirportInput(origin);
    const d = normalizeAirportInput(destination);
    if (!o || !d) { setError("Enter or pick a 3-letter airport code for both cities (e.g. ONT)."); return; }
    if (o === d) { setError("Origin and destination must differ."); return; }
    if (!date) { setError("Pick a departure date."); return; }
    if (tripType === "roundtrip") {
      if (!returnDate) { setError("Pick a return date."); return; }
      if (Date.parse(`${returnDate}T00:00:00Z`) <= Date.parse(`${date}T00:00:00Z`)) { setError("Return date must be after the departure date."); return; }
      if (![0, 1, 3].includes(Number(dateFlex))) { setError("Round-trip flexibility is limited to exact dates, ±1 day, or ±3 days."); return; }
    }
    if (cabins.length === 0) { setError("Select at least one cabin."); return; }
    setError("");
    setNotice("");
    setLoading(true);
    setSearched(true);
    try {
      const data = tripType === "roundtrip"
        ? (await Promise.all(cabins.map((cabin) =>
            searchRoundTripCashFares({ proxyBase, origin: o, destination: d, departDate: date, returnDate, flex: dateFlex, cabin, adults: 1 })
          ))).flat().sort((a, b) => a.price - b.price || String(a.searchDate).localeCompare(String(b.searchDate)))
        : await searchCashFares({ proxyBase, origin: o, destination: d, date, flex: dateFlex, cabins });
      const ts = Date.now();
      if (!data.length) {
        setError("No live cash fares were returned. Confirm SERPAPI_KEY is configured, then retry.");
        if (rows.length > 0) setNotice("No new fares were returned. Your previous cash-fare results remain available until Clear fares is clicked.");
        return;
      }
      setRows(data);
      setSearchedCabins([...cabins]);
      setCf(CASH_FILTERS);
      setSearchedAt(ts);
      setHistory((h) =>
        [
          { id: `${o}-${d}-${date}-${tripType === "roundtrip" ? returnDate : "oneway"}-f${dateFlex}-${ts}`, tripType, origin: o, destination: d, date, returnDate: tripType === "roundtrip" ? returnDate : "", flex: dateFlex,
            cabins: [...cabins], rows: data, searchedAt: ts },
          ...h.filter((x) => !(x.tripType === tripType && x.origin === o && x.destination === d && x.date === date && (x.returnDate || "") === (tripType === "roundtrip" ? returnDate : "") && Number(x.flex || 0) === dateFlex &&
            x.cabins.join() === cabins.join())),
        ].slice(0, CASH_HISTORY_MAX)
      );
    } catch (e) {
      setError(e.message || "Cash fare search failed.");
      if (rows.length > 0) setNotice("The new cash-fare search failed. Your previous results remain available until Clear fares is clicked.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="Cash fares">
      {/* ── Search form ── */}
      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-md border border-ink bg-paper-deep p-3">
        <div className="w-full flex flex-wrap items-center gap-2">
          <span className={FIELD_LABEL}>Trip type</span>
          {[['oneway', 'One way'], ['roundtrip', 'Round trip']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTripType(id);
                if (id === "roundtrip") {
                  setDateFlex((value) => Math.min(3, Number(value || 0)));
                  setCabins((value) => (value.length ? value : ["economy"]));
                }
                setRows([]); setSearched(false); setError(""); setNotice("");
              }}
              aria-pressed={tripType === id}
              className={`rounded border px-3 py-1.5 text-xs font-semibold ${tripType === id ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-soft"}`}
            >
              {label}
            </button>
          ))}
          {tripType === "roundtrip" && <span className="text-[10px] text-magenta">Maximum ±3 days · multiple cabins allowed · dates shift together</span>}
        </div>
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
        <span aria-hidden="true" className="pb-2 text-ink-soft">{tripType === "roundtrip" ? "⇄" : "→"}</span>
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
          <span className={FIELD_LABEL}>{tripType === "roundtrip" ? "Depart date" : "Date"}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD_INPUT} />
        </label>
        {tripType === "roundtrip" && (
          <label className="flex flex-col gap-1">
            <span className={FIELD_LABEL}>Return date</span>
            <input type="date" value={returnDate} min={date || undefined} onChange={(e) => setReturnDate(e.target.value)} className={FIELD_INPUT} />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className={FIELD_LABEL}>{tripType === "roundtrip" ? "Whole-trip flexibility" : "Date flexibility"}</span>
          <select value={dateFlex} onChange={(e) => setDateFlex(Number(e.target.value))} className={FIELD_INPUT}>
            <option value={0}>Exact date{tripType === "roundtrip" ? "s" : ""}</option>
            <option value={1}>± 1 day</option>
            <option value={3}>± 3 days</option>
            {tripType !== "roundtrip" && <option value={7}>± 7 days</option>}
          </select>
        </label>

        <fieldset className="flex flex-col gap-1">
          <legend className={FIELD_LABEL}>{tripType === "roundtrip" ? "Cabins (one round-trip lookup set each)" : "Cabins (one fare lookup each)"}</legend>
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
              title="Reload a saved cash-fare search, including round trips"
            >
              <option value="">Saved searches ({history.length})</option>
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.origin}{h.tripType === "roundtrip" ? "⇄" : "→"}{h.destination} {h.date}{h.tripType === "roundtrip" && h.returnDate ? `–${h.returnDate}` : ""}{h.flex ? ` ${h.tripType === "roundtrip" ? "shift " : ""}±${h.flex}d` : ""} · {h.cabins.length} cabin{h.cabins.length > 1 ? "s" : ""}
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
          {loading ? "Fetching fares…" : `${tripType === "roundtrip" ? "Get round-trip fares" : "Get cash fares"}${lookupCount > 1 ? ` (${lookupCount} lookups)` : ""}`}
        </button>
        <button
          type="button"
          onClick={() => { setRows([]); setSearchedCabins([]); setSearched(false); setError(""); setNotice(""); setSearchedAt(null); setCf(CASH_FILTERS); }}
          disabled={!searched && rows.length === 0}
          className="rounded border border-ink bg-ink px-3 py-2 text-sm font-semibold text-paper hover:bg-magenta-deep hover:text-white disabled:opacity-40"
        >
          Clear fares
        </button>
        <p className="w-full text-[10px] text-ink-soft">
          {tripType === "roundtrip"
            ? `Whole-trip flexibility preserves trip length and shifts both dates together. Current selection: ${lookupCount || 0} lookup${lookupCount === 1 ? "" : "s"} across ${lookupDates.length || 0} date pair${lookupDates.length === 1 ? "" : "s"} and ${cabins.length || 0} cabin${cabins.length === 1 ? "" : "s"}; SerpApi may use multiple provider requests per pair and cabin to retrieve complete return choices.`
            : `Date flexibility runs one live cash-fare lookup per selected cabin per date. Current selection: ${lookupCount || 0} lookup${lookupCount === 1 ? "" : "s"} across ${lookupDates.length || 0} date${lookupDates.length === 1 ? "" : "s"}.`}
        </p>
        {notice && (
          <p role="status" className="w-full rounded border border-warn bg-warn/10 px-2 py-1 text-xs text-warn">{notice}</p>
        )}
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
                      <span className="text-fresh" aria-hidden="true">✈</span> {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
            <div className="min-w-0 rounded border border-line bg-card p-2 sm:col-span-2 xl:col-span-2 2xl:col-span-2">
              <span className={`${FIELD_LABEL} mb-1 block`}>Stops</span>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
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
                    className={`min-w-0 whitespace-nowrap rounded border px-1.5 py-1 text-[11px] ${
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

            <label className="min-w-0 rounded border border-line bg-card p-2 sm:col-span-2 xl:col-span-2 2xl:col-span-2">
              <span className={`${FIELD_LABEL} mb-1 block`}>Connection airport(s)</span>
              <input
                value={cf.connections}
                onChange={(e) => setCf((f) => ({ ...f, connections: e.target.value }))}
                placeholder="e.g. MNL, KUL"
                className={`${FIELD_INPUT} mt-1 w-full uppercase`}
              />
            </label>

            <div className="min-w-0 rounded border border-line bg-card p-2">
              <span className={`${FIELD_LABEL} mb-1 block`}>Total travel time (h)</span>
              <div className="flex items-center gap-1">
                <input type="number" min={0} value={cf.totalMinH} placeholder="min"
                  onChange={(e) => setCf((f) => ({ ...f, totalMinH: e.target.value }))}
                  className={`${FIELD_INPUT} min-w-0 flex-1 text-center`} aria-label="Minimum total travel time in hours" />
                <span className="text-[10px] text-ink-soft">to</span>
                <input type="number" min={0} value={cf.totalMaxH} placeholder="max"
                  onChange={(e) => setCf((f) => ({ ...f, totalMaxH: e.target.value }))}
                  className={`${FIELD_INPUT} min-w-0 flex-1 text-center`} aria-label="Maximum total travel time in hours" />
              </div>
            </div>

            <div className="min-w-0 rounded border border-line bg-card p-2">
              <span className={`${FIELD_LABEL} mb-1 block`}>Layover duration (h)</span>
              <div className="flex items-center gap-1">
                <input type="number" min={0} step="0.5" value={cf.layoverMinH} placeholder="min"
                  onChange={(e) => setCf((f) => ({ ...f, layoverMinH: e.target.value }))}
                  className={`${FIELD_INPUT} min-w-0 flex-1 text-center`} aria-label="Minimum layover in hours" />
                <span className="text-[10px] text-ink-soft">to</span>
                <input type="number" min={0} step="0.5" value={cf.layoverMaxH} placeholder="max"
                  onChange={(e) => setCf((f) => ({ ...f, layoverMaxH: e.target.value }))}
                  className={`${FIELD_INPUT} min-w-0 flex-1 text-center`} aria-label="Maximum layover in hours" />
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
              ? prefill.tripType === "roundtrip"
                ? `Round trip ${prefill.origin} ⇄ ${prefill.destination}, ${prefill.date} to ${prefill.returnDate}, is pre-filled from your reward selection.`
                : `Route ${prefill.origin} → ${prefill.destination} on ${prefill.date} is pre-filled from your reward selection — press "Get cash fares" to fetch prices.`
              : tripType === "roundtrip"
                ? "Pick exact departure and return dates, one or more cabins, and optional whole-trip flexibility up to ±3 days."
                : "Pick a route, date, and cabins to pull the full Google Flights price list — one live lookup per cabin."}
          </p>
        </div>
      )}

      {!loading && searched && rows.length > 0 && (
        <div>
          <p aria-live="polite" className="mb-2 text-xs text-ink-soft">
            <span className="font-data font-semibold text-deal">● LIVE {tripType === "roundtrip" ? "round-trip " : ""}cash fares only</span> · showing{" "}
            <span className="font-data font-semibold text-ink">{visibleShown.length}</span> of{" "}
            <span className="font-data">{activeCabinRows.length}</span> selected-cabin option{activeCabinRows.length === 1 ? "" : "s"} ·
            cheapest first
            {tripType === "roundtrip" && shown.length > 20 && <span className="font-data text-[10px]"> · first 20 of {shown.length} matching round-trip options shown</span>}
            {hiddenCabinRows > 0 && <span className="font-data text-[10px]"> · {hiddenCabinRows} stored fare{hiddenCabinRows === 1 ? "" : "s"} hidden by cabin selection</span>}
            {searchedAt && (
              <span className="font-data text-[10px]">
                {" "}· fetched{" "}
                {new Date(searchedAt).toLocaleString("en-US", {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            )}
          </p>
          {visibleShown.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {visibleShown.map((f) => (
                tripType === "roundtrip" ? <RoundTripCashRow key={f.id} f={f} proxyBase={proxyBase} /> : <CashRow key={f.id} f={f} proxyBase={proxyBase} />
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
