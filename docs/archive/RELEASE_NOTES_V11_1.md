# PointsBoard v11.1 Release Notes

## Release purpose

This release implements the independent reliability and accuracy audit findings for the combined award-flight search and redemption recommendation application.

## Reliability corrections

- Added exact, schedule, benchmark, estimate, and demo cash-fare provenance.
- Restricted High confidence to exact live itinerary matches.
- Replaced duplicate CPP tables with one canonical JSON library.
- Enforced Live/Demo separation in active results and recent-search history.
- Added overnight departure and arrival windows.
- Added blocking validation for contradictory recommendation preferences.
- Isolated scoring by route, date, and cabin.
- Added regression coverage for cash matching, route isolation, mode integrity, invalid settings, and overnight windows.

## Audit status

- 37 core logic test groups passed.
- 14 Cloudflare function and Worker checks passed.
- 16 live-shaped simulation groups passed.
- Recommendation and integrity assertions passed.
- JavaScript and JSX syntax parsing passed.
- Interactive preview smoke testing passed.

## Deployment condition

A clean dependency install and Vite production build must be completed in the deployment environment before production promotion.
