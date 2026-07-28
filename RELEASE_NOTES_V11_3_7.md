# PointsBoard v11.3.7 Release Notes

## Corrective purpose

v11.3.7 restores the v11.3.5 application as the visual and functional baseline and applies only the user-requested changes. It does not redesign the interface.

## Changes

- Moved the existing **Add a Route** form above **Saved Routes** without changing its fields, controls, styling, or behavior.
- Live reward searches now return the already-requested cash-fare lists together with award results.
- The existing **Cash Fares** tab automatically receives those live results for the first selected route; no duplicate cash-fare API run is required.
- Retained the separate **Get cash fares**, **Clear fares**, saved-search, cabin, and cash-filter controls.
- Replaced the bookmark favicon with one red airplane and removed the airplane emoji from the HTML title to prevent a double icon.
- Replaced the inaccurate simplified static preview with a redirect to the actual app.

## Explicitly unchanged

- Header, tabs, colors, typography, spacing, recommendation cards, original result cards, filters, FX panel, settings, day/night mode, route controls, nearby-airport logic, exact-same-flight view, redemption links, calculations, and Cloudflare configuration.
