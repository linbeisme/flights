import { CABINS, PROGRAMS, AIRLINE_NAMES } from "../data/defaults.js";
import { hasDemoData } from "../api/flightApi.js";
import { formatDuration } from "../api/flightApi.js";
import { BASE_CURRENCY, formatMoney } from "../api/currency.js";
import RedemptionActions from "./RedemptionActions.jsx";

// ── FlightResults ───────────────────────────────────────────────────
// Board rows: big monospace times + city codes, color-coded program
// badges, an award-seat count, a prominent cash fare, and the boxed
// CPP datum. The header stamps when results were fetched — red when
// they are current.

const cabinLabel = (id) => CABINS.find((c) => c.id === id)?.label || id;
const cabinColor = (id) => CABINS.find((c) => c.id === id)?.color || "#4a586f";
const programColor = (id) => PROGRAMS.find((p) => p.id === id)?.color || "#16233a";
const airlineName = (code) => AIRLINE_NAMES[code] || code;

function cashBasisInfo(r) {
  const info = {
    "exact-itinerary": ["exact itinerary fare", "Live cash fare matched to the same flight-number sequence"],
    "schedule-match": ["probable schedule match", "Live cash fare matched by operating airline, schedule, stops, connections, and duration; flight-number identity was unavailable"],
    "same-carrier-benchmark": ["same-airline benchmark", "Live median cash benchmark limited to the same operating airline; not necessarily the same flight"],
    "route-cabin-benchmark": ["route/cabin median", "Live median cash benchmark for this route, date, and cabin; not necessarily the same flight"],
    "demo-illustrative": ["illustrative demo fare", "Pre-built illustrative cash fare used only in Demo mode"],
  };
  return info[r.cashMatchType] || [r.cashSource === "live" ? "live cash benchmark" : "cash unavailable", "No live cash fare was available for this itinerary."];
}

const shortDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const when = (value) => {
  if (!value) return "not supplied";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

// "Current" = fetched within the last 10 minutes.
export const FRESH_MS = 10 * 60 * 1000;
// Wide date windows (± 30 days) can return 1,000+ itineraries; cap the
// DOM at a sane number and tell the user how to narrow down.
const MAX_RENDER = 200;

function UpdatedStamp({ searchedAt }) {
  if (!searchedAt) return null;
  const isCurrent = Date.now() - searchedAt < FRESH_MS;
  const when = new Date(searchedAt).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  return (
    <span
      className={`font-data text-[10px] ${isCurrent ? "font-semibold text-fresh" : "text-ink-soft"}`}
      title={isCurrent ? "These results were fetched within the last 10 minutes" : "Older results (e.g. from search history)"}
    >
      {isCurrent ? "● CURRENT · " : ""}updated {when}
    </span>
  );
}

function CppBadge({ cpp }) {
  if (cpp == null) {
    return (
      <div className="w-28 rounded border border-line bg-paper-deep px-2 py-1.5 text-center">
        <div className="font-data text-lg leading-none text-ink-soft">—</div>
        <div className="mt-1 text-[9px] uppercase tracking-widest text-ink-soft">cpp</div>
      </div>
    );
  }
  const strong = cpp >= 1.5;
  const weak = cpp < 0.8;
  const tone = strong
    ? "border-deal bg-deal-soft text-deal"
    : weak
      ? "border-line bg-paper-deep text-ink-soft"
      : "border-ink bg-card text-ink";
  return (
    <div className={`w-28 rounded border px-2 py-1.5 text-center ${tone}`} title="Cents per point: ((cash fare − taxes) / points) × 100">
      <div className="font-data text-lg font-bold leading-none">{cpp.toFixed(2)}¢</div>
      <div className="mt-1 text-[9px] uppercase tracking-widest opacity-80">
        {strong ? "strong cpp" : weak ? "weak cpp" : "cpp"}
      </div>
    </div>
  );
}

function SeatsPill({ seats, pax }) {
  if (seats == null) {
    return <span className="text-[13px] text-ink-soft">💺 award seats: unknown</span>;
  }
  const tight = seats <= pax;
  return (
    <span
      className={`rounded px-2 py-1 font-data text-[13px] font-semibold ${
        tight ? "bg-warn/15 text-warn" : "bg-deal-soft text-deal"
      }`}
      title="Award seats available at this price"
    >
      💺 {seats} award seat{seats > 1 ? "s" : ""}
    </span>
  );
}

function ResultRow({ r, pax, searchedAt }) {
  return (
    <li className="rounded border border-line bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Times + routing — the big, scannable line */}
        <div className="min-w-52 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 font-data">
            <span className="text-2xl font-bold leading-none">{r.departTime}</span>
            <span className="text-lg font-semibold text-ink-soft">{r.origin}</span>
            <span aria-hidden="true" className="text-lg text-ink-soft">→</span>
            <span className="text-2xl font-bold leading-none">
              {r.arriveTime}
              {r.arrivesNextDay && <sup className="ml-0.5 text-[10px] text-magenta">+1</sup>}
            </span>
            <span className="text-lg font-semibold text-ink-soft">{r.destination}</span>
            <span className="rounded border border-line bg-paper-deep px-1.5 py-0.5 font-data text-sm font-semibold text-ink">
              {shortDate(r.date)}
            </span>
          </div>
          <div className="mt-1 text-xs text-ink-soft">
            {r.stops == null ? (
              "Stops unknown"
            ) : r.stops === 0 ? (
              "Nonstop"
            ) : (
              <>
                {r.stops} stop{r.stops > 1 ? "s" : ""}
                {r.connections.length > 0 && (
                  <>
                    {" via "}
                    {r.connections.map((c, i) => (
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
              </>
            )}
            {" · "}
            {formatDuration(r.totalMinutes)}
            {r.layovers.length > 0 &&
              ` · layover${r.layovers.length > 1 ? "s" : ""} ${r.layovers
                .map((m) => formatDuration(m))
                .join(", ")}`}
          </div>
          {/* Program description moved to the right, above the CPP box.
              Remaining chips enlarged ~30% (text-[10px] → text-[13px],
              px-1.5 py-0.5 → px-2 py-1) for easier scanning. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className="rounded border px-2 py-1 font-data text-[13px] font-semibold"
              style={{
                color: cabinColor(r.cabin),
                borderColor: cabinColor(r.cabin),
                background: `${cabinColor(r.cabin)}1a`,
              }}
            >
              {cabinLabel(r.cabin)}
            </span>
            {r.carriers?.length > 0 && (
              <span
                className="rounded border border-ink/40 bg-paper-deep px-2 py-1 font-data text-[13px] font-semibold text-ink"
                title={`Operating airline${r.carriers.length > 1 ? "s" : ""}: ${r.carriers
                  .map(airlineName)
                  .join(", ")}`}
              >
                <span className="pb-flash-slow text-fresh" aria-hidden="true">✈</span>{" "}
                {r.carriers.map(airlineName).join(" · ")}
              </span>
            )}
            <SeatsPill seats={r.seats} pax={pax} />
            <RedemptionActions row={r} pax={pax} compact />
          </div>
        </div>

        {/* Costs — cash fare promoted to headline size */}
        <div className="text-right font-data">
          <div className="text-base font-bold">
            {r.points.toLocaleString()} <span className="text-xs font-normal text-ink-soft">pts</span>
          </div>
          <div className="text-xs text-ink-soft">
            + {r.taxesOriginal == null ? "taxes/fees not supplied" : `${formatMoney(r.taxesOriginal, r.taxesCurrency || BASE_CURRENCY)} taxes/fees`}
            {r.taxesOriginal != null && r.taxesCurrency && r.taxesCurrency !== BASE_CURRENCY ? (
              <span className="block text-[10px]">
                {r.taxesUsd == null
                  ? `FX rate required for USD CPP`
                  : `≈ ${formatMoney(r.taxesUsd, BASE_CURRENCY)} at ${r.fxRateToUsd} USD/${r.taxesCurrency}`}
              </span>
            ) : r.taxesCurrencySource === "legacy-usd-assumption" ? (
              <span className="block text-[10px] text-warn">Currency not supplied by source; treated as USD</span>
            ) : null}
          </div>
          <div className="mt-1">
            <span
              className={`inline-block rounded px-1.5 py-0.5 text-xl font-bold leading-tight ${
                r.cashSource === "live" ? "bg-deal-soft text-deal" : "text-ink-soft"
              }`}
              title={cashBasisInfo(r)[1]}
            >
              {r.cash == null ? "Unavailable" : formatMoney(r.cash, r.cashCurrency || BASE_CURRENCY)}
            </span>
          </div>
          <div className="text-[9px] uppercase tracking-wider text-ink-soft">cash fare</div>
          <div
            className={`max-w-40 text-[10px] font-semibold uppercase tracking-wider ${
              r.cashSource === "live" ? "text-deal" : "text-ink-soft"
            }`}
            title={cashBasisInfo(r)[1]}
          >
            {cashBasisInfo(r)[0]}
          </div>
        </div>

        {/* Program description now sits directly above the CPP box */}
        <div className="flex shrink-0 flex-col items-stretch gap-1">
          <span
            className="rounded px-2 py-1 text-center font-data text-[11px] font-semibold leading-tight text-white"
            style={{ background: programColor(r.program) }}
            title={`Mileage program: ${r.programLabel}`}
          >
            {r.programLabel}
          </span>
          <CppBadge cpp={r.cpp} />
          {r.economicCost != null ? (
            <div className="rounded border border-deal bg-deal-soft px-2 py-1 text-center font-data text-xs font-bold text-deal" title="Points × reference CPP + USD-converted taxes and fees">Economic cost {formatMoney(r.economicCost, BASE_CURRENCY)}</div>
          ) : (
            <div className="rounded border border-warn bg-warn/10 px-2 py-1 text-center font-data text-[10px] font-bold text-warn">Economic cost pending FX</div>
          )}
          <div className="max-w-36 text-center text-[9px] text-ink-soft">
            <div>source updated: {when(r.availabilityUpdatedAt)}</div>
            <div>checked: {when(r.checkedAt || searchedAt)}</div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function FlightResults({ results, total, loading, error, searched, routes, pax, searchedAt, dataMode = "live" }) {
  if (loading) {
    return (
      <div aria-live="polite" className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded border border-line bg-paper-deep" />
        ))}
        <p className="text-xs text-ink-soft">Searching award space…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded border border-magenta/40 bg-card p-4">
        <p className="text-sm font-semibold text-magenta">Search failed</p>
        <p className="mt-1 text-xs text-ink">{error}</p>
        <p className="mt-2 text-xs text-ink-soft">
          If this persists, confirm your seats.aero key is set on the server and that your seats.aero Pro subscription is active.
        </p>
      </div>
    );
  }

  if (!searched) {
    return (
      <div className="rounded border border-dashed border-line p-6 text-center">
        <p className="font-data text-sm text-ink-soft">
          Check up to 5 routes on the left, set dates and passengers, then press Search.
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded border border-dashed border-line p-6 text-center">
        <p className="text-sm">
          No itineraries match for{" "}
          <span className="font-data">
            {routes.map((r) => `${r.origin}→${r.destination}`).join(", ")}
          </span>
          {pax > 1 && <> with <span className="font-data">{pax}</span> passengers</>}.
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          {total > 0
            ? `${total} result${total > 1 ? "s were" : " was"} hidden by your filters or the passenger count — try relaxing them.`
            : "Try another date, or widen the program selection."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p aria-live="polite" className="mb-2 flex flex-wrap items-baseline gap-x-2 text-xs text-ink-soft">
        {dataMode === "demo" ? (
          <span className="rounded bg-warn/15 px-2 py-0.5 font-data text-[11px] font-bold uppercase tracking-wider text-warn">● DEMO pre-built data</span>
        ) : hasDemoData(results) ? (
          <span
            className="animate-pulse rounded bg-red-600 px-2 py-0.5 font-data text-[11px] font-bold uppercase tracking-wider text-white"
            role="alert"
            title="Live mode detected demo-tagged rows. These results must be rejected."
          >
            ⚠ DEMO DATA REJECTED IN LIVE MODE
          </span>
        ) : (
          <span
            className="font-data text-[10px] font-semibold uppercase tracking-wider text-deal"
            title="Award results are from live seats.aero data."
          >
            ● LIVE seats.aero data
          </span>
        )}
        {results.some((r) => r.cashSource !== "live" && r.cashSource !== "demo") && (
          <span className="font-data text-[10px] font-semibold text-ink-soft">
            {results.filter((r) => r.cashSource !== "live" && r.cashSource !== "demo").length} result
            {results.filter((r) => r.cashSource !== "live" && r.cashSource !== "demo").length > 1 ? "s" : ""} without a live cash fare
          </span>
        )}
        <span>
          Showing <span className="font-data font-semibold text-ink">{results.length}</span> of{" "}
          <span className="font-data">{total}</span> itineraries
          {pax > 1 && <> · ≥{pax} seats</>}
          {" "}· CPP = ((cash − taxes) ÷ points) × 100
        </span>
        <UpdatedStamp searchedAt={searchedAt} />
      </p>
      <ul className="flex flex-col gap-2">
        {results.slice(0, MAX_RENDER).map((r) => (
          <ResultRow key={r.id} r={r} pax={pax} searchedAt={searchedAt} />
        ))}
      </ul>
      {results.length > MAX_RENDER && (
        <p className="mt-2 text-xs text-ink-soft">
          Showing the first {MAX_RENDER} of {results.length} matching itineraries — tighten the
          filters or shrink the date window to see the rest.
        </p>
      )}
    </div>
  );
}
