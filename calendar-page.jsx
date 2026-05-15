import { useState, useMemo } from "react";
import FmHeader from "./src/components/FmHeader.jsx";
import FmSubnav from "./src/components/FmSubnav.jsx";
import CategoryTabs from "./components/CategoryTabs.jsx";
import ChoreDetailModal from "./components/ChoreDetailModal.jsx";
import {
  loadChores, saveChores, createChore,
  loadChoreNextDates, saveChoreNextDates,
  computeNextOccurrenceFromStart,
} from "./lib/chores.js";
import { loadData } from "./lib/data.js";
import { loadDeletedCategories } from "./lib/deletedCategories.js";
import { loadDeletedItems } from "./lib/deletedItems.js";
import { getScheduleColor } from "./lib/scheduleColor.js";
import { loadRoomCategories } from "./lib/categoryTypes.js";
import { parseMonths, isComputable } from "./lib/scheduleInterval.js";
import {
  loadMaintenanceStartDates, saveMaintenanceStartDates, maintenanceKey,
} from "./lib/maintenance.js";
import {
  loadChoreCompletions, saveChoreCompletions, isChoreCompleted, toggleChoreCompletion,
} from "./lib/choreCompletions.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const MAX_CHIPS    = 4;

const SEASON_MONTHS = {
  spring: [2, 3, 4],
  summer: [5, 6, 7],
  fall:   [8, 9, 10],
  winter: [11, 0, 1],
};

const CAL_MONTHS       = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CAL_MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CAL_DOWS         = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const CAL_DOWS_LONG    = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const ROOM_ORDER = [
  "Whole House","Kitchen","Bathrooms","Bedroom","Living Room",
  "Dining Room","Office","Laundry","Garage","Basement",
];

