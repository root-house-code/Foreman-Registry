export function getScheduleColor(schedule) {
  const s = schedule.toLowerCase();
  if (s.includes("every load") || s.includes("as needed")) return "#94a3b8";
  if (s.includes("week")) return "#22d3ee";
  if (s.includes("month")) return "#4ade80";
  if (s.includes("3–6 month") || s.includes("2–4")) return "#34d399";
  if (s.includes("6 month") || s.includes("twice")) return "#60a5fa";
  if (s.includes("annual") || s.includes("year (")) return "#f59e0b";
  if (
    s.includes("2–3") || s.includes("3–5") || s.includes("5–7") ||
    s.includes("5–10") || s.includes("10 year") || s.includes("1–2 year") ||
    s.includes("2 year") || s.includes("2–5")
  ) return "#c084fc";
  return "#94a3b8";
}
