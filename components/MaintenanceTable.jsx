import ScheduleBadge from "./ScheduleBadge.jsx";
import DateCell from "./DateCell.jsx";
import FollowButton from "./FollowButton.jsx";
import NoteCell from "./NoteCell.jsx";

const COLUMNS = [
  { label: "Category",              width: "9%"  },
  { label: "Item",                  width: "11%" },
  { label: "Type of Maintenance",   width: "22%" },
  { label: "Recommended Schedule",  width: "15%" },
  { label: "Last Completed On",     width: "14%" },
  { label: "Next Maintenance Date", width: "14%" },
  { label: "Notes",                 width: "15%" },
];

function rowKey(row) {
  return `${row.category}|${row.item}|${row.type}`;
}

export default function MaintenanceTable({
  rows,
  completedDates, onDateChange,
  nextDates, onNextDateChange,
  followSchedule, onToggleFollow,
  notes, onNoteChange,
  rowStates, onUnmute,
  stickyTop,
}) {
  return (
    <div style={{
      background: "#13161f",
      border: "1px solid #1e2330",
      borderRadius: "6px",
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
        <thead style={{ position: "sticky", top: stickyTop ?? 0, zIndex: 10 }}>
          <tr style={{ background: "#1a1f2e", borderBottom: "2px solid #2a2f3e" }}>
            {COLUMNS.map(({ label, width }) => (
              <th key={label} style={{
                color: "#c9a96e",
                fontFamily: "monospace",
                fontSize: "0.68rem",
                fontWeight: "normal",
                letterSpacing: "0.12em",
                padding: "0.75rem 0.6rem",
                textAlign: "left",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                width,
              }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isEven = idx % 2 === 0;
            const baseBg = isEven ? "#13161f" : "#161920";
            const key = rowKey(row);
            const isMuted = rowStates?.[key] === "muted";

            function MutedOverlay() {
              return isMuted ? (
                <div
                  onClick={() => onUnmute(row)}
                  style={{
                    bottom: 0, cursor: "pointer", left: 0, position: "absolute", right: 0, top: 0,
                  }}
                />
              ) : null;
            }

            return (
              <tr
                key={key}
                style={{
                  background: baseBg,
                  borderBottom: "1px solid #1e2330",
                  opacity: isMuted ? 0.35 : 1,
                  transition: "background 0.1s, opacity 0.15s",
                }}
                onMouseEnter={e => { if (!isMuted) e.currentTarget.style.background = "#1e2430"; }}
                onMouseLeave={e => e.currentTarget.style.background = baseBg}
              >
                <td style={{ padding: "0.5rem 0.6rem", color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.03em", verticalAlign: "middle" }}>
                  {row.category}
                </td>
                <td style={{ padding: "0.5rem 0.6rem", color: "#d4c9b8", verticalAlign: "middle" }}>
                  {row.item}
                </td>
                <td style={{ padding: "0.5rem 0.6rem", color: "#a89e8e", verticalAlign: "middle" }}>
                  {row.type}
                </td>
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <ScheduleBadge schedule={row.schedule} />
                </td>
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ pointerEvents: isMuted ? "none" : "auto" }}>
                      <DateCell
                        date={completedDates[key] ?? null}
                        onChange={(date) => onDateChange(key, date)}
                      />
                    </div>
                    <MutedOverlay />
                  </div>
                </td>
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", pointerEvents: isMuted ? "none" : "auto" }}>
                      <DateCell
                        date={nextDates[key] ?? null}
                        onChange={(date) => onNextDateChange(key, date)}
                      />
                      <FollowButton
                        schedule={row.schedule}
                        checked={followSchedule[key] ?? false}
                        onToggle={() => onToggleFollow(key, row.schedule)}
                      />
                    </div>
                    <MutedOverlay />
                  </div>
                </td>
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ pointerEvents: isMuted ? "none" : "auto" }}>
                      <NoteCell
                        value={notes[key] ?? ""}
                        onChange={(text) => onNoteChange(key, text)}
                      />
                    </div>
                    <MutedOverlay />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div style={{ color: "#5a5460", fontFamily: "monospace", fontSize: "0.82rem", padding: "3rem", textAlign: "center" }}>
          No results found.
        </div>
      )}
    </div>
  );
}
