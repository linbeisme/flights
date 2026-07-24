import { useState } from "react";
import { buildRedemptionHandoff } from "../api/redemptionLinks.js";

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

export default function RedemptionActions({ row, pax = 1, compact = false }) {
  const [copied, setCopied] = useState(false);
  const handoff = buildRedemptionHandoff(row, pax);

  async function handleCopy() {
    try {
      await copyText(handoff.packet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "mt-1" : "mt-2"}`}>
      <a
        href={handoff.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`rounded border border-magenta font-data font-semibold text-magenta hover:bg-magenta hover:text-white ${compact ? "px-1.5 py-1 text-[10px]" : "px-2 py-1 text-xs"}`}
        title={handoff.note}
      >
        {handoff.prefilled ? "Open prefilled award search ↗" : "Open award booking ↗"}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className={`rounded border border-line bg-paper-deep font-data font-semibold text-ink-soft hover:border-magenta hover:text-magenta ${compact ? "px-1.5 py-1 text-[10px]" : "px-2 py-1 text-xs"}`}
        title="Copy route, date, passenger count, cabin, operating flights, points, and taxes for pasting into the airline site"
      >
        {copied ? "Copied ✓" : "Copy booking details"}
      </button>
      <span className="text-[9px] text-ink-soft">
        {handoff.prefilled ? "Best-effort official prefill" : "Official page + prefilled details"}
      </span>
    </div>
  );
}
