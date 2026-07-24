# PointsBoard v11.2 — Currency and Recommendation Detail Upgrade

## Release objective

Make taxes and fees currency-safe throughout the entire application while adding the operating, availability, schedule, filtering, and comparison detail requested for practical redemption decisions.

## Design decision

Currency conversion is performed once in the normalized result model and reused by both the recommendation panel and original search-results panel. This prevents the two sections from displaying or calculating different USD values for the same award.

## Normalized award fields

```text
taxesOriginal
taxesCurrency
taxesCurrencySource
taxesUsd
fxRateToUsd
fxRateAsOf
fxStatus
cash
cashCurrency
cashMatchType
availabilityUpdatedAt
checkedAt
carriers
seats
connections
layovers
```

## Foreign-currency behavior

- Source amount and ISO currency remain visible.
- If the provider supplies no tax amount, the app preserves an unknown value and does not assume $0.
- Manual rate is entered as `1 foreign currency unit = X USD`.
- Missing or invalid rates block USD taxes, realized CPP, economic cost, savings, and complete cost ranking.
- The UI never changes the stored original amount.
- A source that omits a tax currency retains backward-compatible USD treatment but is visibly labeled as a legacy USD assumption.

## Recommendation presentation

Each featured card can show:

- Loyalty program.
- Operating airline(s).
- Route, times, total duration, stops, connection airports, and layovers.
- Award seats.
- Points plus original-currency fees.
- USD-converted fees when applicable.
- Cash fare and fare provenance.
- Economic redemption cost.
- Estimated economic savings.
- Realized CPP.
- Confidence.
- Availability source-update and app-check timestamps.

Up to five additional qualifying options are provided without duplicating featured winners.

## Filtering

The original search-result filters include:

- Cabin.
- Total travel-time range.
- Maximum stops.
- Layover range.
- Departure and arrival ranges, including overnight windows.
- Connection airport: include any.
- Connection airport: exclude any.
- Passenger seat requirement.

## Cash matching

The cash list already retrieved for a route/date/cabin is reused. The engine first seeks an exact flight-number sequence, then a close schedule/carrier match, then a same-operating-airline benchmark, then a route/cabin benchmark. It does not make an extra cash request for each award row.

## Known limitations

- Provider-supplied seat counts may be exact, minimum, zero-as-unknown, or unavailable; the app normalizes known unreliable zero-count programs to unknown rather than reporting zero seats.
- Provider tax-currency fields can vary. Missing currency is explicitly disclosed rather than silently described as provider-confirmed USD.
- Manual FX values are user inputs and are not automatically refreshed.
- An airline benchmark is not the same as an exact itinerary fare.
- A local production build was not completed in this environment; staging must run the deployment gate in the main README.
