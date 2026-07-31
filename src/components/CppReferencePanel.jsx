import { useEffect, useMemo, useRef, useState } from "react";
import { buildCppLibrary, cppLibraryToDocument } from "../api/cppLibrary.js";
import { CPP_TPG_UPDATE_PROMPT } from "../data/cppUpdatePrompt.js";

const GITHUB_CPP_EDIT_URL_KEY = "pointsboard.github.cpp-edit-url.v1";
const DEFAULT_GITHUB_CPP_EDIT_URL = import.meta.env.VITE_GITHUB_CPP_EDIT_URL || "";

function rowKey(row) {
  return row.programId || row.program;
}

function downloadJson(payload, filename = `pointsboard-cpp-library-${new Date().toISOString().slice(0, 10)}.json`) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = window.document.createElement("textarea");
  area.value = value;
  area.style.position = "fixed";
  area.style.opacity = "0";
  window.document.body.appendChild(area);
  area.select();
  window.document.execCommand("copy");
  area.remove();
}

function loadGithubEditUrl() {
  try {
    return localStorage.getItem(GITHUB_CPP_EDIT_URL_KEY) || DEFAULT_GITHUB_CPP_EDIT_URL;
  } catch {
    return DEFAULT_GITHUB_CPP_EDIT_URL;
  }
}

function validGithubEditUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com" && /\/edit\/.+\/public\/cpp-library\.json$/i.test(url.pathname);
  } catch {
    return false;
  }
}

