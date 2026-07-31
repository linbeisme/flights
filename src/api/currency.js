export const BASE_CURRENCY = "USD";
export const FX_VALID_DAYS = 30;
const DAY_MS = 86400000;

export function normalizeCurrencyCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

export function detectTaxCurrency(trip = {}, availability = {}, cabin = "") {
  const prefix = { economy: "Y", premium: "W", business: "J", first: "F" }[cabin] || "";
  const candidates = [
    trip.TotalTaxesCurrency,
    trip.TotalTaxesCurrencyCode,
    trip.TaxesCurrency,
    trip.TaxCurrency,
    trip.Currency,
    prefix && availability[`${prefix}TotalTaxesCurrency`],
    prefix && availability[`${prefix}TaxesCurrency`],
    availability.TotalTaxesCurrency,
    availability.TaxesCurrency,
    availability.Currency,
  ];
  for (const value of candidates) {
    const code = normalizeCurrencyCode(value);
    if (code) return { code, source: "provider" };
  }

  // Historical seats.aero payloads omitted a separate tax-currency field.
  // Preserve the legacy USD assumption, but keep the provenance explicit.
  return { code: BASE_CURRENCY, source: "legacy-usd-assumption" };
}

function utcDayStart(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function fxEntryStatus(value, now = new Date()) {
  if (value == null) return { valid: false, reason: "missing", ageDays: null, daysRemaining: 0 };
  const entry = typeof value === "object" ? value : { rate: value };
  const rate = Number(entry.rate);
  if (!Number.isFinite(rate) || rate <= 0) {
    return { valid: false, reason: "invalid-rate", ageDays: null, daysRemaining: 0 };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(entry.asOf || ""))) {
    return { valid: false, reason: "missing-date", ageDays: null, daysRemaining: 0 };
  }
  const asOfDay = utcDayStart(`${entry.asOf}T00:00:00Z`);
  const nowDay = utcDayStart(now);
  if (asOfDay == null || nowDay == null) {
    return { valid: false, reason: "invalid-date", ageDays: null, daysRemaining: 0 };
  }
  const ageDays = Math.max(0, Math.floor((nowDay - asOfDay) / DAY_MS));
  const expired = ageDays > FX_VALID_DAYS;
  return {
    valid: !expired,
    reason: expired ? "expired" : "active",
    ageDays,
    daysRemaining: expired ? 0 : Math.max(0, FX_VALID_DAYS - ageDays),
  };
}

export function normalizeFxEntry(value, now = new Date()) {
  const status = fxEntryStatus(value, now);
  if (!status.valid) return null;
  const entry = typeof value === "object" ? value : { rate: value };
  return {
    rate: Number(entry.rate),
    asOf: entry.asOf,
    source: entry.source || "manual",
    ageDays: status.ageDays,
    daysRemaining: status.daysRemaining,
  };
}

export function convertToUsd(amount, currency, fxRates = {}, now = new Date()) {
  const numeric = Number(amount);
  const code = normalizeCurrencyCode(currency);
  if (!Number.isFinite(numeric) || !code) {
    return { usd: null, rate: null, status: "invalid", currency: code };
  }
  if (code === BASE_CURRENCY) {
    return { usd: numeric, rate: 1, status: "native-usd", currency: code };
  }
  const rawEntry = fxRates[code];
  const entry = normalizeFxEntry(rawEntry, now);
  if (!entry) {
    const rawStatus = fxEntryStatus(rawEntry, now);
    return {
      usd: null,
      rate: null,
      status: rawStatus.reason === "expired" ? "expired-rate" : "missing-rate",
      currency: code,
      ageDays: rawStatus.ageDays,
    };
  }
  return {
    usd: numeric * entry.rate,
    rate: entry.rate,
    asOf: entry.asOf,
    source: entry.source,
    ageDays: entry.ageDays,
    daysRemaining: entry.daysRemaining,
    status: "converted-manual",
    currency: code,
  };
}

export function formatMoney(amount, currency = BASE_CURRENCY, options = {}) {
  if (amount == null || amount === "") return "—";
  const numeric = Number(amount);
  const code = normalizeCurrencyCode(currency) || BASE_CURRENCY;
  if (!Number.isFinite(numeric)) return "—";
  try {
    return numeric.toLocaleString("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: options.maximumFractionDigits ?? (Math.abs(numeric) < 100 ? 2 : 0),
    });
  } catch {
    return `${code} ${numeric.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
}

export function currenciesNeedingFx(results = []) {
  return [...new Set(
    results
      .filter((r) => r.taxesOriginal != null || r.taxes != null)
      .map((r) => normalizeCurrencyCode(r.taxesCurrency))
      .filter((code) => code && code !== BASE_CURRENCY)
  )].sort();
}
