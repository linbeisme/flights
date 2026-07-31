import { isOriginAllowed, jsonResponse, preflightResponse } from "./_shared.js";

function normalizeBookingOptions(data) {
  const output = [];
  const scopes = [
    ["together", "Complete itinerary"],
    ["departing", "Outbound"],
    ["returning", "Return"],
  ];

  for (const [groupIndex, group] of (data?.booking_options || []).entries()) {
    for (const [scope, scopeLabel] of scopes) {
      const value = group?.[scope];
      if (!value || typeof value !== "object") continue;
      const request = value.booking_request || {};
      output.push({
        id: `${scope}-${groupIndex}-${value.book_with || "seller"}`,
        scope,
        scopeLabel,
        bookWith: value.book_with || null,
        airline: Boolean(value.airline),
        price: Number.isFinite(value.price) ? value.price : null,
        currency: "USD",
        optionTitle: value.option_title || null,
        extensions: Array.isArray(value.extensions) ? value.extensions.slice(0, 8) : [],
        baggagePrices: Array.isArray(value.baggage_prices) ? value.baggage_prices.slice(0, 6) : [],
        bookingRequest: request.url ? {
          url: request.url,
          postData: typeof request.post_data === "string" ? request.post_data : null,
        } : null,
      });
    }
  }

  return output.filter((option) => option.bookingRequest?.url).slice(0, 20);
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return preflightResponse(request, env);
  if (!isOriginAllowed(request, env)) return jsonResponse({ error: "Origin not allowed" }, 403, request, env);
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405, request, env);

  const url = new URL(request.url);
  const bookingToken = url.searchParams.get("bookingToken") || "";
  if (!/^[A-Za-z0-9_-]{10,12000}$/.test(bookingToken)) {
    return jsonResponse({ error: "Invalid booking token" }, 400, request, env);
  }
  if (!env.SERPAPI_KEY) {
    return jsonResponse({ source: "unavailable", bookingOptions: [], reason: "SERPAPI_KEY is not configured" }, 200, request, env);
  }

  try {
    const params = new URLSearchParams({
      engine: "google_flights",
      booking_token: bookingToken,
      currency: "USD",
      hl: "en",
      api_key: env.SERPAPI_KEY,
    });
    const response = await fetch(`https://serpapi.com/search.json?${params}`);
    if (!response.ok) throw new Error(`SerpApi ${response.status}`);
    const data = await response.json();
    if (data?.error) throw new Error(data.error);
    return jsonResponse({ source: "serpapi", bookingOptions: normalizeBookingOptions(data) }, 200, request, env);
  } catch (error) {
    return jsonResponse({ source: "unavailable", bookingOptions: [], reason: `Booking option lookup failed: ${error.message}` }, 200, request, env);
  }
}
