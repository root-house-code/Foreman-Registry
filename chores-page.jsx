import { useState, useMemo, useEffect } from "react";
import PageNav from "./components/PageNav.jsx";
import CategoryTabs from "./components/CategoryTabs.jsx";
import SelectCell from "./components/SelectCell.jsx";
import NoteCell from "./components/NoteCell.jsx";
import SchedulePicker from "./components/SchedulePicker.jsx";
import ReminderButton from "./components/ReminderButton.jsx";
import ReminderSettings from "./components/ReminderSettings.jsx";
import { getScheduleColor } from "./lib/scheduleColor.js";
import { parseMonths } from "./lib/scheduleInterval.js";
import {
  loadChores, saveChores, createChore,
  loadChoreNextDates, saveChoreNextDates,
  loadChoreCompletedDates, saveChoreCompletedDates,
  loadChoreNotes, saveChoreNotes,
  computeNextOccurrenceFromStart,
} from "./lib/chores.js";
import { loadData } from "./lib/data.js";
import { loadRoomCategories } from "./lib/categoryTypes.js";
import {
  loadChoreReminderModes, saveChoreReminderModes,
  loadReminderModes, REMINDER_MODES, syncReminders,
} from "./lib/reminders.js";

// ─── Constants ───────────────────────────────────────────────────────────────

// Preferred display order for rooms — used for tab sorting and dropdown ordering.
// Rooms from inventory that aren't listed here appear at the end alphabetically.
const ROOM_ORDER = [
  "Whole House", "Kitchen", "Bathrooms", "Bedroom", "Living Room",
  "Dining Room", "Office", "Laundry", "Garage", "Basement",
];

function buildRoomOptions() {
  const fromInventory = loadRoomCategories();
  const all = ["Whole House", ...fromInventory.filter(r => r !== "Whole House")];
  return all
    .sort((a, b) => {
      if (a === "Whole House") return -1;
      if (b === "Whole House") return 1;
      const aRank = ROOM_ORDER.indexOf(a);
      const bRank = ROOM_ORDER.indexOf(b);
      if (aRank !== -1 && bRank !== -1) return aRank - bRank;
      if (aRank !== -1) return -1;
      if (bRank !== -1) return 1;
      return a.localeCompare(b);
    })
    .map(r => ({ value: r, label: r }));
}

