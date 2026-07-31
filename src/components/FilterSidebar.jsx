import { PROGRAMS, CABINS } from "../data/defaults.js";
import { DEFAULT_UI_FILTERS } from "../api/flightApi.js";

// ── FilterSidebar ───────────────────────────────────────────────────
// Every control edits one key of the shared `filters` object; the
// actual filtering runs in applyFilters() so the artifact build and
// the deployed build share identical behavior.

const hhLabel = (h) => `${String(h).padStart(2, "0")}:00`;

function Fieldset({ legend, children }) {
  return (
    <fieldset className="border-t border-line pt-3">
      <legend className="pr-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-heading">
        {legend}
      </legend>
      <div className="mt-2">{children}</div>
    </fieldset>
  );
}

function TimeWindow({ label, value, onChange }) {
  const [lo, hi] = value;
  return (
    <div className="mb-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs">{label}</span>
        <span className="font-data text-xs text-ink-soft">
          {hhLabel(lo)}–{hhLabel(hi)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={24}
          value={lo}
          aria-label={`${label} earliest hour`}
          onChange={(e) => onChange([Number(e.target.value), hi])}
          className="w-full"
        />
        <input
          type="range"
          min={0}
          max={24}
          value={hi}
          aria-label={`${label} latest hour`}
          onChange={(e) => onChange([lo, Number(e.target.value)])}
          className="w-full"
        />
      </div>
      {lo > hi && <p className="mt-1 text-[10px] text-deal">Crosses midnight</p>}
    </div>
  );
}

function NumPair({ label, unit, minVal, maxVal, onMin, onMax }) {
  return (
    <div className="mb-2">
      <span className="text-xs">{label}</span>
      <div className="mt-1 flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          step={0.5}
          value={minVal}
          onChange={(e) => onMin(e.target.value)}
          placeholder="min"
          aria-label={`${label} minimum ${unit}`}
          className="w-full rounded border border-line bg-card px-1.5 py-1 font-data text-xs"
        />
        <span className="text-xs text-ink-soft">to</span>
        <input
          type="number"
          min={0}
          step={0.5}
          value={maxVal}
          onChange={(e) => onMax(e.target.value)}
          placeholder="max"
          aria-label={`${label} maximum ${unit}`}
          className="w-full rounded border border-line bg-card px-1.5 py-1 font-data text-xs"
        />
        <span className="text-xs text-ink-soft">{unit}</span>
      </div>
    </div>
  );
}

export default function FilterSidebar({ filters, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const toggleIn = (key, id) => {
    const list = filters[key];
    set({ [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
  };

  return (
    <section aria-labelledby="filters-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="filters-heading" className="text-xs font-semibold uppercase tracking-[0.15em] text-heading">
          Filters
        </h2>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_UI_FILTERS })}
          className="text-[11px] text-ink-soft underline decoration-dotted hover:text-magenta"
        >
          Clear all
        </button>
      </div>

      <Fieldset legend="Programs">
        <button
          type="button"
          onClick={() =>
            set({
              programs:
                filters.programs.length === PROGRAMS.length ? [] : PROGRAMS.map((p) => p.id),
            })
          }
          className="mb-1.5 rounded border border-line bg-card px-2 py-1 text-[11px] font-semibold text-ink hover:border-magenta hover:text-magenta"
          title="Toggle all nine programs with one click"
        >
          {filters.programs.length === PROGRAMS.length ? "Deselect all" : "Select all"}
        </button>
        <div className="flex flex-wrap gap-1">
          {PROGRAMS.map((p) => {
            const on = filters.programs.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleIn("programs", p.id)}
                aria-pressed={on}
                title={p.label}
                className={`group relative rounded border px-2 py-1 font-data text-sm font-semibold ${
                  on ? "text-white" : "border-line bg-card text-ink-soft"
                }`}
                style={on ? { background: p.color, borderColor: p.color } : undefined}
              >
                {p.short}
                <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded border border-ink bg-card px-2 py-1 font-sans text-[10px] font-semibold text-ink shadow-lg group-hover:block group-focus-visible:block">
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      </Fieldset>

      <Fieldset legend="Cabin">
        <div className="flex flex-col gap-1">
          {CABINS.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={filters.cabins.includes(c.id)}
                onChange={() => toggleIn("cabins", c.id)}
                className="accent-magenta"
              />
              {c.label}
            </label>
          ))}
        </div>
      </Fieldset>

      <Fieldset legend="Time windows">
        <TimeWindow
          label="Departure"
          value={filters.depWindow}
          onChange={(v) => set({ depWindow: v })}
        />
        <TimeWindow
          label="Arrival"
          value={filters.arrWindow}
          onChange={(v) => set({ arrWindow: v })}
        />
      </Fieldset>

      <Fieldset legend="Stops">
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
              onClick={() => set({ stops: val })}
              aria-pressed={filters.stops === val}
              title={tip}
              className={`flex-1 rounded border px-1 py-1 text-[11px] ${
                filters.stops === val
                  ? "border-magenta bg-magenta text-white"
                  : "border-line bg-card text-ink-soft hover:border-magenta"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Fieldset>

      <Fieldset legend="Connection airports">
        <label className="block text-xs">
          Include any of
          <input
            value={filters.connectionInclude}
            onChange={(e) => set({ connectionInclude: e.target.value.toUpperCase() })}
            placeholder="e.g. NRT, ICN"
            aria-label="Included connection airport codes, comma separated"
            className="mt-1 w-full rounded border border-line bg-card px-1.5 py-1 font-data text-xs uppercase"
          />
        </label>
        <label className="mt-2 block text-xs">
          Exclude any of
          <input
            value={filters.connectionExclude}
            onChange={(e) => set({ connectionExclude: e.target.value.toUpperCase() })}
            placeholder="e.g. LHR, CDG"
            aria-label="Excluded connection airport codes, comma separated"
            className="mt-1 w-full rounded border border-line bg-card px-1.5 py-1 font-data text-xs uppercase"
          />
        </label>
        <p className="mt-1 text-[10px] text-ink-soft">
          Exclusions override inclusions. Nonstop itineraries do not satisfy an include rule.
        </p>
      </Fieldset>

      <Fieldset legend="Layover duration">
        <NumPair
          label="Each layover"
          unit="h"
          minVal={filters.layoverMinH}
          maxVal={filters.layoverMaxH}
          onMin={(v) => set({ layoverMinH: v })}
          onMax={(v) => set({ layoverMaxH: v })}
        />
      </Fieldset>

      <Fieldset legend="Total travel time">
        <NumPair
          label="Door to door"
          unit="h"
          minVal={filters.totalMinH}
          maxVal={filters.totalMaxH}
          onMin={(v) => set({ totalMinH: v })}
          onMax={(v) => set({ totalMaxH: v })}
        />
      </Fieldset>

    </section>
  );
}
