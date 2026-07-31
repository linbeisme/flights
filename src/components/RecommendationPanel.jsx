import { useMemo, useState } from "react";
import { groupRecommendationResults, validateRecommendationPrefs } from "../api/recommendationEngine.js";
import { formatDuration } from "../api/flightApi.js";
import { AIRLINE_NAMES } from "../data/defaults.js";
import { BASE_CURRENCY, formatMoney } from "../api/currency.js";
import RedemptionActions from "./RedemptionActions.jsx";

const airlineName = (code) => AIRLINE_NAMES[code] || code;

function cashBasis(r) {
  const labels = {
    "exact-itinerary": "Exact itinerary fare",
    "schedule-match": "Probable schedule match",
    "same-carrier-benchmark": "Same operating-airline benchmark",
    "route-cabin-benchmark": "Route/cabin median benchmark",
    "demo-illustrative": "Illustrative demo fare",
  };
  return labels[r.cashMatchType] || "Cash basis unavailable";
}

function when(value) {
  if (!value) return "Not supplied by source";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function TaxDisplay({ r }) {
  if (r.taxesOriginal == null) {
    return <span className="text-warn">Taxes/fees not supplied</span>;
  }
  const original = formatMoney(r.taxesOriginal, r.taxesCurrency);
  if (r.taxesCurrency === BASE_CURRENCY) return (
    <>
      {original}
      {r.taxesCurrencySource === "legacy-usd-assumption" && (
        <span className="block text-[10px] font-normal text-warn">Currency not supplied by source; treated as USD</span>
      )}
    </>
  );
  return (
    <>
      {original}
      <span className="block text-[10px] font-normal text-ink-soft">
        {r.taxesUsd == null ? "FX rate required" : `≈ ${formatMoney(r.taxesUsd, BASE_CURRENCY)} at ${r.fxRateToUsd} USD/${r.taxesCurrency}`}
      </span>
    </>
  );
}

function RouteDetails({ r }) {
  const layoverText = r.layovers?.length
    ? ` · layover${r.layovers.length > 1 ? "s" : ""} ${r.layovers.map(formatDuration).join(", ")}`
    : "";
  return (
    <>
      <p className="mt-2 font-data text-sm">{r.origin}→{r.destination} · {r.departTime}–{r.arriveTime}{r.arrivesNextDay ? "+1" : ""}</p>
      <p className="mt-1 text-xs text-ink-soft">
        {r.stops === 0 ? "Nonstop" : `${r.stops ?? "?"} stop${r.stops === 1 ? "" : "s"}${r.connections?.length ? ` via ${r.connections.join(", ")}` : ""}`} · {formatDuration(r.totalMinutes)}{layoverText}
      </p>
    </>
  );
}

function FlightInfoPopover({ r, searchedAt, compact = false, align = "left" }) {
  const carriers = r.carriers?.length ? r.carriers.map(airlineName).join(" and ") : "Not supplied";
  return (
    <details data-pb-popover className="relative inline-block">
      <summary
        className={`list-none cursor-pointer rounded-full border border-deal bg-deal-soft text-deal hover:border-ink ${compact ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm"}`}
        title="Show flight details"
        aria-label={`Show flight details for ${r.programLabel}`}
      >
        <span className="text-fresh" aria-hidden="true">✈</span>
      </summary>
      <div className={`absolute z-30 mt-1 w-72 rounded border-2 border-ink bg-card p-3 text-left shadow-lg ${align === "right" ? "right-0" : "left-0"}`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-magenta">Available flight details</p>
        <dl className="mt-2 grid grid-cols-[94px_1fr] gap-x-2 gap-y-1 text-xs">
          <dt className="text-ink-soft">Flight #</dt><dd className="font-data font-bold">{r.flightNumbers || "Not supplied"}</dd>
          <dt className="text-ink-soft">Route</dt><dd className="font-data">{r.origin}→{r.destination}</dd>
          <dt className="text-ink-soft">Departure</dt><dd className="font-data">{r.date || "Date not supplied"} · {r.departTime || "Time not supplied"}</dd>
          <dt className="text-ink-soft">Arrival</dt><dd className="font-data">{r.arriveTime || "Time not supplied"}{r.arrivesNextDay ? " +1 day" : ""}</dd>
          <dt className="text-ink-soft">Operating</dt><dd>{carriers}</dd>
          <dt className="text-ink-soft">Seats</dt><dd>{r.seats == null ? "Available; count not supplied" : `${r.seats} award seat${r.seats === 1 ? "" : "s"}`}</dd>
          <dt className="text-ink-soft">Checked</dt><dd>{when(r.checkedAt || searchedAt)}</dd>
        </dl>
      </div>
    </details>
  );
}

function RecommendationMathPopover() {
  return (
    <details data-pb-popover className="relative inline-block">
      <summary
        className="list-none cursor-pointer rounded-full border border-ink bg-card px-2 py-0.5 font-data text-xs font-bold text-ink hover:border-magenta hover:text-magenta"
        title="How the recommendation calculations work"
        aria-label="Explain economic cost, realized CPP, and economic savings"
      >
        i
      </summary>
      <div className="absolute left-0 z-40 mt-1 w-[min(92vw,30rem)] rounded border-2 border-ink bg-card p-4 text-left normal-case tracking-normal shadow-lg">
        <h3 className="text-sm font-bold text-heading">How recommendation values are calculated</h3>
        <div className="mt-3 space-y-3 text-xs text-ink">
          <div>
            <p className="font-semibold">Economic redemption cost</p>
            <p className="mt-1 font-data text-[11px]">(Points × reference CPP in cents ÷ 100) + award taxes/fees converted to USD</p>
            <p className="mt-1 text-ink-soft">This estimates the opportunity cost of the points consumed. It is not the cash ticket price.</p>
          </div>
          <div>
            <p className="font-semibold">Realized CPP</p>
            <p className="mt-1 font-data text-[11px]">((Cash fare − award taxes/fees in USD) ÷ points) × 100</p>
            <p className="mt-1 text-ink-soft">This measures the cents of flight value received per point.</p>
          </div>
          <div>
            <p className="font-semibold">Economic savings</p>
            <p className="mt-1 font-data text-[11px]">Cash fare − economic redemption cost</p>
            <p className="mt-1 text-ink-soft">A negative amount means the cash ticket costs less than the estimated economic value of the points and fees used.</p>
          </div>
          <div className="rounded border border-deal bg-deal-soft p-3">
            <p className="font-semibold text-deal">Example</p>
            <p className="mt-1">80,000 points, reference value 1.30¢, $6 award taxes/fees, and a $4,150 exact cash fare:</p>
            <ul className="mt-1 space-y-1 font-data text-[11px]">
              <li>Economic cost = (80,000 × 1.30 ÷ 100) + $6 = <strong>$1,046</strong></li>
              <li>Realized CPP = (($4,150 − $6) ÷ 80,000) × 100 = <strong>5.18¢</strong></li>
              <li>Economic savings = $4,150 − $1,046 = <strong>$3,104</strong></li>
            </ul>
          </div>
          <p className="text-[10px] text-ink-soft">Cash-based values remain unavailable when the cash fare, taxes/fees, or required FX rate is missing.</p>
        </div>
      </div>
    </details>
  );
}

function FastestAcceptablePopover() {
  return (
    <details data-pb-popover className="relative inline-block">
      <summary
        className="list-none cursor-pointer rounded-full border border-ink bg-card px-1.5 py-0.5 font-data text-[10px] font-bold text-ink hover:border-magenta hover:text-magenta"
        title="What fastest acceptable means"
        aria-label="Explain the fastest acceptable recommendation"
      >
        i
      </summary>
      <div className="absolute left-0 z-40 mt-1 w-[min(88vw,24rem)] rounded border-2 border-ink bg-card p-3 text-left normal-case tracking-normal shadow-lg">
        <h4 className="text-xs font-bold text-heading">Fastest acceptable recommendation</h4>
        <p className="mt-2 text-[11px] text-ink">This is the itinerary with the shortest total travel time among the options that pass the current recommendation filters and have the data needed for comparison.</p>
        <ul className="mt-2 space-y-1 text-[10px] text-ink-soft">
          <li>• Maximum stops and maximum total duration</li>
          <li>• Departure and arrival windows</li>
          <li>• Required, preferred, and excluded connection airports</li>
          <li>• Preferred layover range</li>
          <li>• Required taxes, FX, CPP, and cash-fare data when available</li>
        </ul>
        <p className="mt-2 text-[10px] text-warn">If no itinerary passes every filter, the panel displays a fallback warning and selects the shortest option from the clearly identified fallback pool.</p>
      </div>
    </details>
  );
}

function OperatingCarrierLine({ carriers }) {
  if (!carriers?.length) return <span>Operating airline not provided</span>;
  return (
    <>
      Operated by <strong className="font-semibold text-ink">{carriers.map(airlineName).join(" and ")}</strong>
    </>
  );
}

function Card({ title, r, searchedAt, pax }) {
  return (
    <article className="rounded border-2 border-line bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-magenta">{title}</p>
            {title === "Fastest acceptable" && <FastestAcceptablePopover />}
          </div>
          <h3 className="mt-1 min-w-0 font-data text-base font-bold">{r.programLabel}</h3>
          <p className="text-[11px] font-light text-ink-soft">
            (<OperatingCarrierLine carriers={r.carriers} />)
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <FlightInfoPopover r={r} searchedAt={searchedAt} align="right" />
          <span className="rounded bg-deal-soft px-2 py-1 font-data text-xs font-bold text-deal">{r.recommendationScore}/100</span>
        </div>
      </div>

      <RouteDetails r={r} />
      <p className="mt-1 text-xs font-semibold text-deal">
        {r.seats == null ? "Award available — seat count not provided" : `${r.seats} award seat${r.seats === 1 ? "" : "s"} available`}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 font-data text-xs">
        <div>
          <span className="text-ink-soft">Redeem</span>
          <div className="font-bold">{r.points.toLocaleString()} pts + <TaxDisplay r={r} /></div>
        </div>
        <div>
          <span className="text-ink-soft">Cash fare</span>
          <div className="font-bold">{r.cash == null ? "Unavailable" : formatMoney(r.cash, r.cashCurrency || BASE_CURRENCY)}</div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 rounded border border-deal bg-deal-soft p-2 font-data text-xs">
        <div>
          <span className="text-ink-soft">Economic cost</span>
          <div className="font-bold text-deal">{r.economicCost == null ? "FX/CPP data required" : formatMoney(r.economicCost, BASE_CURRENCY)}</div>
        </div>
        <div>
          <span className="text-ink-soft">Economic savings</span>
          <div
            className={`font-bold ${
              Number.isFinite(r.savingsVsCash) && r.savingsVsCash < 0
                ? "pb-flash-medium text-fresh"
                : Number.isFinite(r.savingsVsCash) && r.savingsVsCash > 0
                  ? "text-favorable"
                  : ""
            }`}
            title={
              Number.isFinite(r.savingsVsCash) && r.savingsVsCash < 0
                ? "Negative economic savings: the cash fare is lower than the estimated economic redemption cost"
                : Number.isFinite(r.savingsVsCash) && r.savingsVsCash > 0
                  ? "Positive economic savings: the cash fare exceeds the estimated economic redemption cost"
                  : undefined
            }
          >
            {r.savingsVsCash == null ? "—" : formatMoney(r.savingsVsCash, BASE_CURRENCY)}
          </div>
        </div>
        <div>
          <span className="text-ink-soft">Realized CPP</span>
          <div className="font-bold">{r.cpp == null ? "—" : `${r.cpp.toFixed(2)}¢`}</div>
        </div>
        <div>
          <span className="text-ink-soft">Confidence</span>
          <div className="font-bold">{r.confidence}</div>
        </div>
      </div>

      <p className="mt-2 rounded border border-line bg-paper-deep px-2 py-1 text-[11px] text-ink-soft">
        Cash basis: <span className="font-semibold text-ink">{cashBasis(r)}</span>
      </p>
      <div className="mt-2 text-[10px] text-ink-soft">
        <p>Availability source updated: <span className="font-semibold text-ink">{when(r.availabilityUpdatedAt)}</span></p>
        <p>Availability checked: <span className="font-semibold text-ink">{when(r.checkedAt || searchedAt)}</span></p>
      </div>
      <RedemptionActions row={r} pax={pax} />
      <ul className="mt-3 space-y-1 text-xs text-ink-soft">{r.recommendationReasons.map((x) => <li key={x}>✓ {x}</li>)}</ul>
    </article>
  );
}

function AlternativeRow({ r, searchedAt, pax, status = "qualified" }) {
  const notRecommended = status === "notRecommended";
  return (
    <li className={`rounded border p-2.5 ${notRecommended ? "border-warn bg-warn/10" : "border-line bg-card"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-data text-sm font-bold">{r.programLabel}</p>
            <FlightInfoPopover r={r} searchedAt={searchedAt} compact />
          </div>
          <p className="text-[10px] text-ink-soft">(<OperatingCarrierLine carriers={r.carriers} />)</p>
          <p className="mt-1 font-data text-xs">{r.origin}→{r.destination} · {r.departTime}–{r.arriveTime}{r.arrivesNextDay ? "+1" : ""}</p>
          <p className="text-[10px] text-ink-soft">
            {r.stops === 0 ? "Nonstop" : `${r.stops ?? "?"} stop${r.stops === 1 ? "" : "s"}${r.connections?.length ? ` via ${r.connections.join(", ")}` : ""}`}
            {r.layovers?.length ? ` · layover ${r.layovers.map(formatDuration).join(", ")}` : ""} · {formatDuration(r.totalMinutes)}
          </p>
        </div>
        {notRecommended
          ? <span className="rounded bg-warn/15 px-2 py-1 font-data text-[10px] font-bold uppercase text-warn">Not recommended</span>
          : <span className="rounded bg-paper-deep px-2 py-1 font-data text-xs font-bold">{r.recommendationScore}/100</span>}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-5">
        <span>{r.points.toLocaleString()} pts + <TaxDisplay r={r} /></span>
        <span>Cash {r.cash == null ? "unavailable" : formatMoney(r.cash, r.cashCurrency || BASE_CURRENCY)}</span>
        <span>Realized CPP {r.cpp == null ? "—" : `${r.cpp.toFixed(2)}¢`}</span>
        <span>Economic {r.economicCost == null ? "—" : formatMoney(r.economicCost, BASE_CURRENCY)}</span>
        <span>{r.seats == null ? "Seats unknown" : `${r.seats} seats`}</span>
      </div>
      {notRecommended && r.exclusionReasons?.length > 0 && (
        <ul className="mt-2 space-y-1 text-[11px] text-warn">
          {r.exclusionReasons.map((reason) => <li key={reason}>• {reason}</li>)}
        </ul>
      )}
      <p className="mt-1 text-[10px] text-ink-soft">Checked {when(r.checkedAt || searchedAt)} · {cashBasis(r)}</p>
      <RedemptionActions row={r} pax={pax} compact />
    </li>
  );
}

export default function RecommendationPanel({ results, prefs, onPrefsChange, dataMode, cppLibrary, cppLibraryError, fxRates, searchedAt, pax = 1 }) {
  const [open, setOpen] = useState(true);
  const validation = useMemo(() => validateRecommendationPrefs(prefs), [prefs]);
  const groups = useMemo(
    () => groupRecommendationResults(results, prefs, cppLibrary, fxRates),
    [results, prefs, cppLibrary, fxRates]
  );
  if (!results.length) return null;
  const set = (key, value) => onPrefsChange((p) => ({ ...p, [key]: value }));
  const cppMeta = cppLibrary?.meta || {};
  const missingFx = results.filter((r) => r.fxStatus === "missing-rate").length;
  const missingTaxes = results.filter((r) => r.fxStatus === "taxes-unavailable").length;

  return (
    <section className="mb-4 rounded border-2 border-ink bg-paper-deep p-3" aria-label="Recommended redemptions">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-heading">Recommended redemptions</h2>
          <RecommendationMathPopover />
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          Cash fare, economic redemption cost, savings, and realized CPP are separate measures. Valuations: {cppMeta.source || "loading"}{cppMeta.asOf ? `, as of ${cppMeta.asOf}` : ""}.
        </p>
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 rounded border border-blue-300 bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-950 hover:bg-blue-200">
          {open ? "Hide Filter" : "Show Filter"}
        </button>
      </div>

      {cppLibraryError && (
        <p role="alert" className="mt-2 rounded border border-magenta bg-magenta/10 px-2 py-1 text-xs text-magenta">
          CPP library unavailable: {cppLibraryError}. Economic-cost recommendations remain incomplete until the canonical JSON loads.
        </p>
      )}
      {missingFx > 0 && (
        <p role="alert" className="mt-2 rounded border border-warn bg-warn/10 px-2 py-1 text-xs text-warn">
          {missingFx} result{missingFx === 1 ? "" : "s"} use foreign-currency taxes/fees. Enter the required manual FX rate above before those rows can receive complete CPP and economic-cost rankings.
        </p>
      )}
      {missingTaxes > 0 && (
        <p role="alert" className="mt-2 rounded border border-warn bg-warn/10 px-2 py-1 text-xs text-warn">
          {missingTaxes} result{missingTaxes === 1 ? "" : "s"} do not include taxes/fees from the source. The app leaves those amounts unknown and suppresses CPP and economic-cost ranking rather than assuming zero.
        </p>
      )}
      {dataMode === "demo" && (
        <p className="mt-2 rounded border border-warn bg-warn/10 px-2 py-1 font-data text-xs font-bold text-warn">
          DEMO MODE — recommendations use pre-built illustrative award and fare data.
        </p>
      )}
      {!validation.valid && (
        <div role="alert" className="mt-2 rounded border border-magenta bg-magenta/10 px-3 py-2 text-xs text-magenta">
          <p className="font-semibold">Fix recommendation settings before ranking:</p>
          <ul className="mt-1 list-disc pl-5">{validation.errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </div>
      )}
      {validation.valid && validation.warnings.length > 0 && (
        <p className="mt-2 rounded border border-deal bg-deal-soft px-2 py-1 text-xs text-deal">{validation.warnings.join(" ")} Overnight windows are supported.</p>
      )}
      {validation.valid && groups.some(([, rec]) => rec.usedFallback) && (
        <p className="mt-2 rounded border border-warn bg-warn/10 px-2 py-1 text-xs text-warn">
          For one or more route/cabin groups, no itinerary passed every preference or all required FX rates were missing, so the panel clearly ranks the closest available options.
        </p>
      )}

      {open && (
        <div className="mt-3 grid gap-3 rounded border border-line bg-card p-3 md:grid-cols-4">
          <label className="text-xs">Priority preset
            <select value={prefs.preset} onChange={(e) => set("preset", e.target.value)} className="mt-1 w-full rounded border border-line bg-paper px-2 py-2">
              <option value="balanced">Balanced</option>
              <option value="lowestCost">Lowest cost</option>
              <option value="fastest">Fastest journey</option>
              <option value="convenience">Convenience</option>
            </select>
          </label>
          <label className="text-xs">Maximum stops
            <select value={prefs.maxStops} onChange={(e) => set("maxStops", Number(e.target.value))} className="mt-1 w-full rounded border border-line bg-paper px-2 py-2">
              <option value={0}>Nonstop</option><option value={1}>Up to 1</option><option value={2}>Up to 2</option>
            </select>
          </label>
          <label className="text-xs">Preferred layover hours
            <div className="mt-1 flex gap-1">
              <input aria-label="Minimum layover hours" type="number" min="0" step="0.25" value={prefs.layoverMinH} onChange={(e) => set("layoverMinH", Number(e.target.value))} className="w-full rounded border border-line bg-paper px-2 py-2" />
              <input aria-label="Maximum layover hours" type="number" min="0" step="0.25" value={prefs.layoverMaxH} onChange={(e) => set("layoverMaxH", Number(e.target.value))} className="w-full rounded border border-line bg-paper px-2 py-2" />
            </div>
          </label>
          <label className="text-xs">Maximum duration (hours)
            <input type="number" min="0.25" step="0.25" value={prefs.maxDurationH} onChange={(e) => set("maxDurationH", Number(e.target.value))} className="mt-1 w-full rounded border border-line bg-paper px-2 py-2" />
          </label>
          <label className="text-xs">Departure window (0–23.75)
            <div className="mt-1 flex gap-1">
              <input aria-label="Departure window start hour" type="number" min="0" max="23.75" step="0.25" value={prefs.departStart} onChange={(e) => set("departStart", Number(e.target.value))} className="w-full rounded border border-line bg-paper px-2 py-2" />
              <input aria-label="Departure window end hour" type="number" min="0" max="23.75" step="0.25" value={prefs.departEnd} onChange={(e) => set("departEnd", Number(e.target.value))} className="w-full rounded border border-line bg-paper px-2 py-2" />
            </div>
          </label>
          <label className="text-xs">Arrival window (0–23.75)
            <div className="mt-1 flex gap-1">
              <input aria-label="Arrival window start hour" type="number" min="0" max="23.75" step="0.25" value={prefs.arriveStart} onChange={(e) => set("arriveStart", Number(e.target.value))} className="w-full rounded border border-line bg-paper px-2 py-2" />
              <input aria-label="Arrival window end hour" type="number" min="0" max="23.75" step="0.25" value={prefs.arriveEnd} onChange={(e) => set("arriveEnd", Number(e.target.value))} className="w-full rounded border border-line bg-paper px-2 py-2" />
            </div>
            <span className="mt-1 block text-[10px] text-ink-soft">Start later than end means the window crosses midnight.</span>
          </label>
          <label className="text-xs">Required connection (include)
            <input value={prefs.requiredAirports} onChange={(e) => set("requiredAirports", e.target.value.toUpperCase())} className="mt-1 w-full rounded border border-line bg-paper px-2 py-2 font-data" placeholder="HND,NRT" />
          </label>
          <label className="text-xs">Preferred connections
            <input value={prefs.preferredAirports} onChange={(e) => set("preferredAirports", e.target.value.toUpperCase())} className="mt-1 w-full rounded border border-line bg-paper px-2 py-2 font-data" placeholder="HND,NRT,ICN" />
          </label>
          <label className="text-xs">Avoid connections (exclude)
            <input value={prefs.avoidAirports} onChange={(e) => set("avoidAirports", e.target.value.toUpperCase())} className="mt-1 w-full rounded border border-line bg-paper px-2 py-2 font-data" placeholder="LHR,CDG" />
          </label>
        </div>
      )}

      {validation.valid && (
        <div className="mt-3 space-y-4">
          {groups.map(([key, rec]) => (
            <div key={key}>
              <h3 className="mb-2 border-b border-line pb-1 font-data text-sm font-bold">{key}</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {rec.cards.slice(0, 5).map(([title, r]) => <Card key={`${key}-${title}-${r.id}`} title={title} r={r} searchedAt={searchedAt} pax={pax} />)}
              </div>

              {(rec.other.length > 0 || rec.notRecommended?.length > 0) && (
                <section className="mt-3 rounded border-2 border-line bg-paper p-3" aria-label="Other qualifying redemptions or not recommended flights">
                  <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-heading">Other qualifying redemptions or not recommended flights</h4>
                  <p className="mt-1 text-[11px] text-ink-soft">Qualified alternatives passed the recommendation settings but did not win a featured category. Not-recommended rows failed one or more recommendation preferences and show the reason.</p>

                  {rec.other.length > 0 && (
                    <details open className="mt-3 rounded border border-line bg-card p-2">
                      <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.1em] text-deal">Other qualified flights ({rec.other.length})</summary>
                      <ul className="mt-2 space-y-2">
                        {rec.other.map((r) => <AlternativeRow key={`${key}-other-${r.id}`} r={r} searchedAt={searchedAt} pax={pax} />)}
                      </ul>
                    </details>
                  )}

                  {rec.notRecommended?.length > 0 && (
                    <details className="mt-2 rounded border border-warn bg-warn/5 p-2">
                      <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.1em] text-warn">Not recommended under current settings ({rec.notRecommended.length})</summary>
                      <ul className="mt-2 space-y-2">
                        {rec.notRecommended.map((r) => <AlternativeRow key={`${key}-rejected-${r.id}`} r={r} searchedAt={searchedAt} pax={pax} status="notRecommended" />)}
                      </ul>
                    </details>
                  )}
                </section>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
