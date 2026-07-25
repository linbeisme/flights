import { useEffect, useMemo, useRef, useState } from "react";
import { BASE_CURRENCY, normalizeFxEntry } from "../api/currency.js";

export default function FxPanel({ currencies, fxRates, onChange }) {
  const [open, setOpen] = useState(false);
  const previousSignature = useRef("");
  const signature = useMemo(() => [...currencies].sort().join(","), [currencies]);

  // Default is collapsed. Newly detected foreign-currency award fees open the
  // panel automatically so the required USD conversion can be entered.
  useEffect(() => {
    if (signature && signature !== previousSignature.current) setOpen(true);
    if (!signature) setOpen(false);
    previousSignature.current = signature;
  }, [signature]);

  if (!currencies.length) return null;

  const update = (currency, patch) => {
    const current = fxRates[currency] || {};
    onChange({
      ...fxRates,
      [currency]: { ...current, ...patch, source: "manual" },
    });
  };

  const clear = (currency) => {
    const next = { ...fxRates };
    delete next[currency];
    onChange(next);
  };

  const configured = currencies.filter((currency) => Boolean(normalizeFxEntry(fxRates[currency]))).length;

  return (
    <section className="mb-3 rounded border-2 border-warn bg-warn/10 p-3" aria-labelledby="fx-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="fx-heading" className="text-xs font-bold uppercase tracking-[0.15em] text-heading">
            FX conversion for award taxes and fees
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            This shared panel applies to Recommendations + Results, Exact Same Flight, and Cash Fares. Enter how many U.S. dollars equal 1 unit of each foreign currency.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-warn bg-card px-2 py-1 font-data text-[10px] font-bold text-warn">
            {configured}/{currencies.length} rate{currencies.length === 1 ? "" : "s"} active · base {BASE_CURRENCY}
          </span>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded border border-blue-300 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-950 hover:bg-blue-200"
            aria-expanded={open}
            aria-controls="fx-rate-controls"
          >
            {open ? "Hide FX conversion" : "Show FX conversion"}
          </button>
        </div>
      </div>

      {open && (
        <div id="fx-rate-controls">
          <p className="mt-2 text-[11px] text-ink-soft">
            Until a valid rate is entered, USD taxes, CPP, economic cost, and recommendation ranking remain unavailable for that foreign-currency result.
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {currencies.map((currency) => {
              const entry = fxRates[currency] || {};
              const valid = Boolean(normalizeFxEntry(entry));
              return (
                <div key={currency} className="rounded border border-line bg-card p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-data text-sm font-bold">1 {currency} =</span>
                    <button type="button" onClick={() => clear(currency)} className="text-[10px] text-ink-soft underline decoration-dotted hover:text-magenta">
                      Clear
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min="0.000001"
                      step="0.000001"
                      value={entry.rate ?? ""}
                      onChange={(e) => update(currency, { rate: e.target.value })}
                      aria-label={`USD per ${currency}`}
                      placeholder="USD rate"
                      className="min-w-0 flex-1 rounded border border-line bg-paper px-2 py-1.5 font-data text-sm"
                    />
                    <span className="font-data text-xs font-bold">USD</span>
                  </div>
                  <label className="mt-2 block text-[10px] text-ink-soft">
                    Rate date
                    <input
                      type="date"
                      value={entry.asOf || ""}
                      onChange={(e) => update(currency, { asOf: e.target.value })}
                      className="mt-1 block w-full rounded border border-line bg-paper px-2 py-1 text-xs"
                    />
                  </label>
                  <p className={`mt-1 text-[10px] font-semibold ${valid ? "text-deal" : "text-warn"}`}>
                    {valid ? "Manual rate active" : "Rate required"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
