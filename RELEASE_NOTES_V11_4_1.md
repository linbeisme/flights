# PointsBoard v11.4.1 Release Notes

## Added and changed

1. **Single red airplane**
   - Replaced the text-based bookmark icon with a vector red-airplane silhouette.
   - In-app airplane indicators are now red.

2. **Round-trip cabin synchronization**
   - A selected round-trip route forces the reward Cabin filter to the route's selected cash cabin.
   - All other reward cabins are unchecked.
   - Changing the route's cash cabin immediately changes the reward Cabin filter.

3. **Default reward cabin**
   - Economy is selected by default.
   - Premium Economy, Business, and First remain opt-in for one-way searches.

4. **1,000-airport catalog**
   - Expanded the airport datalist from 411 to exactly 1,000 IATA-coded airports.
   - Manual three-letter code entry remains unrestricted.

5. **Round-trip economic presentation**
   - Savings vs. cash is displayed in a separate, larger inset box.
   - Negative savings are red and flash at medium pace.
   - Reduced-motion preferences disable flashing.

6. **Operating airlines and program colors**
   - Operating airline names appear below each outbound and return redemption program.
   - Split-program leg labels and point summaries match the program badge colors used in Filters.

7. **Automatic Cash Fares trip type**
   - A selected one-way route preselects One way.
   - A selected round-trip route preselects Round trip.
   - With no selected route, the initial default remains One way.

8. **Saved round-trip searches**
   - Saved recommendation searches restore the round-trip route and complete paired results.
   - Recommendation-generated round-trip cash results are saved in Cash Fares without a second provider call.
   - Manual Cash Fares round-trip searches continue to be saved.

9. **Distinct selected tabs**
   - Recommendations + Results: magenta treatment.
   - Exact Same Flight: amber treatment.
   - Cash Fares: green treatment.
   - Recommendations + Results remains the default tab.

## Compatibility

- All existing one-way search paths remain separate and operational.
- Existing saved routes without a `tripType` field continue to behave as one-way routes.
- No new Cloudflare secrets or bindings are required.
