# PointsBoard v11.2.1 - Deployment-Audited Release

Release date: 2026-07-24

## Reliability corrections

- Removed the active deterministic cash-fare fallback from Live mode.
- Live cash fares now remain `unavailable` when SerpApi is not configured, returns no priced flights, or fails.
- Live history rejects both Demo rows and legacy synthetic cash-fare rows.
- Tightened API CORS to same-origin plus optional `ALLOWED_ORIGINS`.
- Added real ISO-date validation, same-airport rejection, range validation, and request limits.
- Added `/api/health` without exposing secret values.
- Added security headers and long-lived hashed-asset caching.
- Added GitHub Actions verification: clean install, tests, production build, and Wrangler dry run.
- Added deployment-readiness tests and beginner GitHub/Cloudflare documentation.

## Deployment disposition

Source, calculation, API-routing, simulation, mode-integrity, currency, and deployment-configuration tests pass. A credentialed Cloudflare production deployment was not performed in the audit environment. A clean local build could not be executed because the sandbox package registry returned HTTP 503 and direct npm access returned DNS `EAI_AGAIN`. GitHub Actions and Cloudflare Workers Builds are configured to perform the clean install and build in the user's connected environment.
