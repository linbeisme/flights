export const CPP_OVERRIDE_KEY = "pointsboard.cpp-overrides.v1";

export const EMPTY_CPP_LIBRARY = Object.freeze({
  map: Object.freeze({}),
  rows: Object.freeze([]),
  meta: Object.freeze({ source: "Unavailable", asOf: null, updatedAt: null, sourceUrl: null, override: false }),
});

export function buildCppLibrary(data, { override = false } = {}) {
  if (!data || !Array.isArray(data.cppLibrary)) {
    throw new Error("CPP library is missing cppLibrary[]");
  }
  const map = {};
  const rows = data.cppLibrary.map((row) => {
    const cpp = Number(row.cpp);
    if (!Number.isFinite(cpp) || cpp <= 0) {
      throw new Error(`Invalid CPP for ${row.program || row.programId || "unknown program"}`);
    }
    const normalized = {
      programId: row.programId || null,
      program: row.program || row.programId || "Unknown program",
      type: row.type || "Other",
      cpp,
      source: row.source || data.source || "Unknown",
      asOf: row.asOf || data.asOf || null,
    };
    if (normalized.programId) {
      if (map[normalized.programId]) {
        throw new Error(`Duplicate CPP programId: ${normalized.programId}`);
      }
      map[normalized.programId] = normalized;
    }
    return normalized;
  });
  return {
    map,
    rows,
    meta: {
      schema: data.schema || null,
      source: data.source || "Unknown",
      asOf: data.asOf || null,
      updatedAt: data.updatedAt || null,
      sourceUrl: data.sourceUrl || null,
      override,
    },
  };
}

export function cppLibraryToDocument(library, metaPatch = {}) {
  const meta = library?.meta || {};
  return {
    schema: meta.schema || "partner-redemption-comparator.cpp-library.v2",
    source: metaPatch.source || meta.source || "Manual CPP values",
    asOf: metaPatch.asOf || meta.asOf || new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
    sourceUrl: metaPatch.sourceUrl ?? meta.sourceUrl ?? null,
    instructions: "Manual PointsBoard CPP values. Export this JSON to replace public/cpp-library.json when a shared permanent update is desired.",
    cppLibrary: (library?.rows || []).map((row) => ({
      program: row.program,
      type: row.type,
      cpp: Number(row.cpp),
      source: row.source || metaPatch.source || meta.source || "Manual",
      asOf: row.asOf || metaPatch.asOf || meta.asOf || null,
      ...(row.programId ? { programId: row.programId } : {}),
    })),
  };
}

export function loadStoredCppOverride() {
  try {
    const raw = localStorage.getItem(CPP_OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredCppOverride(document) {
  const library = buildCppLibrary(document, { override: true });
  try {
    localStorage.setItem(CPP_OVERRIDE_KEY, JSON.stringify(document));
  } catch {
    throw new Error("CPP override could not be saved in this browser.");
  }
  return library;
}

export function clearStoredCppOverride() {
  try {
    localStorage.removeItem(CPP_OVERRIDE_KEY);
  } catch {
    /* keep app usable even when storage is blocked */
  }
}

export async function loadCppLibrary(url = "/cpp-library.json") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`CPP library HTTP ${response.status}`);
  return buildCppLibrary(await response.json());
}