const DAY_OPTIONS = [
  { value: null, label: "Any" },
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const TIME_OPTIONS = [
  { value: null,    label: "Any time" },
  { value: "06:00", label: "6:00 AM"  },
  { value: "07:00", label: "7:00 AM"  },
  { value: "08:00", label: "8:00 AM"  },
  { value: "09:00", label: "9:00 AM"  },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM"  },
  { value: "14:00", label: "2:00 PM"  },
  { value: "15:00", label: "3:00 PM"  },
  { value: "16:00", label: "4:00 PM"  },
  { value: "17:00", label: "5:00 PM"  },
  { value: "18:00", label: "6:00 PM"  },
  { value: "19:00", label: "7:00 PM"  },
  { value: "20:00", label: "8:00 PM"  },
  { value: "21:00", label: "9:00 PM"  },
];

const FREQ_ITEMS = [
  { label: "Weekly / Monthly",  color: "#4ade80" },
  { label: "Every 3–6 months",  color: "#34d399" },
  { label: "Twice a year",      color: "#60a5fa" },
  { label: "Annually",          color: "#f59e0b" },
  { label: "Every 2–10 years",  color: "#c084fc" },
  { label: "As needed",         color: "#94a3b8" },
];

const COLUMNS = [
  { label: "Room",     width: "9%",  sortKey: "room"      },
  { label: "Chore",    width: "22%", sortKey: "title"     },
  { label: "Schedule", width: "13%", sortKey: "schedule"  },
  { label: "Day",      width: "7%",  sortKey: "dayOfWeek" },
  { label: "Time",     width: "8%",  sortKey: "timeOfDay" },
  { label: "",         width: "4%",  sortKey: null        },  // bell
  { label: "Notes",    width: "24%", sortKey: "notes"     },
  { label: "Assignee", width: "9%",  sortKey: "assignee"  },
  { label: "",         width: "4%",  sortKey: null        },  // delete
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TitleCell({ value, onChange, placeholder = "Chore name" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function startEdit() { setDraft(value || ""); setEditing(true); }
  function commit() { setEditing(false); if (draft !== value) onChange(draft); }

  if (!editing) {
    return (
      <span
        onClick={startEdit}
        style={{ color: value ? "#a89e8e" : "#3a3440", cursor: "text", display: "block", fontFamily: "inherit", fontSize: "inherit", minHeight: "1.2em" }}
      >
        {value || placeholder}
      </span>
    );
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") setEditing(false); }}
      style={{ background: "#1a1f2e", border: "1px solid #2e3448", borderRadius: "2px", color: "#e8e0d0", fontFamily: "inherit", fontSize: "inherit", outline: "none", padding: "0.1rem 0.3rem", width: "100%" }}
    />
  );
}

function DeleteConfirmModal({ chore, onConfirm, onClose }) {
  return (
    <div
      style={{ alignItems: "center", background: "rgba(0,0,0,0.6)", bottom: 0, display: "flex", justifyContent: "center", left: 0, position: "fixed", right: 0, top: 0, zIndex: 1000 }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#0f1117", border: "1px solid #2e3448", borderRadius: "6px", maxWidth: 420, padding: "1.75rem 2rem", width: "90%" }}>
        <div style={{ color: "#f87171", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.15em", marginBottom: "1rem", textTransform: "uppercase" }}>
          Permanently Delete Chore
        </div>
        <p style={{ color: "#d4c9b8", fontFamily: "monospace", fontSize: "0.82rem", margin: "0 0 0.5rem" }}>
          <strong>{chore.title || "Unnamed chore"}</strong>
        </p>
        <p style={{ color: "#5a5460", fontFamily: "monospace", fontSize: "0.78rem", margin: "0 0 1.5rem" }}>
          This will permanently delete this chore and its history. This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "1px solid #2e3448", borderRadius: "3px", color: "#5a5460", cursor: "pointer", fontFamily: "monospace", fontSize: "0.78rem", padding: "0.45rem 1rem", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#8b7d6b"; e.currentTarget.style.borderColor = "#5a5460"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#5a5460"; e.currentTarget.style.borderColor = "#2e3448"; }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ background: "#f8717118", border: "1px solid #f87171", borderRadius: "3px", color: "#f87171", cursor: "pointer", fontFamily: "monospace", fontSize: "0.78rem", padding: "0.45rem 1rem", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#f8717130"}
            onMouseLeave={e => e.currentTarget.style.background = "#f8717118"}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const CAL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CAL_DOWS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function CalendarWidget({ chores, selectedChoreId, onSelectDate }) {
  const todayRaw = new Date();
  const todayYear = todayRaw.getFullYear();
  const todayMonth = todayRaw.getMonth();
  const todayDay = todayRaw.getDate();

  const selectedChore = chores.find(c => c.id === selectedChoreId) ?? null;

  const [view, setView] = useState({ y: todayYear, m: todayMonth });

  // Navigate to the selected chore's start month whenever the selection changes.
  useEffect(() => {
    if (selectedChore?.startDate) {
      const d = new Date(selectedChore.startDate);
      setView({ y: d.getFullYear(), m: d.getMonth() });
    }
  }, [selectedChoreId]); // eslint-disable-line react-hooks/exhaustive-deps

  function prevMonth() {
    setView(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 });
  }
  function nextMonth() {
    setView(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 });
  }

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstDow    = new Date(view.y, view.m, 1).getDay();

  // Map day-of-month → chores whose startDate falls on it this month.
  const startDatesByDay = {};
  for (const chore of chores) {
    if (!chore.startDate) continue;
    const d = new Date(chore.startDate);
    if (d.getFullYear() === view.y && d.getMonth() === view.m) {
      const day = d.getDate();
      if (!startDatesByDay[day]) startDatesByDay[day] = [];
      startDatesByDay[day].push(chore);
    }
  }

  const selectedStartDay = (() => {
    if (!selectedChore?.startDate) return null;
    const d = new Date(selectedChore.startDate);
    return d.getFullYear() === view.y && d.getMonth() === view.m ? d.getDate() : null;
  })();

  const canClick = !!selectedChoreId;

  const navBtnStyle = {
    background: "transparent", border: "none", color: "#8b7d6b",
    cursor: "pointer", fontFamily: "monospace", fontSize: "1rem",
    lineHeight: 1, padding: "0 0.4rem", transition: "color 0.15s",
  };

  return (
    <div style={{ background: "#13161f", border: "1px solid #1e2330", borderRadius: "6px", padding: "1.25rem", position: "sticky", top: 0 }}>
      {/* Section label */}
      <div style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.15em", marginBottom: "1rem", textTransform: "uppercase" }}>
        Start Dates
      </div>

      {/* Month nav */}
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: "0.6rem" }}>
        <button style={navBtnStyle} onClick={prevMonth}
          onMouseEnter={e => e.currentTarget.style.color = "#c9a96e"}
          onMouseLeave={e => e.currentTarget.style.color = "#8b7d6b"}
        >‹</button>
        <span style={{ color: "#d4c9b8", fontFamily: "monospace", fontSize: "0.8rem" }}>
          {CAL_MONTHS[view.m]} {view.y}
        </span>
        <button style={navBtnStyle} onClick={nextMonth}
          onMouseEnter={e => e.currentTarget.style.color = "#c9a96e"}
          onMouseLeave={e => e.currentTarget.style.color = "#8b7d6b"}
        >›</button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "2px" }}>
        {CAL_DOWS.map(d => (
          <div key={d} style={{ color: "#5a5460", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.05em", padding: "0.15rem 0", textAlign: "center" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
        {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const isToday    = view.y === todayYear && view.m === todayMonth && day === todayDay;
          const isSelected = day === selectedStartDay;
          const dots       = startDatesByDay[day] ?? [];
          const hasDot     = dots.length > 0 && !isSelected;

          return (
            <div
              key={day}
              onClick={() => canClick && onSelectDate(selectedChoreId, new Date(view.y, view.m, day))}
              style={{
                alignItems: "center",
                aspectRatio: "1",
                background: isSelected ? "#c9a96e" : isToday ? "#c9a96e18" : "transparent",
                border: isToday && !isSelected ? "1px solid #c9a96e50" : "1px solid transparent",
                borderRadius: "3px",
                color: isSelected ? "#0f1117" : isToday ? "#c9a96e" : canClick ? "#8b7d6b" : "#3a3440",
                cursor: canClick ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                fontFamily: "monospace",
                fontSize: "0.72rem",
                gap: "1px",
                justifyContent: "center",
                position: "relative",
                textAlign: "center",
                transition: "background 0.1s, color 0.1s",
              }}
              onMouseEnter={e => { if (canClick && !isSelected) e.currentTarget.style.background = "#c9a96e22"; }}
              onMouseLeave={e => { if (canClick && !isSelected) e.currentTarget.style.background = isToday ? "#c9a96e18" : "transparent"; }}
            >
              {day}
              {hasDot && (
                <div style={{ background: isSelected ? "#0f1117" : "#c9a96e", borderRadius: "50%", height: 3, left: "50%", position: "absolute", bottom: 2, transform: "translateX(-50%)", width: 3 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Selected chore info */}
      <div style={{ borderTop: "1px solid #2a2f3e", marginTop: "0.85rem", paddingTop: "0.75rem" }}>
        {!selectedChore ? (
          <p style={{ color: "#3a3440", fontFamily: "monospace", fontSize: "0.72rem", margin: 0 }}>
            Select a chore row to set its start date.
          </p>
        ) : (
          <div>
            <p style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "0.68rem", letterSpacing: "0.06em", margin: "0 0 0.3rem", overflow: "hidden", textOverflow: "ellipsis", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              {selectedChore.title || "Unnamed chore"}
            </p>
            <p style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.7rem", margin: 0 }}>
              {selectedChore.startDate
                ? `Starts ${new Date(selectedChore.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                : "No start date — click a day above"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChoresTable({ rows, notes, roomOptions, reminderModes, selectedChoreId, onChoreEdit, onNoteChange, onCycleReminderMode, onDelete, onChoreSelect, sortCols, onHeaderClick }) {
  return (
    <div style={{ background: "#13161f", border: "1px solid #1e2330", borderRadius: "6px", overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: "0.82rem", width: "100%" }}>
        <thead>
          <tr>
            {COLUMNS.map(({ label, width, sortKey }, i) => {
              const sort = sortCols.find(s => s.col === sortKey);
              const isPrimary = sort && sortCols[0]?.col === sortKey;
              return (
                <th
                  key={label || `__col${i}`}
                  onClick={e => sortKey && onHeaderClick(sortKey, e.shiftKey)}
                  style={{
                    background: "#1a1f2e",
                    borderBottom: "2px solid #2a2f3e",
                    color: sort ? (isPrimary ? "#c9a96e" : "#5a5460") : "#c9a96e",
                    cursor: sortKey ? "pointer" : "default",
                    fontFamily: "monospace",
                    fontSize: "0.68rem",
                    fontWeight: "normal",
                    letterSpacing: "0.12em",
                    padding: "0.75rem 0.6rem",
                    position: "sticky",
                    textAlign: "left",
                    textTransform: "uppercase",
                    top: 0,
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    width,
                    zIndex: 10,
                  }}
                >
                  {label}{sort ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} style={{ color: "#5a5460", fontFamily: "monospace", fontSize: "0.82rem", padding: "3rem", textAlign: "center" }}>
                No results found.
              </td>
            </tr>
          )}
          {rows.map((chore, i) => {
            const note       = notes[chore.id] || "";
            const isSelected = chore.id === selectedChoreId;
            const baseBg     = isSelected ? "#1e2035" : i % 2 === 0 ? "#13161f" : "#161920";
            const hoverBg    = isSelected ? "#232545" : "#1e2430";

            return (
              <tr
                key={chore.id}
                onClick={() => onChoreSelect(chore.id)}
                style={{
                  background: baseBg,
                  borderBottom: `1px solid ${isSelected ? "#c9a96e30" : "#1e2330"}`,
                  cursor: "pointer",
                  outline: isSelected ? "1px solid #c9a96e30" : "none",
                  outlineOffset: "-1px",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = baseBg}
              >
                {/* Room */}
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <SelectCell
                    value={chore.room}
                    options={roomOptions}
                    placeholder="Room"
                    onChange={v => onChoreEdit(chore.id, "room", v)}
                  />
                </td>

                {/* Chore title */}
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <TitleCell
                    value={chore.title}
                    onChange={v => onChoreEdit(chore.id, "title", v)}
                  />
                </td>

                {/* Schedule */}
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <SchedulePicker
                    value={chore.schedule || null}
                    onChange={v => onChoreEdit(chore.id, "schedule", v || "")}
                  />
                </td>

                {/* Day of week */}
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <SelectCell
                    value={chore.dayOfWeek ?? null}
                    options={DAY_OPTIONS}
                    placeholder="Any"
                    onChange={v => onChoreEdit(chore.id, "dayOfWeek", v)}
                  />
                </td>

                {/* Time of day */}
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <SelectCell
                    value={chore.timeOfDay ?? null}
                    options={TIME_OPTIONS}
                    placeholder="Any time"
                    onChange={v => onChoreEdit(chore.id, "timeOfDay", v)}
                  />
                </td>

                {/* Bell */}
                <td style={{ padding: "0.5rem 0.4rem", textAlign: "center", verticalAlign: "middle" }}>
                  <ReminderButton
                    schedule={chore.schedule}
                    mode={reminderModes?.[chore.id] ?? "off"}
                    onCycle={() => onCycleReminderMode(chore.id)}
                  />
                </td>

                {/* Notes */}
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <NoteCell
                    value={note}
                    onChange={v => onNoteChange(chore.id, v)}
                  />
                </td>

                {/* Assignee */}
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <TitleCell
                    value={chore.assignee || ""}
                    placeholder="—"
                    onChange={v => onChoreEdit(chore.id, "assignee", v)}
                  />
                </td>

                {/* Delete */}
                <td style={{ padding: "0.5rem 0.4rem", textAlign: "center", verticalAlign: "middle" }}>
                  <button
                    onClick={() => onDelete(chore)}
                    style={{ background: "transparent", border: "none", color: "#3a3440", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", padding: "0.1rem 0.3rem", transition: "color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                    onMouseLeave={e => e.currentTarget.style.color = "#3a3440"}
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ChoresPage({ navigate }) {
  const [chores, setChores]               = useState(() => loadChores());
  const [notes, setNotes]                 = useState(() => loadChoreNotes());
  const [reminderModes, setReminderModes] = useState(() => loadChoreReminderModes());
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [selectedChoreId, setSelectedChoreId] = useState(null);
  const [roomOptions]                     = useState(() => buildRoomOptions());
  const [activeRoom, setActiveRoom]       = useState("All");
  const [activeFrequencies, setActiveFrequencies] = useState(new Set());
  const [search, setSearch]               = useState("");
  const [sortCols, setSortCols]           = useState([]);
  const [confirmChore, setConfirmChore]   = useState(null);
  const [addHovered, setAddHovered]       = useState(false);

  // Room tabs derived from current chores
  const rooms = useMemo(() => {
    const present = new Set(chores.map(c => c.room));
    return [
      ...ROOM_ORDER.filter(r => present.has(r)),
      ...[...present].filter(r => !ROOM_ORDER.includes(r)).sort(),
    ];
  }, [chores]);

  // ── Sort helpers ────────────────────────────────────────────────────────────
  function handleHeaderClick(col, shiftKey) {
    setSortCols(prev => {
      if (!shiftKey || prev.length === 0) {
        const isPrimary = prev[0]?.col === col;
        return [{ col, dir: isPrimary && prev[0].dir === "asc" ? "desc" : "asc" }];
      }
      const existing = prev.find(s => s.col === col);
      const primary = prev[0];
      return [primary, { col, dir: existing ? (existing.dir === "asc" ? "desc" : "asc") : "asc" }];
    });
  }

  function getSortValue(chore, col) {
    switch (col) {
      case "room":      return (chore.room  || "").toLowerCase();
      case "title":     return (chore.title || "").toLowerCase();
      case "schedule":  return parseMonths(chore.schedule) ?? 999;
      case "dayOfWeek": return chore.dayOfWeek ?? 7;
      case "timeOfDay": return chore.timeOfDay ?? "99:99";
      case "assignee":  return (chore.assignee || "").toLowerCase();
      case "notes":     return (notes[chore.id] || "").toLowerCase();
      default:          return "";
    }
  }

  function compareSortValues(av, bv, col, dir) {
    const aEmpty = av === null || av === undefined || av === "" || av === "99:99";
    const bEmpty = bv === null || bv === undefined || bv === "" || bv === "99:99";
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    let raw;
    if (col === "schedule" || col === "dayOfWeek") raw = av - bv;
    else raw = String(av).localeCompare(String(bv));
    return dir === "asc" ? raw : -raw;
  }

  // ── Filtered + sorted list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const base = chores.filter(chore => {
      if (activeRoom !== "All" && chore.room !== activeRoom) return false;
      if (activeFrequencies.size > 0 && !activeFrequencies.has(getScheduleColor(chore.schedule))) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(chore.room    || "").toLowerCase().includes(q) &&
          !(chore.title   || "").toLowerCase().includes(q) &&
          !(chore.schedule || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });

    if (sortCols.length > 0) {
      return base.sort((a, b) => {
        for (const { col, dir } of sortCols) {
          const cmp = compareSortValues(getSortValue(a, col), getSortValue(b, col), col, dir);
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
    }

    // Default sort: ROOM_ORDER, then by title
    return base.sort((a, b) => {
      const aRank = ROOM_ORDER.indexOf(a.room);
      const bRank = ROOM_ORDER.indexOf(b.room);
      if (aRank !== bRank) return (aRank === -1 ? 999 : aRank) - (bRank === -1 ? 999 : bRank);
      return (a.title || "").localeCompare(b.title || "");
    });
  }, [chores, activeRoom, activeFrequencies, search, sortCols, notes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleChoreEdit(id, field, value) {
    const updated = chores.map(c => c.id === id ? { ...c, [field]: value } : c);
    setChores(updated);
    saveChores(updated);
  }

  function handleNoteChange(id, text) {
    const newNotes = { ...notes, [id]: text };
    setNotes(newNotes);
    saveChoreNotes(newNotes);
  }

  function handleAddChore() {
    const newChore = createChore({ title: "", room: "Whole House", schedule: "every 1 weeks", dayOfWeek: null, timeOfDay: null });
    const updated = [newChore, ...chores];
    setChores(updated);
    saveChores(updated);
  }

  function handleDeleteChore(chore) {
    const updated = chores.filter(c => c.id !== chore.id);
    setChores(updated);
    saveChores(updated);
    // Clean up orphaned entries from localStorage
    const completed = loadChoreCompletedDates(); delete completed[chore.id]; saveChoreCompletedDates(completed);
    const next = loadChoreNextDates();           delete next[chore.id];      saveChoreNextDates(next);
    const n = { ...notes };                      delete n[chore.id];         saveChoreNotes(n); setNotes(n);
    setConfirmChore(null);
  }

  function handleToggleFrequency(color) {
    setActiveFrequencies(prev => {
      const next = new Set(prev);
      next.has(color) ? next.delete(color) : next.add(color);
      return next;
    });
  }

  function handleCycleReminderMode(choreId) {
    setReminderModes(prev => {
      const cur = REMINDER_MODES.includes(prev[choreId]) ? prev[choreId] : "off";
      const nextIdx = (REMINDER_MODES.indexOf(cur) + 1) % REMINDER_MODES.length;
      const next = { ...prev, [choreId]: REMINDER_MODES[nextIdx] };
      saveChoreReminderModes(next);
      return next;
    });
  }

  function handleSetStartDate(choreId, date) {
    const updated = chores.map(c => c.id === choreId ? { ...c, startDate: date.toISOString() } : c);
    setChores(updated);
    saveChores(updated);
    const chore = updated.find(c => c.id === choreId);
    if (chore) {
      const next = computeNextOccurrenceFromStart(date, chore.schedule, chore.dayOfWeek, chore.timeOfDay);
      const nextDates = { ...loadChoreNextDates(), [choreId]: next.toISOString() };
      saveChoreNextDates(nextDates);
    }
  }

  async function handleSyncReminders() {
    const maintenanceRows = loadData();
    let maintenanceNextDates = {};
    try { maintenanceNextDates = JSON.parse(localStorage.getItem("maintenance-next-dates") || "{}"); } catch {}
    return syncReminders({ rows: maintenanceRows, nextDates: maintenanceNextDates, modes: loadReminderModes() });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#0f1117", color: "#d4c9b8", display: "flex", flexDirection: "column", fontFamily: "'Georgia', 'Times New Roman', serif", height: "100vh", overflow: "hidden" }}>

      {confirmChore && (
        <DeleteConfirmModal
          chore={confirmChore}
          onConfirm={() => handleDeleteChore(confirmChore)}
          onClose={() => setConfirmChore(null)}
        />
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 60%)", borderBottom: "1px solid #2a2f3e", flexShrink: 0, padding: "2rem", zIndex: 50 }}>
        <div style={{ alignItems: "flex-end", display: "flex", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ color: "#f0e6d3", fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: "normal", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 0.5rem" }}>Foreman</h1>
            <div>
              <span style={{ color: "#8b7d6b", display: "block", fontFamily: "monospace", fontSize: "0.7rem", letterSpacing: "0.25em", textTransform: "uppercase" }}>KEEP IT CLEAN</span>
              <span style={{ color: "#c9a96e", fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: "clamp(0.95rem, 2vw, 1.15rem)", letterSpacing: "0.01em" }}>Chores</span>
            </div>
          </div>
          <PageNav currentPage="chores" navigate={navigate} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "2rem 2rem 4rem" }}>
      <div style={{ alignItems: "flex-start", display: "flex", gap: "2rem" }}>
      <div style={{ flex: "0 0 58%", minWidth: 0 }}>

        {/* Stats / search / add */}
        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <p style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.85rem", margin: 0 }}>
            {chores.length} chore{chores.length !== 1 ? "s" : ""} across {rooms.length} room{rooms.length !== 1 ? "s" : ""}
          </p>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chores, rooms, schedules…"
            style={{ background: "#1a1f2e", border: "1px solid #2e3448", borderRadius: "4px", color: "#e8e0d0", fontFamily: "monospace", fontSize: "0.82rem", marginLeft: "auto", outline: "none", padding: "0.5rem 0.85rem", width: "260px" }}
          />
          {search.trim() && (
            <span style={{ color: "#5a5460", fontFamily: "monospace", fontSize: "0.78rem" }}>{filtered.length} results</span>
          )}
          <button
            onClick={handleAddChore}
            onMouseEnter={() => setAddHovered(true)}
            onMouseLeave={() => setAddHovered(false)}
            style={{ background: "transparent", border: `1px solid ${addHovered ? "#c9a96e" : "#2e3448"}`, borderRadius: "3px", color: addHovered ? "#c9a96e" : "#8b7d6b", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s", whiteSpace: "nowrap" }}
          >
            + ADD CHORE
          </button>
          <button
            onClick={() => setRemindersOpen(true)}
            className="foreman-reminders-header-btn"
            style={{ background: "transparent", border: "1px solid #2e3448", borderRadius: "3px", color: "#8b7d6b", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s", whiteSpace: "nowrap" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#c9a96e"; e.currentTarget.style.color = "#c9a96e"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2e3448"; e.currentTarget.style.color = "#8b7d6b"; }}
          >
            REMINDERS
          </button>
        </div>

        {/* Room tabs */}
        <CategoryTabs
          special={["All"]}
          groups={[{ type: "room", label: "Rooms", tabs: rooms }]}
          active={activeRoom}
          onSelect={setActiveRoom}
        />

        {/* Frequency filter */}
        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.25rem" }}>
          <span style={{ color: "#5a5460", fontFamily: "monospace", fontSize: "0.68rem", letterSpacing: "0.1em", marginRight: "0.25rem", textTransform: "uppercase" }}>Frequency:</span>
          {FREQ_ITEMS.map(({ label, color }) => {
            const active = activeFrequencies.has(color);
            return (
              <div
                key={label}
                onClick={() => handleToggleFrequency(color)}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#1a1f2e"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                style={{ alignItems: "center", background: active ? `${color}18` : "transparent", border: `1px solid ${active ? `${color}40` : "transparent"}`, borderRadius: "3px", cursor: "pointer", display: "flex", gap: "0.35rem", padding: "0.2rem 0.5rem", transition: "background 0.15s, border-color 0.15s" }}
              >
                <div style={{ background: color, borderRadius: "50%", flexShrink: 0, height: 8, width: 8 }} />
                <span style={{ color: active ? color : "#6a6070", fontFamily: "monospace", fontSize: "0.68rem", transition: "color 0.15s" }}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <ChoresTable
          rows={filtered}
          notes={notes}
          roomOptions={roomOptions}
          reminderModes={reminderModes}
          selectedChoreId={selectedChoreId}
          onChoreEdit={handleChoreEdit}
          onNoteChange={handleNoteChange}
          onCycleReminderMode={handleCycleReminderMode}
          onDelete={chore => setConfirmChore(chore)}
          onChoreSelect={id => setSelectedChoreId(prev => prev === id ? null : id)}
          sortCols={sortCols}
          onHeaderClick={handleHeaderClick}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <CalendarWidget
          chores={chores}
          selectedChoreId={selectedChoreId}
          onSelectDate={handleSetStartDate}
        />
      </div>
      </div>
      </div>

      <ReminderSettings
        open={remindersOpen}
        onClose={() => setRemindersOpen(false)}
        onSync={handleSyncReminders}
        enabledCount={Object.values(reminderModes).filter(m => m && m !== "off").length}
      />
    </div>
  );
}
