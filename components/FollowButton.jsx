import { isComputable } from "../lib/scheduleInterval.js";

export default function FollowButton({ schedule, checked, onToggle }) {
  if (!isComputable(schedule)) return null;

  return (
    <button
      onClick={onToggle}
      title="Follow recommended schedule"
      style={{
        background: "transparent",
        border: `1px solid ${checked ? "#c9a96e" : "#a8a29c"}`,
        borderRadius: "3px",
        color: checked ? "#c9a96e" : "#a8a29c",
        cursor: "pointer",
        flexShrink: 0,
        fontSize: "0.9rem",
        lineHeight: 1,
        padding: "0.15rem 0.45rem",
        transition: "color 0.15s, border-color 0.15s",
      }}
    >
      ↻
    </button>
  );
}
