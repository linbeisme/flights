# PointsBoard v11.3.2 Release Notes

## Purpose

This release improves recommendation readability and transparency while retaining the complete v11.3.1 workflow, filters, Exact Same Flight view, Cash Fares tab, nearby-airport expansion, booking handoff, strict Demo/Live separation, and multi-currency calculations.

## User-interface updates

- Added a light-green summary block to every featured recommendation for:
  - Economic redemption cost
  - Estimated economic savings
  - Realized CPP
  - Recommendation confidence
- Added a flight icon to each featured and alternative recommendation.
- Selecting the flight icon opens flight details when supplied by the source:
  - Flight number sequence
  - Origin and destination
  - Departure date and time
  - Arrival time and next-day indicator
  - Operating airline
  - Award-seat count or an honest count-unavailable message
  - Availability check time
- Made the FX conversion section collapsible.
- Kept the shared FX control mounted above all three tabs:
  - Recommendations + Results
  - Exact Same Flight
  - Cash Fares
- Added an explicit **Other qualifying redemptions or not recommended flights** section.
  - Qualified alternatives passed the recommendation settings but did not win a featured category.
  - Not-recommended rows failed one or more recommendation preferences and display the reason.

## Recommendation logic

- Added explainable exclusion reasons for:
  - Missing foreign-currency FX rate
  - Missing taxes and fees
  - Too many stops
  - Excessive total travel time
  - Departure or arrival outside the selected windows
  - Excluded connection airports
  - Missing required connection airports
  - Layovers outside the preferred range
- Limited the not-recommended display to five rows per route/date/cabin group.
- Preserved the existing route/date/cabin isolation used by featured recommendations.

## Deployment alignment

- Worker name is `flights`, matching the existing GitHub repository and Cloudflare Worker.
- `/api/*` routes use Worker-first routing before the SPA fallback.
- The health endpoint reports version `11.3.2`.
- The GitHub workflow supports push, pull request, and manual `workflow_dispatch` runs.

## Verification

The source-level test suite passed all active groups, including:

- 36 core logic and filtering groups
- Function and Worker checks
- 16 live-shaped simulation groups
- Recommendation regression checks
- 12 currency/provenance groups
- v11.3 exact-flight, booking-link, and nearby-airport groups
- v11.3.1 UI-retention regression
- v11.3.2 recommendation-presentation and deployment checks
- Deployment-readiness checks
- JavaScript and JSX syntax parsing through TypeScript's parser

A fresh local Vite build could not be completed in the isolated build environment because its npm mirror returned an availability error. The included GitHub Actions workflow and connected Cloudflare Workers Build remain the clean-install production verification path.