export default function CppReferencePanel({ library, error, onApply, onReset }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [draftRows, setDraftRows] = useState([]);
  const [message, setMessage] = useState("");
  const [editError, setEditError] = useState("");
  const [githubEditUrl, setGithubEditUrl] = useState(loadGithubEditUrl);
  const fileInput = useRef(null);
  const airlineRows = useMemo(
    () => (library?.rows || []).filter((row) => String(row.type).toLowerCase() === "airline").sort((a, b) => a.program.localeCompare(b.program)),
    [library]
  );
  const meta = library?.meta || {};

  useEffect(() => {
    setDraftRows(airlineRows.map((row) => ({ ...row })));
  }, [airlineRows]);

  useEffect(() => {
    try {
      if (githubEditUrl) localStorage.setItem(GITHUB_CPP_EDIT_URL_KEY, githubEditUrl);
      else localStorage.removeItem(GITHUB_CPP_EDIT_URL_KEY);
    } catch {
      /* keep the panel usable when storage is unavailable */
    }
  }, [githubEditUrl]);

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

  function currentDocument() {
    return editing ? documentWithDraftRows() : cppLibraryToDocument(library);
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
      setMessage("CPP JSON imported and applied in this browser. Download the GitHub file and commit it to share the update with every user.");
    } catch (err) {
      setEditError(err.message || "CPP JSON is invalid.");
    }
  }

  async function copyPrompt() {
    try {
      await copyText(CPP_TPG_UPDATE_PROMPT);
      setMessage("Latest-TPG CPP prompt copied. Attach the exported current CPP JSON when using ChatGPT or Gemini.");
      setEditError("");
    } catch {
      setEditError("The prompt could not be copied. Open the prompt and copy it manually.");
    }
  }

  async function copyGithubJson() {
    try {
      await copyText(JSON.stringify(currentDocument(), null, 2));
      setMessage("GitHub-ready cpp-library.json copied. Paste it into public/cpp-library.json and commit the change.");
      setEditError("");
    } catch {
      setEditError("The GitHub JSON could not be copied. Download the file instead.");
    }
  }

  const githubUrlIsValid = validGithubEditUrl(githubEditUrl);

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
                <button type="button" onClick={() => downloadJson(currentDocument())} className="rounded border border-line bg-card px-2.5 py-1 text-[11px] font-semibold text-ink">Export JSON</button>
                <button type="button" onClick={() => fileInput.current?.click()} className="rounded border border-line bg-card px-2.5 py-1 text-[11px] font-semibold text-ink">Import JSON</button>
                {meta.override && <button type="button" onClick={() => { onReset?.(); setEditing(false); setMessage("Shipped CPP values restored."); }} className="rounded border border-warn bg-warn/5 px-2.5 py-1 text-[11px] font-semibold text-warn">Reset shipped values</button>}
                <input ref={fileInput} type="file" accept="application/json,.json" onChange={importJson} className="hidden" />
                <p className="w-full text-[10px] text-ink-soft">Manual changes use LocalStorage and add no API cost. Values below 1.25¢ are highlighted in red.</p>
              </div>

              <div className="mb-3 rounded border border-magenta/40 bg-magenta/5 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-heading">Update CPP from the latest TPG valuations</h3>
                    <p className="mt-1 text-[10px] text-ink-soft">Export the current JSON, attach it to ChatGPT or Gemini with web browsing enabled, and use the built-in validation prompt. Import the generated JSON back into PointsBoard.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={copyPrompt} className="rounded bg-magenta px-2.5 py-1 text-[11px] font-semibold text-white">Copy TPG update prompt</button>
                    <button type="button" onClick={() => setPromptOpen((value) => !value)} className="rounded border border-magenta bg-card px-2.5 py-1 text-[11px] font-semibold text-magenta">{promptOpen ? "Hide prompt" : "Show prompt"}</button>
                  </div>
                </div>
                {promptOpen && <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded border border-line bg-card p-2 font-data text-[10px] leading-relaxed text-ink">{CPP_TPG_UPDATE_PROMPT}</pre>}
              </div>

              <div className="mb-3 rounded border border-deal bg-deal-soft/40 p-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-heading">Publish the imported CPP JSON through GitHub</h3>
                <p className="mt-1 text-[10px] text-ink-soft">After importing and reviewing the new values, download or copy the exact GitHub file. Commit it as <code className="font-data">public/cpp-library.json</code>. After GitHub/Cloudflare deployment, everyone using the app URL loads the shared updated CPP library.</p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <button type="button" onClick={() => downloadJson(currentDocument(), "cpp-library.json")} className="rounded border border-deal bg-card px-2.5 py-1 text-[11px] font-semibold text-deal">Download GitHub JSON</button>
                  <button type="button" onClick={copyGithubJson} className="rounded border border-deal bg-card px-2.5 py-1 text-[11px] font-semibold text-deal">Copy GitHub JSON</button>
                  <label className="min-w-64 flex-1 text-[10px] text-ink-soft">
                    GitHub editor URL for public/cpp-library.json
                    <input
                      value={githubEditUrl}
                      onChange={(event) => setGithubEditUrl(event.target.value.trim())}
                      placeholder="https://github.com/OWNER/REPO/edit/main/public/cpp-library.json"
                      className="mt-1 w-full rounded border border-line bg-card px-2 py-1.5 font-data text-[10px] text-ink"
                    />
                  </label>
                  <a
                    href={githubUrlIsValid ? githubEditUrl : undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!githubUrlIsValid}
                    className={`rounded px-2.5 py-1 text-[11px] font-semibold ${githubUrlIsValid ? "bg-ink text-paper" : "cursor-not-allowed border border-line bg-card text-ink-soft opacity-50"}`}
                    onClick={(event) => { if (!githubUrlIsValid) event.preventDefault(); }}
                  >
                    Open GitHub editor
                  </a>
                </div>
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
                    {(editing ? draftRows : airlineRows).map((row) => {
                      const lowCpp = Number(row.cpp) < 1.25;
                      return (
                        <tr key={`${rowKey(row)}-${row.asOf}`} className="border-t border-line">
                          <td className="px-3 py-2 font-semibold text-ink">{row.program}</td>
                          <td className={`px-3 py-2 text-right font-data font-bold ${lowCpp ? "text-[#dc2626]" : "text-deal"}`}>
                            {editing ? (
                              <input type="number" min="0.01" step="0.01" value={row.cpp} onChange={(event) => updateDraft(rowKey(row), { cpp: event.target.value })} className={`w-20 rounded border border-line bg-paper px-2 py-1 text-right ${lowCpp ? "text-[#dc2626]" : "text-deal"}`} aria-label={`${row.program} CPP`} />
                            ) : `${Number(row.cpp).toFixed(2)}¢`}
                          </td>
                          <td className="px-3 py-2 font-data text-ink-soft">
                            {editing ? <input type="date" value={row.asOf || ""} onChange={(event) => updateDraft(rowKey(row), { asOf: event.target.value })} className="rounded border border-line bg-paper px-2 py-1" aria-label={`${row.program} valuation date`} /> : row.asOf || "—"}
                          </td>
                          <td className="px-3 py-2 text-ink-soft">
                            {editing ? <input value={row.source || ""} onChange={(event) => updateDraft(rowKey(row), { source: event.target.value })} className="min-w-48 rounded border border-line bg-paper px-2 py-1" aria-label={`${row.program} source`} /> : row.source || meta.source || "—"}
                          </td>
                        </tr>
                      );
                    })}
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
