import { applyFilters, formatDuration } from "../api/flightApi.js";
import { BASE_CURRENCY, formatMoney } from "../api/currency.js";
import { AIRLINE_NAMES, PROGRAMS } from "../data/defaults.js";

function taxText(leg) {
  if (leg.taxesOriginal == null && leg.taxes == null) return "taxes unavailable";
  const amount = leg.taxesOriginal ?? leg.taxes;
  const currency = leg.taxesCurrency || BASE_CURRENCY;
  const original = formatMoney(amount, currency);
  if (currency !== BASE_CURRENCY && Number.isFinite(leg.taxesUsd)) return `${original} (${formatMoney(leg.taxesUsd, BASE_CURRENCY)})`;
  return original;
}

function programMeta(program) {
  return PROGRAMS.find((item) => item.id === program) || { label: program || "Unknown program", color: "#4a586f" };
}

function operatingAirlines(carriers = []) {
  const values = [...new Set(carriers.map((code) => AIRLINE_NAMES[String(code).toUpperCase()] || String(code).toUpperCase()).filter(Boolean))];
  return values.length ? values.join(" · ") : "Operating airline not supplied";
}

function Leg({ label, leg }) {
  const program = programMeta(leg.program);
  return (
    <div className="rounded border border-line bg-paper-deep p-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-magenta">{label}</p>
          <p className="font-data text-sm font-bold">{leg.origin} → {leg.destination} · {leg.date}</p>
          <p className="text-[11px] text-ink-soft">{leg.departTime || "—"} → {leg.arriveTime || "—"}{leg.arrivesNextDay ? " +1" : ""} · {leg.stops == null ? "stops unavailable" : leg.stops === 0 ? "nonstop" : `${leg.stops} stop${leg.stops === 1 ? "" : "s"}`}{leg.totalMinutes != null ? ` · ${formatDuration(leg.totalMinutes)}` : ""}</p>
          {leg.connections?.length > 0 && <p className="text-[10px] text-ink-soft">Via {leg.connections.join(", ")}</p>}
          {leg.flightNumbers && <p className="font-data text-[10px] text-ink-soft">{leg.flightNumbers}</p>}
        </div>
        <div className="text-right">
          <p className="font-data text-sm font-bold" style={{ color: program.color }}>{leg.programLabel || program.label}</p>
          <p className="text-[10px] font-semibold text-ink-soft"><span className="text-fresh" aria-hidden="true">✈</span> Operated by {operatingAirlines(leg.carriers)}</p>
          <p className="font-data text-xs font-semibold">{Number(leg.points || 0).toLocaleString()} pts + {taxText(leg)}</p>
          <p className="text-[10px] text-ink-soft">{leg.seats == null ? "seat count not supplied" : `${leg.seats} seat${leg.seats === 1 ? "" : "s"}`}</p>
        </div>
      </div>
    </div>
  );
}

function cashMatchLabel(value) {
  return ({
    "exact-round-trip-itinerary": "Exact outbound and return flight match",
    "round-trip-schedule-match": "Probable outbound and return schedule match",
    "same-carrier-round-trip-benchmark": "Same-carrier round-trip benchmark",
    "route-date-cabin-round-trip-benchmark": "Route/date/cabin round-trip benchmark",
    unavailable: "Round-trip cash fare unavailable",
  })[value] || value || "Round-trip cash fare unavailable";
}

function filterCombinations(rows, filters = {}, selectedPrograms = []) {
  const enabled = new Set(Array.isArray(selectedPrograms) ? selectedPrograms : []);
  if (enabled.size === 0) return [];
  return (rows || []).filter((combo) => {
    const programsPass = combo.sameProgram
      ? enabled.has(combo.program)
      : enabled.has(combo.outbound?.program) && enabled.has(combo.return?.program);
    if (!programsPass) return false;
    if (!filters || !Array.isArray(filters.programs)) return true;
    return applyFilters([combo.outbound], filters).length > 0 && applyFilters([combo.return], filters).length > 0;
  });
}

