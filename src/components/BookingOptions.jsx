export default function BookingOptions({ searchUrl }) {
  return (
    <div className="mt-2 border-t border-line pt-2 text-right">
      <a
        href={searchUrl || "https://www.google.com/travel/flights?hl=en&curr=USD"}
        target="_blank"
        rel="noreferrer"
        className="inline-block rounded border border-line bg-card px-2.5 py-1 text-[11px] font-semibold text-ink hover:border-ink"
      >
        Open Google Flights
      </a>
    </div>
  );
}
