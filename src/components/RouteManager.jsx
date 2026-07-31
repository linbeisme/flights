import { useEffect, useState } from "react";
import { AIRPORTS, CABINS, FLEX_OPTIONS, normalizeAirportInput } from "../data/defaults.js";
import { nearbyPreview } from "../api/nearbyAirports.js";

const AIRPORT_OPTIONS = Object.entries(AIRPORTS)
  .map(([code, airport]) => ({ code, label: `${code} — ${airport.name}` }))
  .sort((left, right) => left.code.localeCompare(right.code));

export const MAX_SELECTED = 5;

export function sortSavedRoutes(routes = []) {
  return [...routes].sort((left, right) =>
    String(left.origin || "").localeCompare(String(right.origin || "")) ||
    String(left.destination || "").localeCompare(String(right.destination || "")) ||
    String(left.tripType || "oneway").localeCompare(String(right.tripType || "oneway")) ||
    String(left.date || "").localeCompare(String(right.date || ""))
  );
}
const ROUND_TRIP_FLEX_OPTIONS = FLEX_OPTIONS.filter((option) => Number(option.value) <= 3);

function NearbyControls({ route, onNearbyChange }) {
  const preview = nearbyPreview(route);
  const enabled = route.nearbyOrigin || route.nearbyDestination;
  return (
    <div className="border-t border-line/60 px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <label className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <input type="checkbox" checked={Boolean(route.nearbyOrigin)} onChange={(event) => onNearbyChange({ nearbyOrigin: event.target.checked })} className="accent-magenta" />
          Nearby origin
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <input type="checkbox" checked={Boolean(route.nearbyDestination)} onChange={(event) => onNearbyChange({ nearbyDestination: event.target.checked })} className="accent-magenta" />
          Nearby destination
        </label>
        <label className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-wider text-ink-soft">
          Radius
          <select value={route.nearbyRadiusMiles || 50} onChange={(event) => onNearbyChange({ nearbyRadiusMiles: Number(event.target.value) })} disabled={!enabled} className="rounded border border-line bg-card px-1 py-0.5 font-data text-[11px] normal-case disabled:opacity-40">
            <option value={25}>25 mi</option><option value={50}>50 mi</option><option value={100}>100 mi</option>
          </select>
        </label>
      </div>
      {enabled && (
        <div className="mt-1 rounded border border-line bg-paper-deep px-2 py-1 text-[10px] text-ink-soft">
          <p><span className="font-semibold text-ink">Origins:</span> {preview.origins.join(", ")} · <span className="font-semibold text-ink">Destinations:</span> {preview.destinations.join(", ")}</p>
          <p>{preview.combinations} route combination{preview.combinations === 1 ? "" : "s"}{preview.truncated ? " (capped for API protection)" : ""}</p>
        </div>
      )}
    </div>
  );
}

