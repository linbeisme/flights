import { jsonResponse, preflightResponse } from "./_shared.js";

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return preflightResponse(request, env);
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, request, env);
  }

  return jsonResponse({
    ok: true,
    app: "PointsBoard",
    version: "11.3.4",
    liveAwardConfigured: Boolean(env.SEATS_AERO_API_KEY),
    liveCashConfigured: Boolean(env.SERPAPI_KEY),
    checkedAt: new Date().toISOString(),
  }, 200, request, env);
}
