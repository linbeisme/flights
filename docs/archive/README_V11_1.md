# PointsBoard v11.1 — Reliability Remediation

This release implements the independent audit recommendations from v11 and preserves the existing live-search and demo-search workflows.

## What changed

### Cash-fare provenance

Award results now classify the cash comparison as one of:

- `exact-itinerary`: same normalized flight-number sequence.
- `schedule-match`: probable same itinerary based on schedule, stops, connections, and duration.
- `route-cabin-benchmark`: live median fare for route/date/cabin, not necessarily the same flight.
- `estimated-route-cabin`: deterministic fallback estimate.
- `demo-illustrative`: pre-built Demo-mode fare.

High recommendation confidence is allowed only for exact live itinerary matches. Live schedule matches and live route/cabin benchmarks are Medium confidence. Estimates are Low confidence.

### One canonical CPP source

`public/cpp-library.json` is now the only CPP valuation source. Supported airline rows contain stable `programId` values. The browser loads the JSON at runtime; the recommendation engine no longer contains a duplicate hardcoded CPP table.

### Strict Live/Demo separation

- Demo searches make no live award or cash-fare calls.
- Live searches reject any returned row tagged as demo.
- Demo-tagged history entries are removed during history loading.
- Recent-search history is available only in Live mode.
- Switching modes clears current results.

### Recommendation validation

The recommendation engine blocks ranking when preferences are invalid, including:

- Minimum layover greater than maximum layover.
- Negative or nonfinite layover limits.
- Nonpositive maximum duration.
- Invalid time-window values.
- The same airport listed as both preferred and avoided.

### Overnight windows

Departure and arrival windows can cross midnight. For example, `22` to `6` accepts departures from 10:00 PM through 6:00 AM. This applies to both the recommendation settings and the main results filters.

### Route isolation

Recommendations are computed independently for each route, date, and cabin. A low-cost short-haul award cannot alter the normalization or winner for a long-haul route.

## Demo routes

- LAX–LHR
- LAX–CDG
- LAX–FCO
- TPE–NRT
- TPE–ICN
- TPE–BKK
- TPE–SIN

## Interactive preview

Open `interactive-preview.html` directly in a browser. It is a self-contained preview of the revised recommendation interface and does not require API credentials.

The preview demonstrates:

- Demo/Live mode separation.
- Route and preset switching.
- Overnight time windows.
- Invalid layover validation.
- Cash-fare provenance and confidence labels.

## Audit commands

```bash
npm test
npm run build
```

`npm test` runs the four audit suites. A clean `npm run build` should be performed in the deployment environment after `npm ci`.

## Deployment

Cloudflare remains the recommended production host:

- Vite/React frontend.
- Cloudflare Worker or Pages Functions for protected API keys.
- `SEATS_AERO_API_KEY` and `SERPAPI_KEY` stored as Cloudflare secrets.
- `cpp-library.json` deployed with static assets.

GitHub should remain the source repository. GitHub Pages may host the frontend only when a separate Cloudflare API proxy is configured.