function RouteStrip({ route, selected, atLimit, onToggle, onRouteChange, onReverse, onDelete, onNearbyChange }) {
  const name = (code) => AIRPORTS[code]?.name || code;
  const disabled = !selected && atLimit && route.tripType !== "roundtrip";
  const isRoundTrip = route.tripType === "roundtrip";
  const flexOptions = isRoundTrip ? ROUND_TRIP_FLEX_OPTIONS : FLEX_OPTIONS;
  return (
    <li className={`rounded border transition-colors ${selected ? "border-magenta bg-card shadow-sm" : "border-line bg-paper hover:bg-card"}`}>
      <div className="flex items-center gap-2 p-2">
        <input type="checkbox" checked={selected} disabled={disabled} onChange={onToggle} className="accent-magenta" aria-label={`Select ${route.origin} to ${route.destination} for search`} title={disabled ? `Up to ${MAX_SELECTED} routes at a time` : "Include in search"} />
        <button type="button" onClick={onToggle} disabled={disabled} className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:opacity-50" title={`${name(route.origin)} to ${name(route.destination)}`}>
          <span className="font-data text-sm font-semibold tracking-wide">{route.origin}</span>
          <span aria-hidden="true" className="text-ink-soft">{isRoundTrip ? "⇄" : "→"}</span>
          <span className="font-data text-sm font-semibold tracking-wide">{route.destination}</span>
          {isRoundTrip && <span className="rounded border border-magenta bg-magenta/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-magenta">Round trip</span>}
        </button>
        <button type="button" onClick={onReverse} className="rounded border border-line px-1.5 py-0.5 font-data text-xs text-ink-soft hover:border-magenta hover:text-magenta" title="Reverse route (swap origin and destination)" aria-label={`Reverse route ${route.origin} to ${route.destination}`}>⇄</button>
        <button type="button" onClick={onDelete} className="rounded px-1 font-data text-xs text-ink-soft hover:text-magenta" title="Delete route" aria-label={`Delete route ${route.origin} to ${route.destination}`}>✕</button>
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-t border-line/60 px-2 py-1.5">
        <label className="text-[11px] uppercase tracking-wider text-ink-soft" htmlFor={`date-${route.id}`}>Depart</label>
        <input id={`date-${route.id}`} type="date" value={route.date} onChange={(event) => onRouteChange({ date: event.target.value })} className="min-w-0 rounded border border-line bg-card px-2 py-0.5 font-data text-xs" />
        <select value={route.flex || 0} onChange={(event) => onRouteChange({ flex: Number(event.target.value) })} aria-label={`Date flexibility for ${route.origin} to ${route.destination}`} title={isRoundTrip ? "Shift outbound and return dates together" : "Also search nearby dates"} className={`rounded border px-1 py-0.5 font-data text-xs ${(route.flex || 0) > 0 ? "border-magenta bg-magenta/10 font-semibold" : "border-line bg-card text-ink-soft"}`}>
          {flexOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {isRoundTrip && (
          <>
            <label className="text-[11px] uppercase tracking-wider text-ink-soft" htmlFor={`return-${route.id}`}>Return</label>
            <input id={`return-${route.id}`} type="date" value={route.returnDate || ""} min={route.date || undefined} onChange={(event) => onRouteChange({ returnDate: event.target.value })} className="min-w-0 rounded border border-line bg-card px-2 py-0.5 font-data text-xs" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-soft">shift together</span>
            <label className="text-[11px] uppercase tracking-wider text-ink-soft" htmlFor={`cash-cabin-${route.id}`}>Cash cabin</label>
            <select id={`cash-cabin-${route.id}`} value={route.cashCabin || "economy"} onChange={(event) => onRouteChange({ cashCabin: event.target.value })} className="min-w-0 rounded border border-line bg-card px-2 py-0.5 font-data text-xs">
              {CABINS.map((cabin) => <option key={cabin.id} value={cabin.id}>{cabin.label}</option>)}
            </select>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-magenta">1 cabin only</span>
          </>
        )}
      </div>
      <NearbyControls route={route} onNearbyChange={onNearbyChange} />
      {isRoundTrip && (
        <p className="border-t border-line/60 bg-magenta/5 px-2 py-1 text-[10px] text-ink-soft">
          Award availability is assembled from two one-way searches. Cash pricing is requested as a true round-trip fare. Maximum flexibility is ±3 days.
        </p>
      )}
    </li>
  );
}

export default function RouteManager({ routes, selectedIds, onToggleSelect, onUpdateRoute, onUpdateNearby, onReverse, onDelete, onAdd, onResetDefaults }) {
  const [newOrigin, setNewOrigin] = useState("");
  const [newDest, setNewDest] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newReturnDate, setNewReturnDate] = useState("");
  const [newTripType, setNewTripType] = useState("oneway");
  const [newFlex, setNewFlex] = useState(0);
  const [newCashCabin, setNewCashCabin] = useState("economy");
  const [newNearbyOrigin, setNewNearbyOrigin] = useState(false);
  const [newNearbyDestination, setNewNearbyDestination] = useState(false);
  const [newNearbyRadius, setNewNearbyRadius] = useState(50);
  const [error, setError] = useState("");
  const [showSavedRoutes, setShowSavedRoutes] = useState(true);
  const [routeTypeFilter, setRouteTypeFilter] = useState("all");
  const atLimit = selectedIds.length >= MAX_SELECTED;
  const roundTripSelected = routes.some((route) => selectedIds.includes(route.id) && route.tripType === "roundtrip");
  const visibleRoutes = routes.filter((route) => routeTypeFilter === "all" || (route.tripType || "oneway") === routeTypeFilter);
  const oneWayCount = routes.filter((route) => (route.tripType || "oneway") === "oneway").length;
  const roundTripCount = routes.filter((route) => route.tripType === "roundtrip").length;

  useEffect(() => {
    if (newTripType === "roundtrip" && newFlex > 3) setNewFlex(3);
  }, [newTripType, newFlex]);

  function handleAdd(event) {
    event.preventDefault();
    const origin = normalizeAirportInput(newOrigin);
    const destination = normalizeAirportInput(newDest);
    if (!origin || !destination) { setError("Enter or pick a 3-letter airport code for both cities (e.g. ONT)."); return; }
    if (origin === destination) { setError("Origin and destination must differ."); return; }
    if (!newDate) { setError("Pick a departure date."); return; }
    if (newTripType === "roundtrip") {
      if (!newReturnDate) { setError("Pick a return date."); return; }
      if (Date.parse(`${newReturnDate}T00:00:00Z`) <= Date.parse(`${newDate}T00:00:00Z`)) { setError("Return date must be after the departure date."); return; }
    }
    setError("");
    onAdd({
      origin,
      destination,
      date: newDate,
      returnDate: newTripType === "roundtrip" ? newReturnDate : null,
      tripType: newTripType,
      cashCabin: newCashCabin,
      flex: newTripType === "roundtrip" ? Math.min(3, newFlex) : newFlex,
      nearbyOrigin: newNearbyOrigin,
      nearbyDestination: newNearbyDestination,
      nearbyRadiusMiles: newNearbyRadius,
    });
    setNewOrigin("");
    setNewDest("");
  }

  const flexOptions = newTripType === "roundtrip" ? ROUND_TRIP_FLEX_OPTIONS : FLEX_OPTIONS;

  return (
    <section aria-labelledby="routes-heading">
      <form onSubmit={handleAdd} className="mb-3 rounded border border-line bg-paper-deep p-2">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-heading">Add a route</p>
        <div className="mb-2 grid grid-cols-2 gap-1 rounded border border-line bg-card p-1" role="group" aria-label="Trip type">
          {[['oneway', 'One way'], ['roundtrip', 'Round trip']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setNewTripType(id)} aria-pressed={newTripType === id} className={`rounded px-2 py-1.5 text-xs font-semibold ${newTripType === id ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-deep"}`}>{label}</button>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <input value={newOrigin} onChange={(event) => setNewOrigin(event.target.value)} list="pb-airports" placeholder="From — e.g. LAX" aria-label="Departing city" className="min-w-0 flex-1 rounded border border-line bg-card px-1.5 py-1.5 font-data text-xs uppercase" />
            <span aria-hidden="true" className="text-ink-soft">{newTripType === "roundtrip" ? "⇄" : "→"}</span>
            <input value={newDest} onChange={(event) => setNewDest(event.target.value)} list="pb-airports" placeholder="To — e.g. LHR" aria-label="Destination city" className="min-w-0 flex-1 rounded border border-line bg-card px-1.5 py-1.5 font-data text-xs uppercase" />
            <datalist id="pb-airports">{AIRPORT_OPTIONS.map((airport) => <option key={airport.code} value={airport.code}>{airport.label}</option>)}</datalist>
          </div>
          <label className="grid grid-cols-[70px_1fr] items-center gap-2 text-[11px] uppercase tracking-wider text-ink-soft">Depart<input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} aria-label="Departure date" className="w-full rounded border border-line bg-card px-1.5 py-1 font-data text-xs text-ink" /></label>
          {newTripType === "roundtrip" && <label className="grid grid-cols-[70px_1fr] items-center gap-2 text-[11px] uppercase tracking-wider text-ink-soft">Return<input type="date" value={newReturnDate} min={newDate || undefined} onChange={(event) => setNewReturnDate(event.target.value)} aria-label="Return date" className="w-full rounded border border-line bg-card px-1.5 py-1 font-data text-xs text-ink" /></label>}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <label className="text-[11px] text-ink-soft" htmlFor="new-route-flex">Date flexibility</label>
          <select id="new-route-flex" value={newFlex} onChange={(event) => setNewFlex(Number(event.target.value))} className="flex-1 rounded border border-line bg-card px-1.5 py-1 font-data text-xs">{flexOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        </div>
        {newTripType === "roundtrip" && (
          <div className="mt-1.5 flex items-center gap-2">
            <label className="text-[11px] text-ink-soft" htmlFor="new-route-cash-cabin">Round-trip cash cabin</label>
            <select id="new-route-cash-cabin" value={newCashCabin} onChange={(event) => setNewCashCabin(event.target.value)} className="flex-1 rounded border border-line bg-card px-1.5 py-1 font-data text-xs">{CABINS.map((cabin) => <option key={cabin.id} value={cabin.id}>{cabin.label}</option>)}</select>
          </div>
        )}
        <div className="mt-2 rounded border border-line bg-card p-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <label className="flex items-center gap-1.5 text-[11px]"><input type="checkbox" checked={newNearbyOrigin} onChange={(event) => setNewNearbyOrigin(event.target.checked)} className="accent-magenta" />Nearby origin</label>
            <label className="flex items-center gap-1.5 text-[11px]"><input type="checkbox" checked={newNearbyDestination} onChange={(event) => setNewNearbyDestination(event.target.checked)} className="accent-magenta" />Nearby destination</label>
            <label className="ml-auto flex items-center gap-1 text-[11px]">Radius<select value={newNearbyRadius} onChange={(event) => setNewNearbyRadius(Number(event.target.value))} className="rounded border border-line bg-paper px-1 py-0.5 font-data text-[11px]"><option value={25}>25 mi</option><option value={50}>50 mi</option><option value={100}>100 mi</option></select></label>
          </div>
        </div>
        {newTripType === "roundtrip" && <p className="mt-1.5 rounded border border-magenta/40 bg-magenta/5 px-2 py-1 text-[10px] text-ink-soft">Whole-trip flexibility shifts both dates by the same number of days. Maximum ±3 days. Cash pricing uses one cabin at a time.</p>}
        {error && <p className="mt-1.5 text-[11px] text-magenta">{error}</p>}
        <button type="submit" className="mt-2 w-full rounded bg-ink px-2 py-1.5 text-xs font-semibold text-paper hover:bg-magenta-deep hover:text-white">Save route</button>
      </form>

      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 id="routes-heading" className="text-xs font-semibold uppercase tracking-[0.15em] text-heading">Saved routes</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowSavedRoutes((value) => !value)} className="rounded border border-line bg-card px-2 py-1 text-[11px] font-semibold hover:border-magenta hover:text-magenta" aria-expanded={showSavedRoutes} aria-controls="saved-routes-list">{showSavedRoutes ? "Hide routes" : `Show routes (${routes.length})`}</button>
          <button type="button" onClick={onResetDefaults} className="text-[15px] font-semibold text-magenta underline decoration-dotted hover:text-magenta-deep" title="Reload the preset routes (nothing gets auto-selected)">Restore defaults</button>
        </div>
      </div>
      <p className="mb-2 text-[11px] text-ink-soft">Check up to {MAX_SELECTED} one-way routes. A selected round trip is searched by itself so its outbound and return legs stay paired.</p>
      <div className="mb-2 grid grid-cols-3 gap-1 rounded border border-line bg-paper-deep p-1" role="group" aria-label="Filter saved routes by trip type">
        {[
          ["all", `All (${routes.length})`],
          ["oneway", `One way (${oneWayCount})`],
          ["roundtrip", `Round trip (${roundTripCount})`],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setRouteTypeFilter(id)}
            aria-pressed={routeTypeFilter === id}
            className={`rounded px-1.5 py-1 text-[10px] font-semibold ${routeTypeFilter === id ? "bg-ink text-paper" : "bg-card text-ink-soft hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {roundTripSelected && <p className="mb-2 rounded border border-magenta bg-magenta/5 px-2 py-1 text-[10px] text-magenta">Round-trip selection is exclusive. Selecting a one-way route will switch back to the normal multi-route workflow.</p>}
      {showSavedRoutes ? (
        <ul id="saved-routes-list" className="flex max-h-[48vh] flex-col gap-1.5 overflow-y-auto pr-1 lg:max-h-[50vh]">
          {visibleRoutes.map((route) => (
            <RouteStrip key={route.id} route={route} selected={selectedIds.includes(route.id)} atLimit={atLimit} onToggle={() => onToggleSelect(route.id)} onRouteChange={(patch) => onUpdateRoute(route.id, patch)} onNearbyChange={(patch) => onUpdateNearby(route.id, patch)} onReverse={() => onReverse(route.id)} onDelete={() => onDelete(route.id)} />
          ))}
          {visibleRoutes.length === 0 && <li className="rounded border border-dashed border-line p-3 text-xs text-ink-soft">No saved routes match this trip-type filter.</li>}
        </ul>
      ) : (
        <p id="saved-routes-list" className="rounded border border-dashed border-line bg-paper-deep px-2 py-2 text-[11px] text-ink-soft">{routes.length} saved route{routes.length === 1 ? "" : "s"} hidden · {selectedIds.length} selected for search.</p>
      )}
    </section>
  );
}
