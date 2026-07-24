// Cloudflare API proxy for seats.aero. The API key remains server-side.
import {
  isOriginAllowed,
  isValidIsoDate,
  jsonResponse,
  preflightResponse,
} from "./_shared.js";

const IATA = /^[A-Za-z]{3}$/;
const ALLOWED_SOURCES = new Set([
  "alaska", "american", "delta", "united", "flyingblue",
  "virginatlantic", "aeroplan", "lifemiles", "turkish",
]);

export async function onRequest({ request, env, ctx }) {
  if (request.method === "OPTIONS") return preflightResponse(request, env);
  if (!isOriginAllowed(request, env)) {
    return jsonResponse({ error: "Origin not allowed" }, 403, request, env);
  }
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, request, env);
  }

  const apiKey = env.SEATS_AERO_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      { error: "Server misconfigured: SEATS_AERO_API_KEY is not set in Cloudflare." },
      500,
      request,
      env
    );
  }

  const url = new URL(request.url);
  let upstream;
  const tripsId = url.searchParams.get("trips");

  if (tripsId) {
    if (!/^[\w-]{1,64}$/.test(tripsId)) {
      return jsonResponse({ error: "Invalid trips id" }, 400, request, env);
    }
    upstream = `https://seats.aero/partnerapi/trips/${encodeURIComponent(tripsId)}`;
  } else {
    const origin = (url.searchParams.get("origin_airport") || "").toUpperCase();
    const destination = (url.searchParams.get("destination_airport") || "").toUpperCase();
    const startDate = url.searchParams.get("start_date") || "";
    const endDate = url.searchParams.get("end_date") || startDate;
    const takeInput = Number(url.searchParams.get("take") || 500);

    if (!IATA.test(origin) || !IATA.test(destination) || origin === destination) {
      return jsonResponse(
        { error: "origin_airport and destination_airport must be different 3-letter codes" },
        400,
        request,
        env
      );
    }
    if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
      return jsonResponse(
        { error: "start_date and end_date must be valid YYYY-MM-DD dates" },
        400,
        request,
        env
      );
    }
    if (startDate > endDate) {
      return jsonResponse({ error: "start_date cannot be after end_date" }, 400, request, env);
    }
    if (!Number.isFinite(takeInput) || takeInput <= 0) {
      return jsonResponse({ error: "take must be a positive number" }, 400, request, env);
    }
    const take = Math.min(Math.floor(takeInput), 1000);

    const sources = (url.searchParams.get("sources") || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => ALLOWED_SOURCES.has(value));

    const query = new URLSearchParams({
      origin_airport: origin,
      destination_airport: destination,
      start_date: startDate,
      end_date: endDate,
      take: String(take),
      include_trips: "false",
    });
    if (sources.length) query.set("sources", sources.join(","));
    upstream = `https://seats.aero/partnerapi/search?${query.toString()}`;
  }

  try {
    const response = await fetch(upstream, {
      headers: {
        "Partner-Authorization": apiKey,
        "Accept": "application/json",
      },
      cf: { cacheTtl: 300, cacheEverything: true },
    });

    if (response.status === 429) {
      return jsonResponse(
        { error: "seats.aero rate limit hit - wait a minute and retry." },
        429,
        request,
        env
      );
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return jsonResponse(
        { error: `seats.aero returned ${response.status}`, detail: body.slice(0, 300) },
        502,
        request,
        env
      );
    }

    return jsonResponse(await response.json(), 200, request, env);
  } catch (error) {
    return jsonResponse(
      { error: `Upstream request failed: ${error.message}` },
      502,
      request,
      env
    );
  }
}
