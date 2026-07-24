import { BASE_CURRENCY, normalizeFxEntry } from "../api/currency.js";

export default function FxPanel({ currencies, fxRates, onChange }) {
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

  return (
    <section className="mb-3 rounded border-2 border-warn bg-warn/10 p-3" aria-labelledby="fx-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="fx-heading" className="text-xs font-bold uppercase tracking-[0.15em] text-heading">
            FX conversion for award taxes and fees
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            Enter how many U.S. dollars equal 1 unit of each foreign currency. Until a valid rate is entered, USD taxes, CPP, economic cost, and recommendation ranking remain unavailable for that result.
          </p>
        </div>
        <span className="rounded border border-warn bg-card px-2 py-1 font-data text-[10px] font-bold text-warn">
          Base currency: {BASE_CURRENCY}
        </span>
      </div>

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
    </section>
  );
}
