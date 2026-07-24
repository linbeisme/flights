# PointsBoard v11.2 — Data Source Notes

## Seats.aero Partner API

Official references:

- Concepts and source capabilities: https://developers.seats.aero/reference/concepts-copy
- Get Trips: https://developers.seats.aero/reference/get-trips

Important implementation consequences:

- Get Trips is used for flight-level itinerary detail after a summary availability result.
- The trip object can include `TotalTaxes`, `TaxesCurrency`, `RemainingSeats`, flight numbers, carriers, segments, duration, and timestamps.
- `TaxesCurrency` can be blank even when a tax amount is present. PointsBoard therefore discloses a backward-compatible USD assumption rather than describing it as provider-confirmed currency.
- Some programs do not supply taxes/surcharges or dependable seat counts. Missing taxes remain unknown and suppress CPP/economic-cost calculations. Known unreliable zero-seat values are normalized to unknown for supported programs where zero can mean “not supplied.”
- Availability and trip-detail coverage differs by mileage program.

## SerpApi Google Flights

Official references:

- Google Flights API release notes: https://serpapi.com/google-flights-api/release-notes

PointsBoard requests cash fares in USD and normalizes returned flight segments, prices, flight numbers, carriers, schedules, duration, stops, connections, and layovers when supplied.

The award-to-cash comparison hierarchy is:

1. Exact flight-number sequence.
2. Probable schedule, connection, duration, and operating-carrier match.
3. Same-operating-airline benchmark.
4. Route/date/cabin benchmark.
5. Explicit estimate.

A benchmark is not represented as an exact itinerary price.
