import { useState } from "react";
import { fetchBookingOptions, openBookingRequest } from "../api/bookingOptions.js";
import { BASE_CURRENCY, formatMoney } from "../api/currency.js";

export default function BookingOptions({ proxyBase = "", bookingToken, searchUrl }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setOpen(true);
    if (!bookingToken || loading || options.length) return;
    setLoading(true);
    setError("");
    try {
      const rows = await fetchBookingOptions({ proxyBase, bookingToken });
      setOptions(rows);
      if (!rows.length) setError("No exact seller links were returned for this itinerary.");
    } catch (err) {
      setError(err.message || "Booking options could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 border-t border-line pt-2 text-left">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {bookingToken && (
          <button
            type="button"
            onClick={load}
            className="rounded border border-magenta bg-magenta/5 px-2.5 py-1 text-[11px] font-semibold text-magenta hover:bg-magenta/10"
            aria-expanded={open}
          >
            {loading ? "Loading booking options…" : open ? "Booking options" : "View booking options"}
          </button>
        )}
        <a
          href={searchUrl || "https://www.google.com/travel/flights?hl=en&curr=USD"}
          target="_blank"
          rel="noreferrer"
          className="rounded border border-line bg-card px-2.5 py-1 text-[11px] font-semibold text-ink hover:border-ink"
        >
          Open Google Flights
        </a>
      </div>

      {open && (
        <div className="mt-2 rounded border border-line bg-paper-deep p-2">
          {loading && <p className="text-[11px] text-ink-soft">Retrieving seller choices only for this selected itinerary…</p>}
          {error && <p className="text-[11px] text-warn">{error}</p>}
          {options.length > 0 && (
            <div className="space-y-1.5">
              {options.map((option) => (
                <div key={option.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-card px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="font-data text-xs font-bold text-ink">{option.bookWith || "Booking seller"}</p>
                    <p className="text-[10px] text-ink-soft">{option.scopeLabel}{option.optionTitle ? ` · ${option.optionTitle}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-data text-xs font-bold text-deal">
                      {Number.isFinite(option.price) ? formatMoney(option.price, option.currency || BASE_CURRENCY) : "Price rechecked at seller"}
                    </span>
                    <button
                      type="button"
                      onClick={() => openBookingRequest(option.bookingRequest)}
                      disabled={!option.bookingRequest?.url}
                      className="rounded bg-ink px-2.5 py-1 text-[11px] font-semibold text-paper disabled:opacity-40"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ))}
              <p className="text-[9px] text-ink-soft">Seller availability and final price are confirmed on the external booking page.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
