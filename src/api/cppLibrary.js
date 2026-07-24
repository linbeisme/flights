export const EMPTY_CPP_LIBRARY = Object.freeze({
  map: Object.freeze({}),
  meta: Object.freeze({ source: "Unavailable", asOf: null, updatedAt: null, sourceUrl: null }),
});

export function buildCppLibrary(data) {
  if (!data || !Array.isArray(data.cppLibrary)) {
    throw new Error("CPP library is missing cppLibrary[]");
  }
  const map = {};
  for (const row of data.cppLibrary) {
    if (!row?.programId) continue;
    const cpp = Number(row.cpp);
    if (!Number.isFinite(cpp) || cpp <= 0) {
      throw new Error(`Invalid CPP for ${row.programId}`);
    }
    if (map[row.programId]) {
      throw new Error(`Duplicate CPP programId: ${row.programId}`);
    }
    map[row.programId] = {
      programId: row.programId,
      program: row.program,
      cpp,
      source: row.source || data.source || "Unknown",
      asOf: row.asOf || data.asOf || null,
    };
  }
  return {
    map,
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