const DAY_OPTIONS = [
  { value: null, label: "Any" },
  { value: 0, label: "Sun" }, { value: 1, label: "Mon" }, { value: 2, label: "Tue" },
  { value: 3, label: "Wed" }, { value: 4, label: "Thu" }, { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const TIME_OPTIONS = [
  { value: null,    label: "Any time" },
  { value: "06:00", label: "6:00 AM"  }, { value: "07:00", label: "7:00 AM"  },
  { value: "08:00", label: "8:00 AM"  }, { value: "09:00", label: "9:00 AM"  },
  { value: "10:00", label: "10:00 AM" }, { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" }, { value: "13:00", label: "1:00 PM"  },
  { value: "14:00", label: "2:00 PM"  }, { value: "15:00", label: "3:00 PM"  },
  { value: "16:00", label: "4:00 PM"  }, { value: "17:00", label: "5:00 PM"  },
  { value: "18:00", label: "6:00 PM"  }, { value: "19:00", label: "7:00 PM"  },
  { value: "20:00", label: "8:00 PM"  }, { value: "21:00", label: "9:00 PM"  },
];

const MODAL_SCHEDULE_OPTIONS = [
  { value: "every 1 days",   label: "Daily"          },
  { value: "every 1 weeks",  label: "Every week"     },
  { value: "every 2 weeks",  label: "Every 2 weeks"  },
  { value: "every 3 weeks",  label: "Every 3 weeks"  },
  { value: "every 1 months", label: "Every month"    },
  { value: "every 2 months", label: "Every 2 months" },
  { value: "every 3 months", label: "Every 3 months" },
  { value: "every 6 months", label: "Every 6 months" },
  { value: "every 1 years",  label: "Every year"     },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildRoomOptions() {
  const fromInventory = loadRoomCategories();
  const all = ["Whole House", ...fromInventory.filter(r => r !== "Whole House")];
  return all
    .sort((a, b) => {
      if (a === "Whole House") return -1; if (b === "Whole House") return 1;
      const aR = ROOM_ORDER.indexOf(a), bR = ROOM_ORDER.indexOf(b);
      if (aR !== -1 && bR !== -1) return aR - bR;
      if (aR !== -1) return -1; if (bR !== -1) return 1;
      return a.localeCompare(b);
    })
    .map(r => ({ value: r, label: r }));
}

function formatTimeOfDay(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// Returns Set of day-of-month numbers where a chore recurs in the viewed month.
function getChoreMonthOccurrences(startDate, schedule, dayOfWeek, viewYear, viewMonth) {
  if (!startDate || !schedule) return new Set();
  let anchor = new Date(startDate);
  anchor.setHours(0, 0, 0, 0);
  if (dayOfWeek !== null && dayOfWeek !== undefined) {
    const snap = (dayOfWeek - anchor.getDay() + 7) % 7;
    if (snap > 0) anchor.setDate(anchor.getDate() + snap);
  }
  const monthStart = new Date(viewYear, viewMonth, 1);
  const monthEnd   = new Date(viewYear, viewMonth + 1, 0);
  if (anchor > monthEnd) return new Set();
  const s = schedule.toLowerCase();
  const dm = s.match(/every\s+(\d+)\s*days?/);
  const wm = s.match(/every\s+(\d+)\s*weeks?/);
  const mm = s.match(/every\s+(\d+)\s*months?/);
  const ym = s.match(/every\s+(\d+)\s*years?/);
  function step(d) {
    const n = new Date(d);
    if      (dm) n.setDate(n.getDate() + parseInt(dm[1]));
    else if (wm) n.setDate(n.getDate() + parseInt(wm[1]) * 7);
    else if (mm) n.setMonth(n.getMonth() + parseInt(mm[1]));
    else if (ym) n.setFullYear(n.getFullYear() + parseInt(ym[1]));
    else         n.setDate(n.getDate() + 7);
    return n;
  }
  let cur = new Date(anchor), safety = 0;
  while (cur < monthStart && safety++ < 2000) cur = step(cur);
  const result = new Set();
  safety = 0;
  while (cur <= monthEnd && safety++ < 60) { result.add(cur.getDate()); cur = step(cur); }
  return result;
}

// Returns Set of day-of-month numbers where a maintenance task recurs this month.
// Uses parseMonths for broad schedule format support; respects season gate.
function getMaintenanceMonthOccurrences(startDateStr, schedule, season, viewYear, viewMonth) {
  if (!startDateStr || !schedule || !isComputable(schedule)) return new Set();
  if (season && !SEASON_MONTHS[season.toLowerCase()]?.includes(viewMonth)) return new Set();
  const months = parseMonths(schedule);
  if (!months) return new Set();
  const anchor = new Date(startDateStr);
  anchor.setHours(0, 0, 0, 0);
  const monthStart = new Date(viewYear, viewMonth, 1);
  const monthEnd   = new Date(viewYear, viewMonth + 1, 0);
  if (anchor > monthEnd) return new Set();
  function step(d) {
    const n = new Date(d);
    n.setMonth(n.getMonth() + months);
    return n;
  }
  let cur = new Date(anchor), safety = 0;
  while (cur < monthStart && safety++ < 2000) cur = step(cur);
  const result = new Set();
  safety = 0;
  while (cur <= monthEnd && safety++ < 60) { result.add(cur.getDate()); cur = step(cur); }
  return result;
}

// True if the task was completed in the cycle that covers projectedDate.
function checkMaintenanceCompleted(key, projectedDate, schedule, maintenanceDates) {
  const lastStr = maintenanceDates[key];
  if (!lastStr) return false;
  const months = parseMonths(schedule);
  if (!months) return false;
  const last = new Date(lastStr);
  const prevDue = new Date(projectedDate);
  prevDue.setMonth(prevDue.getMonth() - months);
  return last > prevDue && last <= new Date(projectedDate.getTime() + 86400000);
}

// Next n upcoming chore occurrences from today.
function getChoreUpcoming(chore, n = 3) {
  if (!chore.startDate || !chore.schedule) return [];
  const results = [];
  let cur = computeNextOccurrenceFromStart(
    new Date(chore.startDate), chore.schedule, chore.dayOfWeek, chore.timeOfDay
  );
  for (let i = 0; results.length < n && i < n + 100; i++) {
    results.push(new Date(cur));
    const next = new Date(cur);
    const s = chore.schedule.toLowerCase();
    const dm = s.match(/every\s+(\d+)\s*days?/);
    const wm = s.match(/every\s+(\d+)\s*weeks?/);
    const mm = s.match(/every\s+(\d+)\s*months?/);
    const ym = s.match(/every\s+(\d+)\s*years?/);
    if      (dm) next.setDate(next.getDate() + parseInt(dm[1]));
    else if (wm) next.setDate(next.getDate() + parseInt(wm[1]) * 7);
    else if (mm) next.setMonth(next.getMonth() + parseInt(mm[1]));
    else if (ym) next.setFullYear(next.getFullYear() + parseInt(ym[1]));
    else         next.setDate(next.getDate() + 7);
    cur = next;
  }
  return results;
}

// Next n upcoming maintenance occurrences from today.
function getMaintenanceUpcoming(startDateStr, schedule, n = 3) {
  if (!startDateStr || !schedule || !isComputable(schedule)) return [];
  const months = parseMonths(schedule);
  if (!months) return [];
  const now = new Date();
  let cur = new Date(startDateStr);
  cur.setHours(0, 0, 0, 0);
  let safety = 0;
  while (cur < now && safety++ < 500) { cur = new Date(cur); cur.setMonth(cur.getMonth() + months); }
  const results = [];
  for (let i = 0; results.length < n && i < n + 100; i++) {
    results.push(new Date(cur));
    cur = new Date(cur);
    cur.setMonth(cur.getMonth() + months);
  }
  return results;
}

// Combined upcoming from chores + maintenance, sorted chronologically.
function buildGlobalUpcoming(chores, maintenanceRows, maintenanceStartDates, maintenanceNextDates, n = 16) {
  const now    = new Date();
  const events = [];
  for (const chore of chores) {
    if (!chore.startDate || !chore.schedule) continue;
    getChoreUpcoming(chore, 2).forEach(date =>
      events.push({ date, type: "chore", label: chore.title, color: getScheduleColor(chore.schedule), meta: chore.room })
    );
  }
  for (const row of maintenanceRows) {
    const key    = maintenanceKey(row);
    const anchor = maintenanceStartDates[key];
    if (anchor) {
      getMaintenanceUpcoming(anchor, row.schedule, 2).forEach(date =>
        events.push({ date, type: "maintenance", label: `${row.item} › ${row.task}`, color: getScheduleColor(row.schedule), meta: row.category })
      );
    } else {
      const nextStr = maintenanceNextDates[key];
      if (!nextStr) continue;
      const nextDate = new Date(nextStr);
      if (nextDate >= now)
        events.push({ date: nextDate, type: "maintenance", label: `${row.item} › ${row.task}`, color: getScheduleColor(row.schedule), meta: row.category });
    }
  }
  events.sort((a, b) => a.date - b.date);
  return events.slice(0, n);
}

// ─── CreateChoreModal ─────────────────────────────────────────────────────────

function CreateChoreModal({ date, roomOptions, onSave, onClose }) {
  const [form, setForm] = useState({
    title: "", room: roomOptions[0]?.value ?? "Whole House",
    schedule: "every 1 weeks", dayOfWeek: date ? date.getDay() : null,
    timeOfDay: null, assignee: "", notes: "",
  });
  function set(f, v) { setForm(p => ({ ...p, [f]: v })); }
  const dateLabel = date ? date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "";
  const canSave   = form.title.trim().length > 0;
  const inputStyle  = { background: "#1a1f2e", border: "1px solid #a8a29c", borderRadius: "2px", boxSizing: "border-box", color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.8rem", outline: "none", padding: "0.35rem 0.5rem", width: "100%" };
  const labelStyle  = { color: "#a8a29c", display: "block", fontFamily: "monospace", fontSize: "0.62rem", letterSpacing: "0.1em", marginBottom: "0.25rem", textTransform: "uppercase" };
  const selectStyle = { ...inputStyle, appearance: "none", cursor: "pointer", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a5460'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", paddingRight: "1.5rem" };
  return (
    <div style={{ alignItems: "center", background: "rgba(0,0,0,0.7)", bottom: 0, display: "flex", justifyContent: "center", left: 0, position: "fixed", right: 0, top: 0, zIndex: 200 }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#0f1117", border: "1px solid #a8a29c", borderRadius: "6px", maxWidth: 480, padding: "1.75rem 2rem", width: "90%" }}>
        <div style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.15em", marginBottom: "0.2rem", textTransform: "uppercase" }}>New Chore</div>
        <div style={{ color: "#c9a96e", fontFamily: "'Georgia','Times New Roman',serif", fontSize: "1.05rem", marginBottom: "1.5rem" }}>{dateLabel}</div>
        <div style={{ marginBottom: "1rem" }}><label style={labelStyle}>Chore Name</label><input autoFocus value={form.title} onChange={e => set("title", e.target.value)} onKeyDown={e => { if (e.key === "Enter" && canSave) onSave(form, date); if (e.key === "Escape") onClose(); }} placeholder="e.g. Vacuum all floors" style={inputStyle} /></div>
        <div style={{ marginBottom: "1rem" }}><label style={labelStyle}>Room</label><select value={form.room} onChange={e => set("room", e.target.value)} style={selectStyle}>{roomOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div style={{ marginBottom: "1rem" }}><label style={labelStyle}>Schedule</label><select value={form.schedule} onChange={e => set("schedule", e.target.value)} style={selectStyle}>{MODAL_SCHEDULE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr", marginBottom: "1rem" }}>
          <div><label style={labelStyle}>Day</label><select value={form.dayOfWeek ?? ""} onChange={e => set("dayOfWeek", e.target.value === "" ? null : parseInt(e.target.value))} style={selectStyle}><option value="">Any</option>{DAY_OPTIONS.filter(d => d.value !== null).map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div><label style={labelStyle}>Time</label><select value={form.timeOfDay ?? ""} onChange={e => set("timeOfDay", e.target.value || null)} style={selectStyle}><option value="">Any time</option>{TIME_OPTIONS.filter(t => t.value !== null).map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></div>
        </div>
        <div style={{ marginBottom: "1rem" }}><label style={labelStyle}>Assignee</label><input value={form.assignee} onChange={e => set("assignee", e.target.value)} placeholder="Who does this chore?" style={inputStyle} /></div>
        <div style={{ marginBottom: "1.5rem" }}><label style={labelStyle}>Notes</label><textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any notes…" rows={2} style={{ ...inputStyle, resize: "vertical" }} /></div>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid #a8a29c", borderRadius: "3px", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.78rem", padding: "0.45rem 1rem" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#8b7d6b"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#a8a29c"; }}>Cancel</button>
          <button onClick={() => canSave && onSave(form, date)} disabled={!canSave} style={{ background: canSave ? "#c9a96e22" : "transparent", border: `1px solid ${canSave ? "#c9a96e" : "#a8a29c"}`, borderRadius: "3px", color: canSave ? "#c9a96e" : "#a8a29c", cursor: canSave ? "pointer" : "default", fontFamily: "monospace", fontSize: "0.78rem", padding: "0.45rem 1rem" }}>Add Chore</button>
        </div>
      </div>
    </div>
  );
}

// ─── CalendarPage ─────────────────────────────────────────────────────────────

export default function CalendarPage({ navigate }) {
  const todayRaw   = new Date();
  const todayYear  = todayRaw.getFullYear();
  const todayMonth = todayRaw.getMonth();
  const todayDay   = todayRaw.getDate();

  const [chores, setChores]     = useState(() => loadChores());
  const [maintenanceRows]       = useState(() => {
    const deletedCats   = loadDeletedCategories();
    const deletedItems  = loadDeletedItems();
    return loadData().filter(r =>
      r.category && r.item && r.task && !r._isBlankCategory &&
      !deletedCats.has(r.category) &&
      !deletedItems.has(`${r.category}|${r.item}`)
    );
  });
  const [maintenanceStartDates, setMaintenanceStartDates] = useState(() => loadMaintenanceStartDates());
  const [maintenanceDates]      = useState(() => { try { return JSON.parse(localStorage.getItem("maintenance-dates") || "{}"); } catch { return {}; } });
  const [maintenanceNextDates]  = useState(() => { try { return JSON.parse(localStorage.getItem("maintenance-next-dates") || "{}"); } catch { return {}; } });
  const [view, setView]         = useState({ y: todayYear, m: todayMonth });
  const [selectedDay, setSelectedDay]     = useState(null);
  const [createDate, setCreateDate]       = useState(null);
  const [selectedTaskKey, setSelectedTaskKey] = useState(null); // maintenance task awaiting start date
  const [activeFilter, setActiveFilter] = useState("All");
  const [roomOptions]           = useState(() => buildRoomOptions());
  const [choreCompletions, setChoreCompletions] = useState(() => loadChoreCompletions());
  const [detailEvent, setDetailEvent] = useState(null); // { chore, date } | null

  const atYearStart = view.y === CURRENT_YEAR && view.m === 0;
  const atYearEnd   = view.y === CURRENT_YEAR && view.m === 11;

  function prevMonth() {
    if (atYearStart) return;
    setSelectedDay(null);
    setView(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 });
  }
  function nextMonth() {
    if (atYearEnd) return;
    setSelectedDay(null);
    setView(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 });
  }


  // Combined filter set: unique chore rooms + maintenance categories
  const { choreRooms, maintenanceCats } = useMemo(() => {
    const rooms = [...new Set(chores.map(c => c.room))].sort((a, b) => {
      const ai = ROOM_ORDER.indexOf(a), bi = ROOM_ORDER.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1; if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
    const cats = [...new Set(maintenanceRows.map(r => r.category))].sort();
    return { choreRooms: rooms, maintenanceCats: cats };
  }, [chores, maintenanceRows]);

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstDow    = new Date(view.y, view.m, 1).getDay();
  const numRows     = Math.ceil((firstDow + daysInMonth) / 7);

  // Build events-by-day map for the viewed month
  const eventsByDay = useMemo(() => {
    const map = {};
    function push(day, event) { if (!map[day]) map[day] = []; map[day].push(event); }

    for (const chore of chores) {
      if (!chore.startDate || !chore.schedule) continue;
      if (activeFilter !== "All" && chore.room !== activeFilter) continue;
      const days = getChoreMonthOccurrences(chore.startDate, chore.schedule, chore.dayOfWeek, view.y, view.m);
      for (const day of days) {
        const date = new Date(view.y, view.m, day);
        push(day, { type: "chore", chore, date, isCompleted: isChoreCompleted(choreCompletions, chore.id, date) });
      }
    }

    for (const row of maintenanceRows) {
      const key    = maintenanceKey(row);
      const anchor = maintenanceStartDates[key];
      if (activeFilter !== "All" && row.category !== activeFilter) continue;
      if (anchor) {
        const days = getMaintenanceMonthOccurrences(anchor, row.schedule, row.season, view.y, view.m);
        for (const day of days) {
          const projectedDate = new Date(view.y, view.m, day);
          push(day, { type: "maintenance", row, key, isCompleted: checkMaintenanceCompleted(key, projectedDate, row.schedule, maintenanceDates) });
        }
      } else {
        // No recurring start date — show next due date as a one-time event if it falls in this month.
        const nextStr = maintenanceNextDates[key];
        if (!nextStr) continue;
        const nextDate = new Date(nextStr);
        if (nextDate.getFullYear() === view.y && nextDate.getMonth() === view.m)
          push(nextDate.getDate(), { type: "maintenance", row, key, isCompleted: false });
      }
    }
    return map;
  }, [chores, maintenanceRows, maintenanceStartDates, maintenanceDates, maintenanceNextDates, choreCompletions, view, activeFilter]);

  // Maintenance tasks that have no start date yet (need scheduling)
  const unscheduledMaintenance = useMemo(() =>
    maintenanceRows
      .filter(r => isComputable(r.schedule) && !maintenanceStartDates[maintenanceKey(r)])
      .slice(0, 30),
    [maintenanceRows, maintenanceStartDates]
  );

  const selectedTaskRow = selectedTaskKey
    ? maintenanceRows.find(r => maintenanceKey(r) === selectedTaskKey) ?? null
    : null;

  const globalUpcoming = useMemo(
    () => buildGlobalUpcoming(chores, maintenanceRows, maintenanceStartDates, maintenanceNextDates),
    [chores, maintenanceRows, maintenanceStartDates, maintenanceNextDates]
  );

  function handleCellClick(day) {
    const date = new Date(view.y, view.m, day);
    if (selectedTaskKey) {
      const updated = { ...maintenanceStartDates, [selectedTaskKey]: date.toISOString() };
      setMaintenanceStartDates(updated);
      saveMaintenanceStartDates(updated);
      setSelectedTaskKey(null);
    } else {
      setCreateDate(date);
    }
  }

  function handleCreateChore(form, date) {
    const newChore = createChore({ ...form, startDate: date?.toISOString() ?? null });
    const updated  = [newChore, ...chores];
    setChores(updated);
    saveChores(updated);
    if (date && newChore.schedule) {
      const next      = computeNextOccurrenceFromStart(date, newChore.schedule, newChore.dayOfWeek, newChore.timeOfDay);
      const nextDates = { ...loadChoreNextDates(), [newChore.id]: next.toISOString() };
      saveChoreNextDates(nextDates);
    }
  }

  const selectedDayEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];
  const selectedDayLabel  = selectedDay
    ? new Date(view.y, view.m, selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : null;

  const navBtnStyle = (disabled) => ({
    background: "transparent", border: "none",
    color: disabled ? "#a8a29c" : "#8b7d6b",
    cursor: disabled ? "default" : "pointer",
    fontFamily: "monospace", fontSize: "1.2rem", lineHeight: 1,
    padding: "0.1rem 0.6rem", transition: "color 0.15s",
  });


  return (
    <div style={{ background: "var(--fm-bg)", color: "var(--fm-ink)", display: "flex", flexDirection: "column", fontFamily: "var(--fm-serif)", height: "100vh", overflow: "hidden" }}>

      {createDate && (
        <CreateChoreModal
          date={createDate} roomOptions={roomOptions}
          onSave={(form, date) => { handleCreateChore(form, date); setCreateDate(null); }}
          onClose={() => setCreateDate(null)}
        />
      )}

      {detailEvent && (
        <ChoreDetailModal
          chore={detailEvent.chore}
          date={detailEvent.date}
          isDone={isChoreCompleted(choreCompletions, detailEvent.chore.id, detailEvent.date)}
          onToggleDone={() => {
            const next = toggleChoreCompletion(choreCompletions, detailEvent.chore.id, detailEvent.date);
            saveChoreCompletions(next);
            setChoreCompletions(next);
          }}
          onClose={() => setDetailEvent(null)}
        />
      )}

      {/* Header */}
      <FmHeader active="Calendar" tagline="Calendar" />
      <FmSubnav
        tabs={["Month", "Week", "Agenda", "Year"]}
        active="Month"
        stats={[
          { value: Object.values(eventsByDay).flat().filter(e => e.type === "maintenance").length, label: "tasks" },
          { value: Object.values(eventsByDay).flat().filter(e => e.type === "chore").length, label: "chores" },
          { value: Object.values(eventsByDay).flat().length, label: "total events" },
        ]}
      />

      {/* Controls + filter bar — mirrors stats-row → CategoryTabs pattern of Maintenance/Chores */}
      <div style={{ flexShrink: 0, padding: "2rem 2rem 0" }}>

        {/* Month nav — plays the same role as the stats/actions row on other pages */}
        <div style={{ alignItems: "center", display: "flex", marginBottom: "1.25rem", minHeight: "36px" }}>
          <button
            style={navBtnStyle(atYearStart)} onClick={prevMonth}
            onMouseEnter={e => { if (!atYearStart) e.currentTarget.style.color = "#c9a96e"; }}
            onMouseLeave={e => { if (!atYearStart) e.currentTarget.style.color = "#8b7d6b"; }}
          >‹</button>
          <span style={{ color: "#e8e4dd", fontFamily: "'Georgia','Times New Roman',serif", fontSize: "1.05rem", letterSpacing: "0.02em", minWidth: "11rem", textAlign: "center" }}>
            {CAL_MONTHS[view.m]} {view.y}
          </span>
          <button
            style={navBtnStyle(atYearEnd)} onClick={nextMonth}
            onMouseEnter={e => { if (!atYearEnd) e.currentTarget.style.color = "#c9a96e"; }}
            onMouseLeave={e => { if (!atYearEnd) e.currentTarget.style.color = "#8b7d6b"; }}
          >›</button>
          <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem", marginLeft: "1rem" }}>{CURRENT_YEAR}</span>
        </div>

        <CategoryTabs
          special={["All"]}
          groups={[
            ...(choreRooms.length > 0     ? [{ type: "room",        label: "Rooms",       tabs: choreRooms      }] : []),
            ...(maintenanceCats.length > 0 ? [{ type: "maintenance", label: "Maintenance", tabs: maintenanceCats }] : []),
          ]}
          active={activeFilter}
          onSelect={setActiveFilter}
        />
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Calendar area */}
        <div style={{ display: "flex", flex: 1, flexDirection: "column", overflow: "hidden", padding: "0 1.25rem 0.75rem" }}>

          {/* DOW headers */}
          <div style={{ display: "grid", flexShrink: 0, gap: "2px", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "2px" }}>
            {CAL_DOWS.map(d => (
              <div key={d} style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.68rem", letterSpacing: "0.06em", padding: "0.15rem 0.4rem", textAlign: "center" }}>{d}</div>
            ))}
          </div>

          {/* Grid — fills remaining height */}
          <div style={{ display: "grid", flex: 1, gap: "2px", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: `repeat(${numRows}, 1fr)`, overflow: "hidden" }}>
            {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day           = i + 1;
              const isToday       = view.y === todayYear && view.m === todayMonth && day === todayDay;
              const isDaySelected = day === selectedDay;
              const dayEvents     = eventsByDay[day] ?? [];
              const visible       = dayEvents.slice(0, MAX_CHIPS);
              const overflow      = dayEvents.length - visible.length;
              const awaitingDate  = !!selectedTaskKey;

              return (
                <div
                  key={day}
                  onClick={() => handleCellClick(day)}
                  style={{
                    background: isDaySelected ? "#1a1f2e" : "transparent",
                    border: `1px solid ${isDaySelected ? "#c9a96e30" : "#1e2330"}`,
                    borderRadius: "3px", cursor: "pointer", overflow: "hidden",
                    padding: "3px 4px 2px", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!isDaySelected) e.currentTarget.style.background = awaitingDate ? "#c9a96e0a" : "#13161f"; }}
                  onMouseLeave={e => { if (!isDaySelected) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Date number */}
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "2px" }}>
                    <div
                      onClick={e => { e.stopPropagation(); setSelectedDay(prev => prev === day ? null : day); }}
                      style={{
                        alignItems: "center",
                        background: isToday ? "#c9a96e" : "transparent",
                        border: !isToday && isDaySelected ? "1px solid #c9a96e" : "1px solid transparent",
                        borderRadius: "50%", color: isToday ? "#0f1117" : isDaySelected ? "#c9a96e" : "#8b7d6b",
                        cursor: "pointer", display: "flex", fontFamily: "monospace", fontSize: "0.7rem",
                        height: "20px", justifyContent: "center", width: "20px",
                      }}
                    >{day}</div>
                  </div>

                  {/* Event chips */}
                  {visible.map((evt, idx) => {
                    const color = evt.type === "chore"
                      ? getScheduleColor(evt.chore.schedule)
                      : getScheduleColor(evt.row.schedule);
                    const label = evt.type === "chore"
                      ? evt.chore.title
                      : `${evt.row.item} › ${evt.row.task}`;
                    const clickable = evt.type === "chore";
                    return (
                      <div
                        key={idx}
                        onClick={clickable ? e => { e.stopPropagation(); setDetailEvent({ chore: evt.chore, date: evt.date }); } : undefined}
                        style={{ alignItems: "baseline", borderRadius: "2px", cursor: clickable ? "pointer" : "default", display: "flex", gap: "3px", marginBottom: "2px", overflow: "hidden", padding: "0 1px" }}
                        onMouseEnter={clickable ? e => e.currentTarget.style.background = "#ffffff08" : undefined}
                        onMouseLeave={clickable ? e => e.currentTarget.style.background = "transparent" : undefined}
                      >
                        <span style={{ background: color, borderRadius: "50%", display: "inline-block", flexShrink: 0, height: "6px", marginTop: "2px", opacity: evt.isCompleted ? 0.4 : 1, width: "6px" }} />
                        <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.6rem", opacity: evt.isCompleted ? 0.45 : 1, overflow: "hidden", textDecoration: evt.isCompleted ? "line-through" : "none", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.56rem", padding: "0 2px" }}>+{overflow} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ borderLeft: "1px solid #1e2330", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden", width: "300px" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>

            {/* Start-date-setting prompt */}
            {selectedTaskKey && selectedTaskRow && (
              <div style={{ background: "#c9a96e10", border: "1px solid #c9a96e30", borderRadius: "4px", marginBottom: "1rem", padding: "0.75rem" }}>
                <div style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.1em", marginBottom: "0.3rem", textTransform: "uppercase" }}>Set Start Date</div>
                <div style={{ color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.72rem", marginBottom: "0.4rem" }}>{selectedTaskRow.item} › {selectedTaskRow.task}</div>
                <div style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.68rem", marginBottom: "0.5rem" }}>Click a date on the calendar.</div>
                <button
                  onClick={() => setSelectedTaskKey(null)}
                  style={{ background: "transparent", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.63rem", padding: 0, transition: "color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                  onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
                >× cancel</button>
              </div>
            )}

            {selectedDay ? (
              /* Day detail view */
              <>
                <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.1em", marginBottom: "0.75rem", textTransform: "uppercase" }}>{selectedDayLabel}</div>
                {selectedDayEvents.length === 0 ? (
                  <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem", margin: 0 }}>No events scheduled.</p>
                ) : (
                  <>
                    {/* Chores section */}
                    {selectedDayEvents.some(e => e.type === "chore") && (
                      <>
                        <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.1em", marginBottom: "0.4rem", textTransform: "uppercase" }}>Chores</div>
                        {selectedDayEvents.filter(e => e.type === "chore").map((evt, idx) => (
                          <div
                            key={idx}
                            onClick={() => setDetailEvent({ chore: evt.chore, date: evt.date })}
                            style={{ alignItems: "flex-start", borderBottom: "1px solid #1e2330", cursor: "pointer", display: "flex", gap: "0.5rem", marginBottom: "0.5rem", opacity: evt.isCompleted ? 0.5 : 1, paddingBottom: "0.5rem", transition: "opacity 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#ffffff05"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <span style={{ background: getScheduleColor(evt.chore.schedule), borderRadius: "50%", display: "inline-block", flexShrink: 0, height: "7px", marginTop: "4px", width: "7px" }} />
                            <div>
                              <div style={{ color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.75rem", textDecoration: evt.isCompleted ? "line-through" : "none" }}>{evt.chore.title}</div>
                              <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.63rem" }}>
                                {evt.chore.room}{evt.chore.timeOfDay && ` · ${formatTimeOfDay(evt.chore.timeOfDay)}`}{evt.chore.assignee && ` · ${evt.chore.assignee}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {/* Maintenance section */}
                    {selectedDayEvents.some(e => e.type === "maintenance") && (
                      <>
                        <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.1em", marginBottom: "0.4rem", marginTop: "0.5rem", textTransform: "uppercase" }}>Maintenance</div>
                        {selectedDayEvents.filter(e => e.type === "maintenance").map((evt, idx) => (
                          <div key={idx} style={{ alignItems: "flex-start", borderBottom: "1px solid #1e2330", display: "flex", gap: "0.5rem", marginBottom: "0.5rem", opacity: evt.isCompleted ? 0.45 : 1, paddingBottom: "0.5rem" }}>
                            <span style={{ background: getScheduleColor(evt.row.schedule), borderRadius: "50%", display: "inline-block", flexShrink: 0, height: "7px", marginTop: "4px", width: "7px" }} />
                            <div>
                              <div style={{ color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.75rem", textDecoration: evt.isCompleted ? "line-through" : "none" }}>{evt.row.item} › {evt.row.task}</div>
                              <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.63rem" }}>{evt.row.category} · {evt.row.schedule}</div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}
                <button onClick={() => setSelectedDay(null)} style={{ background: "transparent", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.63rem", marginTop: "0.25rem", padding: 0, transition: "color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "#8b7d6b"} onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}>× clear selection</button>
              </>
            ) : (
              /* Default: upcoming + unscheduled */
              <>
                <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.1em", marginBottom: "0.65rem", textTransform: "uppercase" }}>Upcoming</div>
                {globalUpcoming.length === 0 ? (
                  <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem", margin: "0 0 1.5rem" }}>No scheduled events. Set start dates below.</p>
                ) : globalUpcoming.map(({ date, label, color, meta }, idx) => {
                  const prev = globalUpcoming[idx - 1];
                  const isNewDay = idx === 0 || prev.date.toDateString() !== date.toDateString();
                  return (
                    <div key={`${label}-${date.toISOString()}`}>
                      {isNewDay && (
                        <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.06em", marginBottom: "0.25rem", marginTop: idx > 0 ? "0.75rem" : 0 }}>
                          {CAL_DOWS_LONG[date.getDay()]}, {CAL_MONTHS_SHORT[date.getMonth()]} {date.getDate()}
                        </div>
                      )}
                      <div style={{ alignItems: "baseline", display: "flex", gap: "0.4rem", marginBottom: "0.25rem", paddingLeft: "0.2rem" }}>
                        <span style={{ background: color, borderRadius: "50%", display: "inline-block", flexShrink: 0, height: "6px", marginTop: "2px", width: "6px" }} />
                        <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.7rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                        <span style={{ color: "#a8a29c", flexShrink: 0, fontFamily: "monospace", fontSize: "0.6rem" }}>{meta}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Unscheduled maintenance — tasks needing a start date */}
                {unscheduledMaintenance.length > 0 && (
                  <>
                    <div style={{ borderTop: "1px solid #1e2330", color: "#a8a29c", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.1em", marginBottom: "0.5rem", marginTop: "1.25rem", paddingTop: "0.85rem", textTransform: "uppercase" }}>
                      To Schedule ({unscheduledMaintenance.length})
                    </div>
                    <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem", marginBottom: "0.6rem" }}>
                      Select a task, then click a date to anchor its schedule.
                    </div>
                    {unscheduledMaintenance.map(row => {
                      const key      = maintenanceKey(row);
                      const isActive = selectedTaskKey === key;
                      return (
                        <div
                          key={key}
                          onClick={() => setSelectedTaskKey(prev => prev === key ? null : key)}
                          style={{
                            background: isActive ? "#c9a96e14" : "transparent",
                            border: `1px solid ${isActive ? "#c9a96e40" : "transparent"}`,
                            borderRadius: "3px", cursor: "pointer",
                            marginBottom: "0.3rem", padding: "0.3rem 0.4rem", transition: "all 0.1s",
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#13161f"; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                        >
                          <div style={{ color: isActive ? "#c9a96e" : "#8b7d6b", fontFamily: "monospace", fontSize: "0.7rem" }}>{row.item} › {row.task}</div>
                          <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.6rem" }}>{row.category} · {row.schedule}</div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
