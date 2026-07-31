import { useMemo, useState } from "react";

export default function CppReferencePanel({ library, error }) {
  const [open, setOpen] = useState(false);
  const airlineRows = useMemo(
    () => (library?.rows || []).filter((row) => String(row.type).toLowerCase() === "airline").sort((a, b) => a.program.localeCompare(b.program)),
    [library]
  );
  const meta = library?.meta || {};

  return (
    <section className="mb-3 rounded border border-line bg-paper-deep" aria-labelledby="cpp-reference-heading">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
        aria-expanded={open}
        aria-controls="cpp-reference-content"
      >
        <div>
          <h2 id="cpp-reference-heading" className="text-xs font-bold uppercase tracking-[0.15em] text-heading">Reference CPP library</h2>
          <p className="mt-0.5 text-[11px] text-ink-soft">
            Airline points and miles reference values · {meta.source || "source unavailable"}{meta.asOf ? ` · as of ${meta.asOf}` : ""}
          </p>
        </div>
        <span className="rounded border border-line bg-card px-2 py-1 text-[11px] font-semibold text-ink-soft">{open ? "Hide" : `Show ${airlineRows.length} airline values`}</span>
      </button>

      {open && (
        <div id="cpp-reference-content" className="border-t border-line px-3 py-3">
          {error ? (
            <p className="rounded border border-magenta bg-magenta/10 px-2 py-1 text-xs text-magenta">CPP library unavailable: {error}</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded border border-line bg-card">
                <table className="min-w-full border-collapse text-left text-xs">
                  <thead className="bg-paper-deep text-[10px] uppercase tracking-wider text-heading">
                    <tr>
                      <th className="px-3 py-2">Airline program</th>
                      <th className="px-3 py-2 text-right">Reference CPP</th>
                      <th className="px-3 py-2">Valuation date</th>
                      <th className="px-3 py-2">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {airlineRows.map((row) => (
                      <tr key={`${row.program}-${row.asOf}`} className="border-t border-line">
                        <td className="px-3 py-2 font-semibold text-ink">{row.program}</td>
                        <td className="px-3 py-2 text-right font-data font-bold text-deal">{row.cpp.toFixed(2)}¢</td>
                        <td className="px-3 py-2 font-data text-ink-soft">{row.asOf || "—"}</td>
                        <td className="px-3 py-2 text-ink-soft">{row.source || meta.source || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-soft">
                <p>Reference CPP is used for economic-cost comparisons; realized CPP is calculated from the live cash fare and award taxes.</p>
                {meta.sourceUrl && <a href={meta.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-magenta underline decoration-dotted">Open source valuation page</a>}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
