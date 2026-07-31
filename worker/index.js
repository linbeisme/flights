// worker/index.js — entry point for the Cloudflare WORKER deployment
// path (the dashboard flow with a "Deploy command" of `npx wrangler
// deploy`).
//
// It reuses the exact same handlers as the Pages Functions in
// /functions/api/, so both deployment styles behave identically:
//   /api/search    → seats.aero proxy (key stays in the SEATS_AERO_API_KEY secret)
//   /api/cashfare  → live cash fares via SerpApi; unavailable when not configured
//   everything else → the built app in /dist (served as static assets)

import { onRequest as searchHandler } from "../functions/api/search.js";
import { onRequest as cashfareHandler } from "../functions/api/cashfare.js";
import { onRequest as healthHandler } from "../functions/api/health.js";
import { onRequest as bookingHandler } from "../functions/api/booking.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/search" || url.pathname === "/api/search/") {
      return searchHandler({ request, env, ctx });
    }
    if (url.pathname === "/api/cashfare" || url.pathname === "/api/cashfare/") {
      return cashfareHandler({ request, env, ctx });
    }
    if (url.pathname === "/api/health" || url.pathname === "/api/health/") {
      return healthHandler({ request, env, ctx });
    }
    if (url.pathname === "/api/booking" || url.pathname === "/api/booking/") {
      return bookingHandler({ request, env, ctx });
    }
    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Unknown API route" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Static app (index.html, JS, CSS) built by `npm run build`
    return env.ASSETS.fetch(request);
  },
};