function splitMethodLabel(method) {
  return ({
    "economic-cost-weighted": "Cash split derived from each leg’s reference economic cost.",
    "points-weighted": "Cash split derived from each leg’s point total.",
    "equal-split": "Cash split derived as a simple 50/50 allocation.",
  })[method] || "Cash split derived across the two legs.";
}

function CombinationCard({ combo, rank }) {
  const breakdown = Object.entries(combo.pointBreakdown || {});
  const negativeSavings = Number.isFinite(combo.savingsVsCash) && combo.savingsVsCash < 0;
  return (
    <article className="rounded border-2 border-line bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-magenta">#{rank} · {combo.sameProgram ? "Same-program combination" : "Split-program combination"}</p>
          <h3 className="mt-1 font-data text-base font-bold">{combo.outbound.origin} ⇄ {combo.outbound.destination} · {combo.cabin}</h3>
          <p className="text-[11px] text-ink-soft">{combo.outboundDate} to {combo.returnDate}</p>
        </div>
        <span className="rounded border border-warn bg-warn/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-warn">Two separate one-way awards</span>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <Leg label="Outbound" leg={combo.outbound} />
        <Leg label="Return" leg={combo.return} />
      </div>

      <div className="mt-3 grid gap-2 rounded border border-deal bg-deal-soft p-2 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-soft">Award total</p>
          {combo.sameProgram ? (
            <p className="font-data text-sm font-bold" style={{ color: programMeta(combo.program).color }}>{combo.totalPoints.toLocaleString()} {combo.programLabel} pts</p>
          ) : (
            <div className="font-data text-xs font-bold">
              {breakdown.map(([program, points]) => {
                const meta = programMeta(program);
                return <div key={program} style={{ color: meta.color }}>{points.toLocaleString()} {meta.label}</div>;
              })}
            </div>
          )}
          <p className="font-data text-[10px] text-ink-soft">Taxes: {combo.taxesUsd == null ? "FX/tax data required" : formatMoney(combo.taxesUsd, BASE_CURRENCY)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-soft">True round-trip cash fare · per traveler</p>
          <p className="font-data text-sm font-bold text-deal">{combo.cashFare == null ? "Unavailable" : formatMoney(combo.cashFare, combo.cashCurrency || BASE_CURRENCY)}</p>
          <p className="text-[10px] text-ink-soft">{cashMatchLabel(combo.cashMatchType)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-soft">Round-trip CPP</p>
          {combo.sameProgram ? (
            <>
              <p className="font-data text-sm font-bold text-deal">{combo.cpp == null ? "Unavailable" : `${combo.cpp.toFixed(2)}¢/pt`}</p>
              <p className="text-[10px] text-ink-soft">Same loyalty currency across both legs.</p>
            </>
          ) : (
            <>
              <p className="font-data text-sm font-bold text-deal">{combo.derivedBlendedCpp == null ? "Unavailable" : `${combo.derivedBlendedCpp.toFixed(2)}¢/pt`}</p>
              <p className="text-[10px] text-ink-soft">Derived / blended across both point currencies.</p>
              {combo.legCppBreakdown?.length > 0 && (
                <div className="mt-1 space-y-0.5 font-data text-[10px] font-semibold">
                  {combo.legCppBreakdown.map((leg) => {
                    const meta = programMeta(leg.program);
                    return (
                      <div key={`${combo.id}-${leg.label}`} style={{ color: meta.color }}>
                        {leg.label}: {leg.programLabel || meta.label} {leg.cpp == null ? "—" : `${leg.cpp.toFixed(2)}¢/pt`}
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="mt-1 text-[10px] text-ink-soft">{splitMethodLabel(combo.cashSplitMethod)}</p>
            </>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-soft">Economic cost</p>
          <p className="font-data text-sm font-bold text-deal">{combo.economicCost == null ? "CPP/FX data required" : formatMoney(combo.economicCost, BASE_CURRENCY)}</p>
          <div className={`mt-2 rounded border px-2 py-1.5 ${negativeSavings ? "border-fresh bg-card" : "border-favorable/40 bg-paper"}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Savings vs. cash</p>
            <p className={`font-data text-sm font-bold ${negativeSavings ? "pb-flash-medium text-fresh" : "text-favorable"}`}>
              {combo.savingsVsCash == null ? "Unavailable" : formatMoney(combo.savingsVsCash, BASE_CURRENCY)}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-2 rounded border border-warn bg-warn/5 px-2 py-1 text-[10px] text-warn">
        Booking disclosure: this is an assembled comparison of two one-way award reservations. Availability, pricing, change rules, cancellation rules, and missed-connection protection can differ by program and ticket. It is not represented as a single round-trip award ticket.
      </p>
    </article>
  );
}

function Group({ title, description, rows }) {
  return (
    <section className="mt-4">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-1">
        <div>
          <h2 className="font-data text-sm font-bold uppercase tracking-[0.12em] text-heading">{title}</h2>
          <p className="text-[11px] text-ink-soft">{description}</p>
        </div>
        <span className="font-data text-[11px] text-ink-soft">{Math.min(rows.length, 20)} shown of {rows.length} ranked option{rows.length === 1 ? "" : "s"}</span>
      </div>
      {rows.length ? (
        <div className="space-y-3">{rows.slice(0, 20).map((combo, index) => <CombinationCard key={combo.id} combo={combo} rank={index + 1} />)}</div>
      ) : (
        <div className="rounded border border-dashed border-line p-4 text-center text-xs text-ink-soft">No combinations in this category passed the current award filters and seat requirement.</div>
      )}
    </section>
  );
}

export default function RoundTripResults({ data, loading, error, searched, searchedAt, selectedPrograms = [], filters = null }) {
  if (loading) return <div className="space-y-2">{[0, 1, 2].map((index) => <div key={index} className="h-44 animate-pulse rounded border border-line bg-paper-deep" />)}</div>;
  if (error) return <div role="alert" className="rounded border border-magenta bg-magenta/10 p-3 text-sm text-magenta">{error}</div>;
  if (!searched) return <div className="rounded border border-dashed border-line p-6 text-center text-sm text-ink-soft">Select one saved round-trip route and search award space.</div>;
  if (!data) return <div className="rounded border border-dashed border-line p-6 text-center text-sm text-ink-soft">No complete round-trip award combinations were returned.</div>;

  const cashDates = new Set((data.cashRows || []).map((row) => row.datePairKey)).size;
  const sameProgramRows = filterCombinations(data.sameProgram || [], filters, selectedPrograms);
  const splitProgramRows = filterCombinations(data.splitProgram || [], filters, selectedPrograms);
  return (
    <section aria-label="Round-trip award combinations">
      <div className="rounded border-2 border-magenta bg-magenta/5 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-magenta">Round-trip comparison</p>
            <h2 className="font-data text-lg font-bold">{data.route.origin} ⇄ {data.route.destination}</h2>
            <p className="text-xs text-ink-soft">Exact dates {data.route.date} to {data.route.returnDate}{data.route.flex ? ` · whole-trip shift ±${data.route.flex} days` : ""} · cash benchmark cabin: {data.route.cashCabin || "economy"}</p>
          </div>
          {searchedAt && <span className="font-data text-[10px] text-ink-soft">Fetched {new Date(searchedAt).toLocaleString()}</span>}
        </div>
        <p className="mt-2 text-[11px] text-ink-soft">Award results are paired from directional outbound and return availability. Programs, cabin, stops, time windows, layover duration, total travel time, and passenger filters remain live before and after Search. Cash results are requested as true round-trip itineraries for one traveler. {cashDates} shifted date pair{cashDates === 1 ? "" : "s"} returned live cash data.</p>
      </div>

      <Group title="Same-program round trips" description="Both directions use the same loyalty currency. A combined round-trip CPP is shown when cash fare and taxes are available." rows={sameProgramRows} />
      <Group title="Split-program round trips" description="Outbound and return use different programs. Each program name uses its filter-badge color; points remain separated, each leg now shows its own derived CPP, and a blended CPP is also displayed for the assembled round trip." rows={splitProgramRows} />
    </section>
  );
}
