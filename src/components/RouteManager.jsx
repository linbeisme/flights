import { useState } from "react";
import { AIRPORTS, FLEX_OPTIONS, normalizeAirportInput } from "../data/defaults.js";
import { nearbyPreview } from "../api/nearbyAirports.js";

const AIRPORT_OPTIONS = Object.entries(AIRPORTS)
  .map(([code, airport]) => ({ code, label: `${code} — ${airport.name}` }))
  .sort((left, right) => left.code.localeCompare(right.code));

export const MAX_SELECTED = 5;

function NearbyControls({ route, onNearbyChange }) {
  const preview = nearbyPreview(route);
  const enabled = route.nearbyOrigin || route.nearbyDestination;
  return (
    <div className="border-t border-line/60 px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <label className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <input
            type="checkbox"
            checked={Boolean(route.nearbyOrigin)}
            onChange={(event) => onNearbyChange({ nearbyOrigin: event.target.checked })}
            className="accent-magenta"
          />
          Nearby origin
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <input
            type="checkbox"
            checked={Boolean(route.nearbyDestination)}
            onChange={(event) => onNearbyChange({ nearbyDestination: event.target.checked })}
            className="accent-magenta"
          />
          Nearby destination
        </label>
        <label className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-wider text-ink-soft">
          Radius
          <select
            value={route.nearbyRadiusMiles || 50}
            onChange={(event) => onNearbyChange({ nearbyRadiusMiles: Number(event.target.value) })}
            disabled={!enabled}
            className="rounded border border-line bg-card px-1 py-0.5 font-data text-[11px] normal-case disabled:opacity-40"
          >
            <option value={25}>25 mi</option>
            <option value={50}>50 mi</option>
            <option value={100}>100 mi</option>
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

function RouteStrip({ route, selected, atLimit, onToggle, onDateChange, onFlexChange, onReverse, onDelete, onNearbyChange }) {
  const name = (code) => AIRPORTS[code]?.name || code;
  const disabled = !selected && atLimit;
  return (
    <li className={`rounded border transition-colors ${selected ? "border-magenta bg-card shadow-sm" : "border-line bg-paper hover:bg-card"}`}>
      <div className="flex items-center gap-2 p-2">
        <input
          type="checkbox"
          checked={selected}
          disabled={disabled}
          onChange={onToggle}
          className="accent-magenta"
          aria-label={`Select ${route.origin} to ${route.destination} for search`}
          title={disabled ? `Up to ${MAX_SELECTED} routes at a time` : "Include in search"}
        />
        <button type="button" onClick={onToggle} disabled={disabled} className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:opacity-50" title={`${name(route.origin)} to ${name(route.destination)}`}>
          <span className="font-data text-sm font-semibold tracking-wide">{route.origin}</span>
          <span aria-hidden="true" className="text-ink-soft">→</span>
          <span className="font-data text-sm font-semibold tracking-wide">{route.destination}</span>
        </button>
        <button type="button" onClick={onReverse} className="rounded border border-line px-1.5 py-0.5 font-data text-xs text-ink-soft hover:border-magenta hover:text-magenta" title="Reverse route (swap origin and destination)" aria-label={`Reverse route ${route.origin} to ${route.destination}`}>⇄</button>
        <button type="button" onClick={onDelete} className="rounded px-1 font-data text-xs text-ink-soft hover:text-magenta" title="Delete route" aria-label={`Delete route ${route.origin} to ${route.destination}`}>✕</button>
      </div>
      <div className="flex items-center gap-2 border-t border-line/60 px-2 py-1.5">
        <label className="text-[11px] uppercase tracking-wider text-ink-soft" htmlFor={`date-${route.id}`}>Depart</label>
        <input id={`date-${route.id}`} type="date" value={route.date} onChange={(event) => onDateChange(event.target.value)} className="min-w-0 flex-1 rounded border border-line bg-card px-2 py-0.5 font-data text-xs" />
        <select value={route.flex || 0} onChange={(event) => onFlexChange(Number(event.target.value))} aria-label={`Date flexibility for ${route.origin} to ${route.destination}`} title="Also search nearby dates" className={`rounded border px-1 py-0.5 font-data text-xs ${(route.flex || 0) > 0 ? "border-magenta bg-magenta/10 font-semibold" : "border-line bg-card text-ink-soft"}`}>
          {FLEX_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <NearbyControls route={route} onNearbyChange={onNearbyChange} />
    </li>
  );
}

export default function RouteManager({ routes, selectedIds, onToggleSelect, onUpdateDate, onUpdateFlex, onUpdateNearby, onReverse, onDelete, onAdd, onResetDefaults }) {
  const [newOrigin, setNewOrigin] = useState("");
  const [newDest, setNewDest] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newFlex, setNewFlex] = useState(0);
  const [newNearbyOrigin, setNewNearbyOrigin] = useState(false);
  const [newNearbyDestination, setNewNearbyDestination] = useState(false);
  const [newNearbyRadius, setNewNearbyRadius] = useState(50);
  const [error, setError] = useState("");
  const atLimit = selectedIds.length >= MAX_SELECTED;

  function handleAdd(event) {
    event.preventDefault();
    const origin = normalizeAirportInput(newOrigin);
    const destination = normalizeAirportInput(newDest);
    if (!origin || !destination) {
      setError("Enter or pick a 3-letter airport code for both cities (e.g. ONT).");
      return;
    }
    if (origin === destination) {
      setError("Origin and destination must differ.");
      return;
    }
    if (!newDate) {
      setError("Pick a departure date.");
      return;
    }
    setError("");
    onAdd({
      origin,
      destination,
      date: newDate,
      flex: newFlex,
      nearbyOrigin: newNearbyOrigin,
      nearbyDestination: newNearbyDestination,
      nearbyRadiusMiles: newNearbyRadius,
    });
    setNewOrigin("");
    setNewDest("");
  }

  return (
    <section aria-labelledby="routes-heading">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 id="routes-heading" className="text-xs font-semibold uppercase tracking-[0.15em] text-heading">Saved routes</h2>
        <button type="button" onClick={onResetDefaults} className="text-[15px] font-semibold text-magenta underline decoration-dotted hover:text-magenta-deep" title="Reload the preset routes (nothing gets auto-selected)">Restore defaults</button>
      </div>
      <p className="mb-2 text-[11px] text-ink-soft">Check up to {MAX_SELECTED} saved routes. Nearby-airport expansion is bounded separately to protect API quota.</p>
      <ul className="flex max-h-[48vh] flex-col gap-1.5 overflow-y-auto pr-1 lg:max-h-[50vh]">
        {routes.map((route) => (
          <RouteStrip
            key={route.id}
            route={route}
            selected={selectedIds.includes(route.id)}
            atLimit={atLimit}
            onToggle={() => onToggleSelect(route.id)}
            onDateChange={(date) => onUpdateDate(route.id, date)}
            onFlexChange={(flex) => onUpdateFlex(route.id, flex)}
            onNearbyChange={(patch) => onUpdateNearby(route.id, patch)}
            onReverse={() => onReverse(route.id)}
            onDelete={() => onDelete(route.id)}
          />
        ))}
        {routes.length === 0 && <li className="rounded border border-dashed border-line p-3 text-xs text-ink-soft">No saved routes yet — add your first one below or restore the preset routes.</li>}
      </ul>

      <form onSubmit={handleAdd} className="mt-3 rounded border border-line bg-paper-deep p-2">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-heading">Add a route</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <input value={newOrigin} onChange={(event) => setNewOrigin(event.target.value)} list="pb-airports" placeholder="From — e.g. LAX" aria-label="Departing city" className="min-w-0 flex-1 rounded border border-line bg-card px-1.5 py-1.5 font-data text-xs uppercase" />
            <span aria-hidden="true" className="text-ink-soft">→</span>
            <input value={newDest} onChange={(event) => setNewDest(event.target.value)} list="pb-airports" placeholder="To — e.g. LHR" aria-label="Destination city" className="min-w-0 flex-1 rounded border border-line bg-card px-1.5 py-1.5 font-data text-xs uppercase" />
            <datalist id="pb-airports">{AIRPORT_OPTIONS.map((airport) => <option key={airport.code} value={airport.code}>{airport.label}</option>)}</datalist>
          </div>
          <input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} aria-label="Departure date" className="w-full rounded border border-line bg-card px-1.5 py-1 font-data text-xs" />
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <label className="text-[11px] text-ink-soft" htmlFor="new-route-flex">Date flexibility</label>
          <select id="new-route-flex" value={newFlex} onChange={(event) => setNewFlex(Number(event.target.value))} className="flex-1 rounded border border-line bg-card px-1.5 py-1 font-data text-xs">{FLEX_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        </div>
        <div className="mt-2 rounded border border-line bg-card p-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <label className="flex items-center gap-1.5 text-[11px]"><input type="checkbox" checked={newNearbyOrigin} onChange={(event) => setNewNearbyOrigin(event.target.checked)} className="accent-magenta" />Nearby origin</label>
            <label className="flex items-center gap-1.5 text-[11px]"><input type="checkbox" checked={newNearbyDestination} onChange={(event) => setNewNearbyDestination(event.target.checked)} className="accent-magenta" />Nearby destination</label>
            <label className="ml-auto flex items-center gap-1 text-[11px]">Radius<select value={newNearbyRadius} onChange={(event) => setNewNearbyRadius(Number(event.target.value))} className="rounded border border-line bg-paper px-1 py-0.5 font-data text-[11px]"><option value={25}>25 mi</option><option value={50}>50 mi</option><option value={100}>100 mi</option></select></label>
          </div>
        </div>
        {error && <p className="mt-1.5 text-[11px] text-magenta">{error}</p>}
        <button type="submit" className="mt-2 w-full rounded bg-ink px-2 py-1.5 text-xs font-semibold text-paper hover:bg-magenta-deep hover:text-white">Save route</button>
      </form>
    </section>
  );
}
