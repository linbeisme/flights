import { useMemo, useState } from "react";
import { AIRLINE_NAMES, CABINS } from "../data/defaults.js";
import { formatDuration } from "../api/flightApi.js";
import { BASE_CURRENCY, formatMoney } from "../api/currency.js";
import { groupCashFareSummary, groupExactSameFlights } from "../api/sameFlightGroups.js";
import RedemptionActions from "./RedemptionActions.jsx";

const airlineName = (code) => AIRLINE_NAMES[code] || code;
const cabinLabel = (id) => CABINS.find((cabin) => cabin.id === id)?.label || id;

function when(value) {
  if (!value) return "not supplied";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function fareBasis(row) {
  const labels = {
    "exact-itinerary": "Exact itinerary fare",
    "schedule-match": "Probable schedule match",
    "same-carrier-benchmark": "Same-airline benchmark",
    "route-cabin-benchmark": "Route/cabin benchmark",
    "demo-illustrative": "Illustrative demo fare",
  };
  return labels[row.cashMatchType] || "Cash unavailable";
}

function Taxes({ row }) {
  if (row.taxesOriginal == null) return <span className="text-warn">Not supplied</span>;
  if ((row.taxesCurrency || BASE_CURRENCY) === BASE_CURRENCY) return formatMoney(row.taxesOriginal, BASE_CURRENCY);
  return (
    <span>
      {formatMoney(row.taxesOriginal, row.taxesCurrency)}
      <span className="block text-[9px] text-ink-soft">
        {row.taxesUsd == null ? "FX rate required" : `≈ ${formatMoney(row.taxesUsd, BASE_CURRENCY)}`}
      </span>
    </span>
  );
}

function ProgramRow({ row, pax, best }) {
  return (
    <li className={`grid gap-2 rounded border p-2.5 md:grid-cols-[1.25fr_repeat(6,minmax(80px,0.7fr))] ${best ? "border-deal bg-deal-soft/40" : "border-line bg-card"}`}>
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-data text-sm font-bold">{row.programLabel}</p>
          {best && <span className="rounded bg-deal px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Lowest economic cost</span>}
        </div>
        <p className="text-[10px] font-light text-ink-soft">
          ({row.carriers?.length ? `Operated by ${row.carriers.map(airlineName).join(" and ")}` : "Operating airline not provided"})
        </p>
        <RedemptionActions row={row} pax={pax} compact />
      </div>
      <div className="text-xs"><span className="block text-[9px] uppercase tracking-wider text-ink-soft">Redeem</span><strong className="font-data">{Number(row.points || 0).toLocaleString("en-US")} pts</strong><span className="block">+ <Taxes row={row} /></span></div>
      <div className="text-xs"><span className="block text-[9px] uppercase tracking-wider text-ink-soft">Cash fare</span><strong className="font-data">{row.cash == null ? "Unavailable" : formatMoney(row.cash, row.cashCurrency || BASE_CURRENCY)}</strong><span className="block text-[9px] text-ink-soft">{fareBasis(row)}</span></div>
      <div className="text-xs"><span className="block text-[9px] uppercase tracking-wider text-ink-soft">Realized CPP</span><strong className="font-data">{row.cpp == null ? "—" : `${row.cpp.toFixed(2)}¢`}</strong></div>
      <div className="text-xs"><span className="block text-[9px] uppercase tracking-wider text-ink-soft">Economic cost</span><strong className="font-data text-deal">{row.economicCost == null ? "Pending FX/CPP" : formatMoney(row.economicCost, BASE_CURRENCY)}</strong></div>
      <div className="text-xs"><span className="block text-[9px] uppercase tracking-wider text-ink-soft">Seats</span><strong className="font-data">{row.seats == null ? "Unknown" : row.seats}</strong></div>
      <div className="text-xs"><span className="block text-[9px] uppercase tracking-wider text-ink-soft">Updated</span><strong className="font-data text-[10px]">{when(row.availabilityUpdatedAt)}</strong></div>
    </li>
  );
}

function FlightGroup({ group, pax }) {
  const row = group.representative;
  const fare = groupCashFareSummary(group);
  const cashLabel = fare.min == null
    ? "Cash fare unavailable"
    : fare.min === fare.max
      ? formatMoney(fare.min, row.cashCurrency || BASE_CURRENCY)
      : `${formatMoney(fare.min, row.cashCurrency || BASE_CURRENCY)}–${formatMoney(fare.max, row.cashCurrency || BASE_CURRENCY)}`;
  const bestId = group.bestEconomic?.id;
  const bestCpp = [...group.rows]
    .filter((item) => Number.isFinite(item.cpp))
    .sort((a, b) => b.cpp - a.cpp)[0] || null;
  return (
    <article className="rounded border-2 border-ink bg-paper-deep p-3">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-data text-base font-bold">{row.origin}→{row.destination} · {row.flightNumbers || "Flight number unavailable"}</h3>
            {group.multiProgram ? (
              <span className="rounded bg-magenta px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Same flight · {new Set(group.rows.map((item) => item.program)).size} programs</span>
            ) : group.exact ? (
              <span className="rounded border border-line bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Exact flight identity</span>
            ) : (
              <span className="rounded border border-warn bg-warn/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warn">Identity not confirmed</span>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            {row.date} · {row.departTime}–{row.arriveTime}{row.arrivesNextDay ? "+1" : ""} · {cabinLabel(row.cabin)} · {row.stops === 0 ? "Nonstop" : `${row.stops ?? "?"} stop${row.stops === 1 ? "" : "s"}${row.connections?.length ? ` via ${row.connections.join(", ")}` : ""}`} · {formatDuration(row.totalMinutes)}
            {row.layovers?.length ? ` · layover${row.layovers.length > 1 ? "s" : ""} ${row.layovers.map(formatDuration).join(", ")}` : ""}
          </p>
          <p className="mt-1 text-[10px] font-light text-ink-soft">({row.carriers?.length ? `Operated by ${row.carriers.map(airlineName).join(" and ")}` : "Operating airline not provided"})</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <div className="rounded border border-deal bg-deal-soft px-3 py-2 text-right">
            <p className="text-[9px] uppercase tracking-wider text-deal">{fare.label}</p>
            <p className="font-data text-lg font-bold text-deal">{cashLabel}</p>
            <p className="text-[9px] text-ink-soft">Each loyalty row shows its own fare provenance.</p>
          </div>
          <div className="rounded border border-ink bg-card px-3 py-2 text-right" title="Highest realized cents-per-point value within this exact-flight group">
            <p className="text-[9px] uppercase tracking-wider text-ink-soft">Best realized CPP</p>
            <p className="font-data text-lg font-bold text-ink">{bestCpp ? `${bestCpp.cpp.toFixed(2)}¢` : "—"}</p>
            <p className="text-[9px] text-ink-soft">{bestCpp ? bestCpp.programLabel : "Cash/fee data unavailable"}</p>
          </div>
        </div>
      </div>
      <div className="mt-2 hidden grid-cols-[1.25fr_repeat(6,minmax(80px,0.7fr))] gap-2 px-2.5 text-[9px] font-semibold uppercase tracking-wider text-ink-soft md:grid">
        <span>Reward program</span><span>Points + fees</span><span>Cash fare</span><span>CPP</span><span>Economic cost</span><span>Seats</span><span>Availability</span>
      </div>
      <ul className="mt-1 space-y-1.5">
        {group.rows.map((programRow) => <ProgramRow key={programRow.id} row={programRow} pax={pax} best={programRow.id === bestId} />)}
      </ul>
    </article>
  );
}

export default function SameFlightView({ results, pax = 1, dataMode = "live" }) {
  const [multiOnly, setMultiOnly] = useState(false);
  const groups = useMemo(() => groupExactSameFlights(results), [results]);
  const visible = multiOnly ? groups.filter((group) => group.multiProgram) : groups;
  const multiCount = groups.filter((group) => group.multiProgram).length;
  if (!results.length) {
    return <p className="rounded border border-dashed border-line p-4 text-sm text-ink-soft">Run a reward search to group identical operating flights across loyalty programs.</p>;
  }
  return (
    <section aria-label="Exact same flight grouping" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-ink bg-paper-deep p-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-heading">Exact same-flight view</h2>
          <p className="mt-1 text-xs text-ink-soft">Groups rows only when the complete available flight-number sequence, date, route, and cabin match. The same program, cabin, time, stop, layover, connection-airport, and total-duration filters used by Reward Results apply here. Cash fare and economic cost remain separate.</p>
        </div>
        <label className="flex items-center gap-2 rounded border border-line bg-card px-2 py-1.5 text-xs">
          <input type="checkbox" checked={multiOnly} onChange={(event) => setMultiOnly(event.target.checked)} className="accent-magenta" />
          Multi-program groups only ({multiCount})
        </label>
      </div>
      {dataMode === "demo" && <p className="rounded border border-warn bg-warn/10 px-3 py-2 font-data text-xs font-bold text-warn">DEMO MODE — same-flight groups use pre-built illustrative data.</p>}
      {visible.length ? visible.map((group) => <FlightGroup key={group.key} group={group} pax={pax} />) : <p className="rounded border border-dashed border-line p-4 text-sm text-ink-soft">No exact flight is currently available through more than one selected loyalty program. Turn off the multi-program-only filter to see all exact flight identities.</p>}
    </section>
  );
}
