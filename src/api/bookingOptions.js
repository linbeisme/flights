function baseUrl(proxyBase = "") {
  return String(proxyBase || "").replace(/\/$/, "");
}

export async function fetchBookingOptions({ proxyBase = "", bookingToken }) {
  if (!bookingToken) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const params = new URLSearchParams({ bookingToken });
    const response = await fetch(`${baseUrl(proxyBase)}/api/booking?${params}`, { signal: controller.signal });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Booking options HTTP ${response.status}${body ? `: ${body.slice(0, 160)}` : ""}`);
    }
    const data = await response.json();
    return Array.isArray(data.bookingOptions) ? data.bookingOptions : [];
  } finally {
    clearTimeout(timer);
  }
}

export function openBookingRequest(request) {
  if (!request?.url) return false;
  if (!request.postData) {
    window.open(request.url, "_blank", "noopener,noreferrer");
    return true;
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = request.url;
  form.target = "_blank";
  form.rel = "noopener noreferrer";
  const params = new URLSearchParams(request.postData);
  for (const [name, value] of params.entries()) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  form.remove();
  return true;
}
