import { REMINDER_MODES } from "../lib/reminders.js";
import { isComputable } from "../lib/scheduleInterval.js";

// Cycle order: off → digest → dayof → both → off.
// Glyph stays the same (bell) so the affordance is always recognizable; the
// state is communicated through a tiny text mode-tag plus filled vs outlined
// styling. That avoids relying on color alone (color-blind friendly) and gives
// screen readers a real label via aria-label.
const MODE_DETAILS = {
  off:    { tag: "OFF",    aria: "Reminders off. Click to enable digest reminders.",          filled: false },
  digest: { tag: "DIGEST", aria: "Digest reminders on. Click to switch to day-of reminders.", filled: true  },
  dayof:  { tag: "DAY-OF", aria: "Day-of reminders on. Click to enable both digest and day-of.", filled: true  },
  both:   { tag: "BOTH",   aria: "Digest and day-of reminders on. Click to turn off.",        filled: true  },
};

export default function ReminderButton({ schedule, mode, onCycle }) {
  if (!isComputable(schedule)) return null;

  const safeMode = REMINDER_MODES.includes(mode) ? mode : "off";
  const { tag, aria, filled } = MODE_DETAILS[safeMode];
  const active = safeMode !== "off";

  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={aria}
      title={aria}
      className="foreman-bell-button"
      style={{
        alignItems: "center",
        justifyContent: "center",
        background: filled ? "#c9a96e22" : "transparent",
        border: `1px solid ${active ? "#c9a96e" : "#a8a29c"}`,
        borderRadius: "3px",
        // #8b7d6b passes 4.5:1 on Foreman's dark bg; #a8a29c did not.
        color: active ? "#c9a96e" : "#8b7d6b",
        cursor: "pointer",
        display: "inline-flex",
        flexShrink: 0,
        fontFamily: "monospace",
        fontSize: "0.6rem",
        gap: "0.3rem",
        height: "26px",
        letterSpacing: "0.06em",
        lineHeight: 1,
        minWidth: "26px",
        padding: active ? "0 0.4rem" : "0",
        transition: "color 0.15s, border-color 0.15s, background 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      <BellGlyph filled={filled} />
      {active && <span aria-hidden="true">{tag}</span>}
    </button>
  );
}

// Inline SVG so we can swap fill, match the FollowButton's vector affordance,
// and have a real touch target. ~12px visual; 26px button keeps fingers happy.
function BellGlyph({ filled }) {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
