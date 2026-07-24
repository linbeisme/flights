const DEFAULT_METHODS = "GET, OPTIONS";

function allowedOrigins(request, env = {}) {
  const selfOrigin = new URL(request.url).origin;
  const extras = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([selfOrigin, ...extras]);
}

export function corsHeaders(request, env = {}, methods = DEFAULT_METHODS) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
  if (origin && allowedOrigins(request, env).has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export function isOriginAllowed(request, env = {}) {
  const origin = request.headers.get("Origin");
  return !origin || allowedOrigins(request, env).has(origin);
}

export function jsonResponse(obj, status, request, env = {}, methods = DEFAULT_METHODS) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(request, env, methods),
    },
  });
}

export function preflightResponse(request, env = {}, methods = DEFAULT_METHODS) {
  if (!isOriginAllowed(request, env)) {
    return jsonResponse({ error: "Origin not allowed" }, 403, request, env, methods);
  }
  return new Response(null, { status: 204, headers: corsHeaders(request, env, methods) });
}

export function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
