export const BASE_CURRENCY = "USD";

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

  // The existing Seats.aero integration historically treated TotalTaxes as
  // USD-denominated cents. Keep backward compatibility, but mark the assumption
  // so the UI does not present it as an explicitly supplied currency.
  return { code: BASE_CURRENCY, source: "legacy-usd-assumption" };
}

export function normalizeFxEntry(value) {
  if (value == null) return null;
  const entry = typeof value === "object" ? value : { rate: value };
  const rate = Number(entry.rate);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return {
    rate,
    asOf: entry.asOf || "",
    source: entry.source || "manual",
  };
}

export function convertToUsd(amount, currency, fxRates = {}) {
  const numeric = Number(amount);
  const code = normalizeCurrencyCode(currency);
  if (!Number.isFinite(numeric) || !code) {
    return { usd: null, rate: null, status: "invalid", currency: code };
  }
  if (code === BASE_CURRENCY) {
    return { usd: numeric, rate: 1, status: "native-usd", currency: code };
  }
  const entry = normalizeFxEntry(fxRates[code]);
  if (!entry) {
    return { usd: null, rate: null, status: "missing-rate", currency: code };
  }
  return {
    usd: numeric * entry.rate,
    rate: entry.rate,
    asOf: entry.asOf,
    source: entry.source,
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
