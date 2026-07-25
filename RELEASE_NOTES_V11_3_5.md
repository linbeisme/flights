# PointsBoard v11.3.5 Release Notes

## User-interface updates

- Displays `v11.3.5` beside the PointsBoard heading.
- Information and flight-detail popovers close when the user clicks anywhere outside the open popover.
- **Hide Filter / Show Filter** and **Hide FX conversion / Show FX conversion** use a light-blue background.
- Reward-program filter buttons display the full loyalty-program name on hover and keyboard focus.
- Saved Routes have a **Hide routes / Show routes** control. Saved routes remain visible by default.

## FX behavior

- The FX panel is collapsed by default.
- When award results introduce a non-USD taxes/fees currency, the FX panel opens automatically for manual rate entry.
- After the user manually hides the panel, ordinary re-renders do not force it open again unless a newly detected currency is introduced.

## Cash-fare date flexibility

Cash Fare searches now support:

- Exact date
- ±1 day
- ±3 days
- ±7 days

The interface shows the resulting number of live lookups before the search. One lookup is used for each selected cabin/date combination. Flexible-date results retain their searched date on every cash-fare row and in saved-search history.

## Retained behavior

- Multi-cabin cash-fare results remain stored until **Clear fares** is clicked.
- Cabin deselection hides stored rows without deleting them.
- Exact Same Flight, Recommendations, Other Qualified Flights, nearby airports, multi-currency calculations, and strict Demo/Live separation remain intact.
