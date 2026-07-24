import { PROGRAMS } from "../data/defaults.js";

const cabinMap = {
  economy: "economy",
  premium: "premiumEconomy",
  business: "business",
  first: "first",
};

const encode = encodeURIComponent;

function officialProgram(programId) {
  return PROGRAMS.find((program) => program.id === programId) || null;
}

function bestEffortPrefilledUrl(row, pax) {
  const origin = encode(row.origin);
  const destination = encode(row.destination);
  const date = encode(row.date);
  const adults = Math.max(1, Math.min(9, Number(pax) || 1));
  switch (row.program) {
    case "american":
      return `https://www.aa.com/booking/find-flights?tripType=oneWay&origin=${origin}&destination=${destination}&departureDate=${date}&adultPassengerCount=${adults}&isAward=true`;
    case "united":
      return `https://www.united.com/en/us/fsr/choose-flights?f=${origin}&t=${destination}&d=${date}&tt=1&sc=7&px=${adults}&taxng=1`;
    case "aeroplan":
      return `https://www.aircanada.com/aeroplan/redeem/availability/outbound?org0=${origin}&dest0=${destination}&departureDate0=${date}&ADT=${adults}&YTH=0&CHD=0&INF=0&INS=0&marketCode=INT&lang=en-CA`;
    case "alaska":
      return `https://www.alaskaair.com/search/results?A=${adults}&O=${origin}&D=${destination}&OD=${date}&RT=false&ShoppingMethod=onlineaward`;
    default:
      return null;
  }
}

export function bookingPacket(row, pax = 1) {
  const flights = String(row.flightNumbers || "Not supplied").replace(/\s*\/\s*/g, " / ");
  const carriers = row.carriers?.length ? row.carriers.join(", ") : "Not supplied";
  return [
    `Reward program: ${row.programLabel}`,
    `Origin: ${row.origin}`,
    `Destination: ${row.destination}`,
    `Departure date: ${row.date}`,
    `Passengers: ${Math.max(1, Number(pax) || 1)}`,
    `Cabin: ${cabinMap[row.cabin] || row.cabin || "Not supplied"}`,
    `Flight number(s) supplied by source: ${flights}`,
    `Operating carrier code(s): ${carriers}`,
    `Points shown: ${Number(row.points || 0).toLocaleString("en-US")}`,
    `Taxes/fees shown: ${row.taxesOriginal == null ? "Not supplied" : `${row.taxesOriginal} ${row.taxesCurrency || "USD"}`}`,
    "Verify award availability before transferring points.",
  ].join("\n");
}

export function buildRedemptionHandoff(row, pax = 1) {
  const program = officialProgram(row.program);
  const prefilled = bestEffortPrefilledUrl(row, pax);
  return {
    url: prefilled || program?.redeemUrl || "#",
    officialUrl: program?.redeemUrl || "#",
    prefilled: Boolean(prefilled),
    label: prefilled ? "Open prefilled award search" : "Open official award booking",
    note: prefilled
      ? "Route, date, passenger count, and award mode are passed to the official site. The airline may still require login or re-entry if its website changes."
      : "This program does not expose a dependable public prefill URL. Open the official award page and use the prefilled booking details shown in PointsBoard.",
    packet: bookingPacket(row, pax),
  };
}
