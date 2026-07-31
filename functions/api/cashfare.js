// Cloudflare API adapter for live cash fares from SerpApi Google Flights.
// One-way behavior remains unchanged. Round-trip mode uses type=1 plus
// departure_token follow-ups so each returned row contains both directions.
import {
  isOriginAllowed,
  isValidIsoDate,
  jsonResponse,
  preflightResponse,
} from "./_shared.js";

const SERP_CLASS = { economy: 1, premium: 2, business: 3, first: 4 };
const VALID_CABINS = new Set(Object.keys(SERP_CLASS));
const ROUND_TRIP_OUTBOUND_CAP = 4;

function normalizeFlightNumber(value) {
  const compact = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z0-9]{2}\d+$/.test(compact) ? compact : null;
}

function hhmm(value) {
  const match = /(\d{2}:\d{2})/.exec(value || "");
  return match ? match[1] : null;
}

function toMinute(value) {
  const time = hhmm(value);
  return time ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) : null;
}

function normalizeLeg(flight) {
  const segments = flight?.flights || [];
  const carriers = [...new Set(segments.map((segment) => segment.airline).filter(Boolean))];
  const operatingCarriers = [...new Set(
    segments
      .map((segment) => segment.operating_airline || segment.operated_by || null)
      .filter(Boolean)
      .filter((name) => !carriers.includes(name))
  )];
  const flightNumbers = segments.map((segment) => normalizeFlightNumber(segment.flight_number)).filter(Boolean);
  const carrierCodes = [...new Set(flightNumbers.map((number) => number.slice(0, 2)))];
  const layovers = (flight?.layovers || []).map((layover) => layover.duration).filter(Number.isFinite);
  const connections = (flight?.layovers || []).map((layover) => layover.id).filter(Boolean);
  return {
    departTime: hhmm(segments[0]?.departure_airport?.time),
    arriveTime: hhmm(segments[segments.length - 1]?.arrival_airport?.time),
    departMin: toMinute(segments[0]?.departure_airport?.time),
    arriveMin: toMinute(segments[segments.length - 1]?.arrival_airport?.time),
    totalMinutes: flight?.total_duration ?? null,
    stops: Math.max(0, segments.length - 1),
    carriers,
    operatingCarriers,
    carrierCodes,
    flightNumbers,
    connections,
    layovers,
  };
}

function rawFlights(data) {
  return [...(data?.best_flights || []), ...(data?.other_flights || [])];
}

function normalizeSerpFlights(data) {
  return rawFlights(data)
    .filter((flight) => typeof flight.price === "number")
    .slice(0, 25)
    .map((flight, index) => ({
      id: `cash-${index}-${flight.price}`,
      price: flight.price,
      currency: "USD",
      ...normalizeLeg(flight),
    }));
}

async function fetchSerpApiRaw(key, params) {
  const query = new URLSearchParams({
    engine: "google_flights",
    currency: "USD",
    hl: "en",
    ...params,
    api_key: key,
  });
  const response = await fetch(`https://serpapi.com/search.json?${query}`);
  if (!response.ok) throw new Error(`SerpApi ${response.status}`);
  const data = await response.json();
  if (data?.error) throw new Error(data.error);
  return data;
}

async function fetchOneWay(key, origin, destination, date, cabin, adults) {
  return fetchSerpApiRaw(key, {
    departure_id: origin,
    arrival_id: destination,
    outbound_date: date,
    type: "2",
    travel_class: String(SERP_CLASS[cabin]),
    adults: String(adults),
  });
}

