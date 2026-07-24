export function containsDemoData(rows) {
  return Array.isArray(rows) && rows.some((row) => row?.demo === true || row?.cashSource === "demo");
}

export function containsSyntheticLiveFallback(rows) {
  return Array.isArray(rows) && rows.some((row) => row?.cashSource === "estimate" || row?.cashMatchType === "estimated-route-cabin");
}

export function containsUnsafeLiveData(rows) {
  return containsDemoData(rows) || containsSyntheticLiveFallback(rows);
}

export function isSafeLiveHistoryEntry(entry) {
  return Boolean(entry && Array.isArray(entry.results) && !containsUnsafeLiveData(entry.results));
}

export function sanitizeLiveHistory(entries, max = 20) {
  return (Array.isArray(entries) ? entries : []).filter(isSafeLiveHistoryEntry).slice(0, max);
}

export function assertLiveResults(rows) {
  if (containsDemoData(rows)) throw new Error("Live search rejected demo-tagged data.");
  if (containsSyntheticLiveFallback(rows)) throw new Error("Live search rejected synthetic cash-fare fallback data.");
  return rows;
}
