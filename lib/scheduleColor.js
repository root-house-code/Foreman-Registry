export function getScheduleColor(schedule) {
  if (!schedule) return "#94a3b8";
  const s = schedule.toLowerCase();

  if (s.includes("every load") || s.includes("as needed")) return "#94a3b8";

  // Normalized output from SchedulePicker — N-aware coloring
  const daysMatch = s.match(/every\s+(\d+)\s*days?/);
  if (daysMatch) return "#4ade80";

  const weeksMatch = s.match(/every\s+(\d+)\s*weeks?/);
  if (weeksMatch) return "#4ade80";

  const monthsMatch = s.match(/every\s+(\d+)\s*months?/);
  if (monthsMatch) {
    const n = parseInt(monthsMatch[1]);
    if (n <= 2)  return "#4ade80"; // green  (1–2 months)
    if (n <= 5)  return "#34d399"; // teal   (3–5 months)
    if (n <= 11) return "#60a5fa"; // blue   (6–11 months)
    return "#f59e0b";              // amber  (12+ months ≈ annual)
  }

  const yearsMatch = s.match(/every\s+(\d+)\s*years?/);
  if (yearsMatch) {
    return parseInt(yearsMatch[1]) <= 1 ? "#f59e0b" : "#c084fc";
  }

  // Legacy string fallbacks (existing defaultData strings, never modified)
  if (s.includes("week")) return "#4ade80";
  if (s.includes("3–6 month") || s.includes("2–4")) return "#34d399";
  if (s.includes("6 month") || s.includes("twice")) return "#60a5fa";
  if (s.includes("month")) return "#4ade80";
  if (s.includes("annual") || s.includes("year (")) return "#f59e0b";
  if (
    s.includes("2–3") || s.includes("3–5") || s.includes("5–7") ||
    s.includes("5–10") || s.includes("10 year") || s.includes("1–2 year") ||
    s.includes("2 year") || s.includes("2–5")
  ) return "#c084fc";

  return "#94a3b8";
}
