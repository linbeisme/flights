import { useEffect, useMemo, useRef, useState } from "react";
import { buildCppLibrary, cppLibraryToDocument } from "../api/cppLibrary.js";

function rowKey(row) {
  return row.programId || row.program;
}

function downloadJson(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `pointsboard-cpp-library-${new Date().toISOString().slice(0, 10)}.json`;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function CppReferencePanel({ library, error, onApply, onReset }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftRows, setDraftRows] = useState([]);
  const [message, setMessage] = useState("");
  const [editError, setEditError] = useState("");
  const fileInput = useRef(null);
  const airlineRows = useMemo(
    () => (library?.rows || []).filter((row) => String(row.type).toLowerCase() === "airline").sort((a, b) => a.program.localeCompare(b.program)),
    [library]
  );
  const meta = library?.meta || {};

  useEffect(() => {
    setDraftRows(airlineRows.map((row) => ({ ...row })));
  }, [airlineRows]);

  function updateDraft(key, patch) {
    setDraftRows((rows) => rows.map((row) => rowKey(row) === key ? { ...row, ...patch } : row));
  }

  function documentWithDraftRows() {
    const edits = new Map(draftRows.map((row) => [rowKey(row), row]));
    const merged = {
      ...library,
      rows: (library?.rows || []).map((row) => edits.get(rowKey(row)) || row),
    };
    return cppLibraryToDocument(merged, {
      source: meta.override ? meta.source : "Manual PointsBoard override",
      asOf: new Date().toISOString().slice(0, 10),
      sourceUrl: meta.sourceUrl,
    });
  }

  function saveManual() {
    try {
      const document = documentWithDraftRows();
      buildCppLibrary(document, { override: true });
      onApply?.(document);
      setEditing(false);
      setEditError("");
      setMessage("Manual CPP values saved in this browser. Economic-cost results have been recalculated.");
    } catch (err) {
      setEditError(err.message || "CPP values could not be saved.");
    }
  }

  async function importJson(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const document = JSON.parse(await file.text());
      buildCppLibrary(document, { override: true });
      onApply?.(document);
      setEditError("");
      setMessage("CPP JSON imported and applied in this browser.");
    } catch (err) {
      setEditError(err.message || "CPP JSON is invalid.");
    }
  }

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
            {meta.override && <span className="ml-2 rounded border border-magenta px-1 py-0.5 text-[9px] font-bold uppercase text-magenta">Manual browser override</span>}
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
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => { setEditing((value) => !value); setMessage(""); setEditError(""); }} className="rounded border border-magenta bg-magenta/5 px-2.5 py-1 text-[11px] font-semibold text-magenta">
                  {editing ? "Cancel editing" : "Edit CPP manually"}
                </button>
                <button type="button" onClick={() => downloadJson(cppLibraryToDocument(library))} className="rounded border border-line bg-card px-2.5 py-1 text-[11px] font-semibold text-ink">Export JSON</button>
                <button type="button" onClick={() => fileInput.current?.click()} className="rounded border border-line bg-card px-2.5 py-1 text-[11px] font-semibold text-ink">Import JSON</button>
                {meta.override && <button type="button" onClick={() => { onReset?.(); setEditing(false); setMessage("Shipped CPP values restored."); }} className="rounded border border-warn bg-warn/5 px-2.5 py-1 text-[11px] font-semibold text-warn">Reset shipped values</button>}
                <input ref={fileInput} type="file" accept="application/json,.json" onChange={importJson} className="hidden" />
                <p className="w-full text-[10px] text-ink-soft">Manual changes use LocalStorage and add no API cost. Export the JSON and replace <code className="font-data">public/cpp-library.json</code> for a permanent shared update.</p>
              </div>

              {message && <p role="status" className="mb-2 rounded border border-deal bg-deal-soft px-2 py-1 text-[11px] text-deal">{message}</p>}
              {editError && <p role="alert" className="mb-2 rounded border border-magenta bg-magenta/10 px-2 py-1 text-[11px] text-magenta">{editError}</p>}

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
                    {(editing ? draftRows : airlineRows).map((row) => (
                      <tr key={`${rowKey(row)}-${row.asOf}`} className="border-t border-line">
                        <td className="px-3 py-2 font-semibold text-ink">{row.program}</td>
                        <td className="px-3 py-2 text-right font-data font-bold text-deal">
                          {editing ? (
                            <input type="number" min="0.01" step="0.01" value={row.cpp} onChange={(event) => updateDraft(rowKey(row), { cpp: event.target.value })} className="w-20 rounded border border-line bg-paper px-2 py-1 text-right" aria-label={`${row.program} CPP`} />
                          ) : `${Number(row.cpp).toFixed(2)}¢`}
                        </td>
                        <td className="px-3 py-2 font-data text-ink-soft">
                          {editing ? <input type="date" value={row.asOf || ""} onChange={(event) => updateDraft(rowKey(row), { asOf: event.target.value })} className="rounded border border-line bg-paper px-2 py-1" aria-label={`${row.program} valuation date`} /> : row.asOf || "—"}
                        </td>
                        <td className="px-3 py-2 text-ink-soft">
                          {editing ? <input value={row.source || ""} onChange={(event) => updateDraft(rowKey(row), { source: event.target.value })} className="min-w-48 rounded border border-line bg-paper px-2 py-1" aria-label={`${row.program} source`} /> : row.source || meta.source || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {editing && <div className="mt-2 flex justify-end"><button type="button" onClick={saveManual} className="rounded bg-magenta px-3 py-1.5 text-xs font-semibold text-white">Save manual CPP values</button></div>}
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
