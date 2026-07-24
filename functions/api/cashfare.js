// Cloudflare API adapter for live cash fares from SerpApi Google Flights.
// Live mode never returns a deterministic or synthetic fare fallback.
import {
  isOriginAllowed,
  isValidIsoDate,
  jsonResponse,
  preflightResponse,
} from "./_shared.js";

const SERP_CLASS = { economy: 1, premium: 2, business: 3, first: 4 };
const VALID_CABINS = new Set(Object.keys(SERP_CLASS));

function normalizeFlightNumber(value) {
  const compact = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z0-9]{2}\d+$/.test(compact) ? compact : null;
}

function normalizeSerpFlights(data) {
  const raw = [...(data.best_flights || []), ...(data.other_flights || [])];
  const hhmm = (value) => {
    const match = /(\d{2}:\d{2})/.exec(value || "");
    return match ? match[1] : null;
  };

  return raw
    .filter((flight) => typeof flight.price === "number")
    .slice(0, 25)
    .map((flight, index) => {
      const segments = flight.flights || [];
      const carriers = [...new Set(segments.map((segment) => segment.airline).filter(Boolean))];
      const flightNumbers = segments
        .map((segment) => normalizeFlightNumber(segment.flight_number))
        .filter(Boolean);
      const carrierCodes = [...new Set(flightNumbers.map((number) => number.slice(0, 2)))];
      return {
        id: `cash-${index}-${flight.price}`,
        price: flight.price,
        currency: "USD",
        departTime: hhmm(segments[0]?.departure_airport?.time),
        arriveTime: hhmm(segments[segments.length - 1]?.arrival_airport?.time),
        totalMinutes: flight.total_duration ?? null,
        stops: Math.max(0, segments.length - 1),
        carriers,
        carrierCodes,
        flightNumbers,
        connections: (flight.layovers || []).map((layover) => layover.id).filter(Boolean),
        layovers: (flight.layovers || [])
          .map((layover) => layover.duration)
          .filter((duration) => Number.isFinite(duration)),
      };
    });
}

async function fetchSerpApiRaw(key, origin, destination, date, cabin) {
  const query = new URLSearchParams({
    engine: "google_flights",
    departure_id: origin,
    arrival_id: destination,
    outbound_date: date,
    type: "2",
    travel_class: String(SERP_CLASS[cabin]),
    currency: "USD",
    hl: "en",
    api_key: key,
  });
  const response = await fetch(`https://serpapi.com/search.json?${query}`);
  if (!response.ok) throw new Error(`SerpApi ${response.status}`);
  return response.json();
}

export function medianPrice(prices) {
  const sorted = [...prices].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function unavailablePayload(list, reason) {
  return list
    ? {
        source: "unavailable",
        currency: "USD",
        benchmarkPrice: null,
        benchmarkMethod: null,
        scope: "route-date-cabin",
        flights: [],
        reason,
      }
    : { price: null, currency: "USD", source: "unavailable", reason };
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return preflightResponse(request, env);
  if (!isOriginAllowed(request, env)) {
    return jsonResponse({ error: "Origin not allowed" }, 403, request, env);
  }
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, request, env);
  }

  const url = new URL(request.url);
  const origin = (url.searchParams.get("origin") || "").toUpperCase();
  const destination = (url.searchParams.get("destination") || "").toUpperCase();
  const date = url.searchParams.get("date") || "";
  const cabin = (url.searchParams.get("cabin") || "economy").toLowerCase();
  const wantList = url.searchParams.get("list") === "1";

  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination) || origin === destination) {
    return jsonResponse(
      { error: "Origin and destination must be different 3-letter airport codes" },
      400,
      request,
      env
    );
  }
  if (!isValidIsoDate(date)) {
    return jsonResponse({ error: "date must be a valid YYYY-MM-DD date" }, 400, request, env);
  }
  if (!VALID_CABINS.has(cabin)) {
    return jsonResponse({ error: "Unsupported cabin" }, 400, request, env);
  }
  if (!env.SERPAPI_KEY) {
    return jsonResponse(
      unavailablePayload(wantList, "SERPAPI_KEY is not configured"),
      200,
      request,
      env
    );
  }

  try {
    const data = await fetchSerpApiRaw(env.SERPAPI_KEY, origin, destination, date, cabin);
    const flights = normalizeSerpFlights(data);
    if (!flights.length) {
      return jsonResponse(
        unavailablePayload(wantList, "No priced live flights were returned"),
        200,
        request,
        env
      );
    }

    const benchmarkPrice = medianPrice(flights.map((flight) => flight.price));
    if (wantList) {
      return jsonResponse({
        source: "serpapi",
        currency: "USD",
        benchmarkPrice,
        benchmarkMethod: "median",
        scope: "route-date-cabin",
        flights,
      }, 200, request, env);
    }

    return jsonResponse(
      { price: benchmarkPrice, currency: "USD", source: "serpapi" },
      200,
      request,
      env
    );
  } catch (error) {
    return jsonResponse(
      unavailablePayload(wantList, `Live fare lookup failed: ${error.message}`),
      200,
      request,
      env
    );
  }
}
