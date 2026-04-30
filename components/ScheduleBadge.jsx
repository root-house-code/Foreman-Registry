import { getScheduleColor } from "../lib/scheduleColor.js";

export default function ScheduleBadge({ schedule }) {
  const color = getScheduleColor(schedule);
  return (
    <span style={{
      background: `${color}18`,
      border: `1px solid ${color}40`,
      borderRadius: "3px",
      color,
      display: "inline-block",
      fontFamily: "monospace",
      fontSize: "0.72rem",
      padding: "0.2rem 0.55rem",
    }}>
      {schedule}
    </span>
  );
}
