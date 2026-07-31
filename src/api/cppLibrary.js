export const EMPTY_CPP_LIBRARY = Object.freeze({
  map: Object.freeze({}),
  rows: Object.freeze([]),
  meta: Object.freeze({ source: "Unavailable", asOf: null, updatedAt: null, sourceUrl: null }),
});

export function buildCppLibrary(data) {
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
    },
  };
}

export async function loadCppLibrary(url = "/cpp-library.json") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`CPP library HTTP ${response.status}`);
  return buildCppLibrary(await response.json());
}