async function fetchRoundTrip(key, origin, destination, outboundDate, returnDate, cabin, adults) {
  const common = {
    departure_id: origin,
    arrival_id: destination,
    outbound_date: outboundDate,
    return_date: returnDate,
    type: "1",
    travel_class: String(SERP_CLASS[cabin]),
    adults: String(adults),
  };
  const initial = await fetchSerpApiRaw(key, common);
  const outboundChoices = [];
  const seenTokens = new Set();
  for (const choice of rawFlights(initial)) {
    if (!choice?.departure_token || seenTokens.has(choice.departure_token)) continue;
    seenTokens.add(choice.departure_token);
    outboundChoices.push(choice);
    if (outboundChoices.length >= ROUND_TRIP_OUTBOUND_CAP) break;
  }

  const followUps = await Promise.all(outboundChoices.map(async (outboundChoice) => {
    try {
      const data = await fetchSerpApiRaw(key, { ...common, departure_token: outboundChoice.departure_token });
      return { outboundChoice, data };
    } catch {
      return null;
    }
  }));

  const combinations = [];
  for (const item of followUps.filter(Boolean)) {
    const outbound = normalizeLeg(item.outboundChoice);
    for (const [returnIndex, returnChoice] of rawFlights(item.data).slice(0, 12).entries()) {
      const price = Number.isFinite(returnChoice?.price)
        ? returnChoice.price
        : Number.isFinite(item.outboundChoice?.price)
          ? item.outboundChoice.price
          : null;
      if (!Number.isFinite(price)) continue;
      const returning = normalizeLeg(returnChoice);
      combinations.push({
        id: `cash-rt-${combinations.length}-${price}-${returnIndex}`,
        price,
        currency: "USD",
        tripType: "roundtrip",
        outbound,
        return: returning,
        outboundFlightNumbers: outbound.flightNumbers,
        returnFlightNumbers: returning.flightNumbers,
        carriers: [...new Set([...outbound.carriers, ...returning.carriers])],
        operatingCarriers: [...new Set([...(outbound.operatingCarriers || []), ...(returning.operatingCarriers || [])])],
        carrierCodes: [...new Set([...outbound.carrierCodes, ...returning.carrierCodes])],
        flightNumbers: [...outbound.flightNumbers, ...returning.flightNumbers],
        departTime: outbound.departTime,
        arriveTime: outbound.arriveTime,
        returnDepartTime: returning.departTime,
        returnArriveTime: returning.arriveTime,
        totalMinutes: Number.isFinite(outbound.totalMinutes) && Number.isFinite(returning.totalMinutes)
          ? outbound.totalMinutes + returning.totalMinutes
          : null,
        stops: Number.isFinite(outbound.stops) && Number.isFinite(returning.stops)
          ? outbound.stops + returning.stops
          : null,
        connections: [...outbound.connections, ...returning.connections],
        layovers: [...outbound.layovers, ...returning.layovers],
      });
    }
  }

  return {
    flights: combinations.sort((left, right) => left.price - right.price).slice(0, 20),
    providerRequests: 1 + outboundChoices.length,
  };
}

export function medianPrice(prices) {
  const sorted = [...prices].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function unavailablePayload(list, reason, tripType = "oneway") {
  return list
    ? {
        source: "unavailable",
        currency: "USD",
        benchmarkPrice: null,
        benchmarkMethod: null,
        scope: tripType === "roundtrip" ? "round-trip-route-date-pair-cabin" : "route-date-cabin",
        tripType,
        flights: [],
        reason,
      }
    : { price: null, currency: "USD", source: "unavailable", tripType, reason };
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
  const returnDate = url.searchParams.get("returnDate") || "";
  const cabin = (url.searchParams.get("cabin") || "economy").toLowerCase();
  const tripType = url.searchParams.get("tripType") === "roundtrip" ? "roundtrip" : "oneway";
  const adults = Math.max(1, Math.min(9, Number(url.searchParams.get("adults")) || 1));
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
  if (tripType === "roundtrip") {
    if (!isValidIsoDate(returnDate)) {
      return jsonResponse({ error: "returnDate must be a valid YYYY-MM-DD date for round trips" }, 400, request, env);
    }
    if (Date.parse(`${returnDate}T00:00:00Z`) <= Date.parse(`${date}T00:00:00Z`)) {
      return jsonResponse({ error: "returnDate must be after the departure date" }, 400, request, env);
    }
  }
  if (!VALID_CABINS.has(cabin)) {
    return jsonResponse({ error: "Unsupported cabin" }, 400, request, env);
  }
  if (!env.SERPAPI_KEY) {
    return jsonResponse(
      unavailablePayload(wantList, "SERPAPI_KEY is not configured", tripType),
      200,
      request,
      env
    );
  }

  try {
    let flights;
    let providerRequests = 1;
    if (tripType === "roundtrip") {
      const result = await fetchRoundTrip(env.SERPAPI_KEY, origin, destination, date, returnDate, cabin, adults);
      flights = result.flights;
      providerRequests = result.providerRequests;
    } else {
      const data = await fetchOneWay(env.SERPAPI_KEY, origin, destination, date, cabin, adults);
      flights = normalizeSerpFlights(data);
    }

    if (!flights.length) {
      return jsonResponse(
        unavailablePayload(wantList, "No priced live flights were returned", tripType),
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
        scope: tripType === "roundtrip" ? "round-trip-route-date-pair-cabin" : "route-date-cabin",
        tripType,
        providerRequests,
        flights,
      }, 200, request, env);
    }

    return jsonResponse(
      { price: benchmarkPrice, currency: "USD", source: "serpapi", tripType, providerRequests },
      200,
      request,
      env
    );
  } catch (error) {
    return jsonResponse(
      unavailablePayload(wantList, `Live fare lookup failed: ${error.message}`, tripType),
      200,
      request,
      env
    );
  }
}
