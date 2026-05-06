import { useState, useRef, useEffect, useMemo } from "react";
import PageNav from "./components/PageNav.jsx";
import { loadData, loadCustomData, saveCustomData, loadOverrides, saveOverrides, defaultData } from "./lib/data.js";
import CategoryTabs from "./components/CategoryTabs.jsx";
import MaintenanceTable from "./components/MaintenanceTable.jsx";
import Legend from "./components/Legend.jsx";
import ReminderSettings from "./components/ReminderSettings.jsx";
import {
  loadReminderModes, saveReminderModes,
  REMINDER_MODES, syncReminders,
} from "./lib/reminders.js";
import { computeNextDate, parseMonths } from "./lib/scheduleInterval.js";
import { getScheduleColor } from "./lib/scheduleColor.js";
import { getEffectiveRowState, unmuteRow } from "./lib/inventory.js";
import { loadDeletedRows, saveDeletedRows } from "./lib/deletedRows.js";
import { loadDeletedCategories } from "./lib/deletedCategories.js";
import { loadDeletedItems } from "./lib/deletedItems.js";
import { GROUP_ORDER, GROUP_LABELS, loadCategoryTypeOverrides } from "./lib/categoryTypes.js";

const DEFAULT_CAT_SET = new Set(defaultData.map(d => d.category));
const CATEGORY_TABS = ["All", "User", "Hidden", ...Array.from(new Set(defaultData.map(d => d.category)))];
const DEFAULT_CAT_ORDER = Array.from(new Set(defaultData.map(r => r.category)));

function loadDates(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "{}");
    return Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, new Date(v)])
    );
  } catch {
    return {};
  }
}

function saveDates(key, dates) {
  localStorage.setItem(key, JSON.stringify(
    Object.fromEntries(
      Object.entries(dates).map(([k, v]) => [k, v.toISOString()])
    )
  ));
}

export default function HomeMaintenanceTable({ inventory, onInventoryChange, navigate }) {
  const [rows, setRows] = useState(() => loadData());
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [activeFrequencies, setActiveFrequencies] = useState(new Set());
  const [activeSeasons, setActiveSeasons] = useState(new Set());
  const [navHoveredTop, setNavHoveredTop] = useState(null);
  const [navHoveredBottom, setNavHoveredBottom] = useState(null);
  const [addRowHovered, setAddRowHovered] = useState(false);
  const [sortCols, setSortCols] = useState([]);
  const [deletedRows, setDeletedRows] = useState(() => loadDeletedRows());
  const [deletedCategories] = useState(() => loadDeletedCategories());
  const [deletedItems] = useState(() => loadDeletedItems());
  const [categoryTypeOverrides] = useState(() => loadCategoryTypeOverrides());
  const pageHeaderRef = useRef(null);
  const [pageHeaderHeight, setPageHeaderHeight] = useState(0);

  useEffect(() => {
    const el = pageHeaderRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => setPageHeaderHeight(entry.contentRect.height));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const categoryGroups = useMemo(() => {
    // Scan ALL rows (including blank sentinels) so custom categories pick up
    // the categoryType stored on their sentinel row.
    const catTypeMap = {};
    rows.forEach(row => {
      if (!row.category) return;
      if (deletedCategories.has(row.category)) return;
      if (!catTypeMap[row.category] && row.categoryType) {
        catTypeMap[row.category] = row.categoryType;
      }
    });

    // Only show categories that have at least one real (non-sentinel) row.
    const catsWithContent = new Set();
    rows.forEach(row => {
      if (!row.category || row._isBlankCategory) return;
      if (deletedCategories.has(row.category)) return;
      catsWithContent.add(row.category);
    });

    return GROUP_ORDER.map(type => ({
      type,
      label: GROUP_LABELS[type],
      tabs: Array.from(catsWithContent)
        .filter(cat => (categoryTypeOverrides[cat] ?? catTypeMap[cat] ?? "general") === type)
        .sort((a, b) => {
          const aDefault = DEFAULT_CAT_SET.has(a);
          const bDefault = DEFAULT_CAT_SET.has(b);
          if (aDefault !== bDefault) return aDefault ? -1 : 1;
          if (aDefault) return DEFAULT_CAT_ORDER.indexOf(a) - DEFAULT_CAT_ORDER.indexOf(b);
          return a.localeCompare(b);
        }),
    }));
  }, [rows, deletedCategories, categoryTypeOverrides]);

  const rowDataByKey = useMemo(() => Object.fromEntries(
    rows.map(row => [
      `${row.category}|${row.item}|${row.task}`,
      { schedule: row.schedule, season: row.season ?? null },
    ])
  ), [rows]);

  function handleToggleFrequency(color) {
    setActiveFrequencies(prev => {
      const next = new Set(prev);
      next.has(color) ? next.delete(color) : next.add(color);
      return next;
    });
  }

  function handleNoteChange(key, text) {
    setNotes(prev => {
      const next = { ...prev, [key]: text };
      localStorage.setItem("maintenance-notes", JSON.stringify(next));
      return next;
    });
  }

  function handleToggleSeason(season) {
    setActiveSeasons(prev => {
      const next = new Set(prev);
      next.has(season) ? next.delete(season) : next.add(season);
      return next;
    });
  }

  const [completedDates, setCompletedDates] = useState(() => loadDates("maintenance-dates"));
  const [nextDates, setNextDates] = useState(() => loadDates("maintenance-next-dates"));
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("maintenance-notes") || "{}"); }
    catch { return {}; }
  });
  const [followSchedule, setFollowSchedule] = useState(() => {
    try { return JSON.parse(localStorage.getItem("maintenance-follow") || "{}"); }
    catch { return {}; }
  });
  const [reminderModes, setReminderModes] = useState(() => loadReminderModes());
  const [remindersOpen, setRemindersOpen] = useState(false);

  function handleCycleReminderMode(key) {
    setReminderModes(prev => {
      const cur = REMINDER_MODES.includes(prev[key]) ? prev[key] : "off";
      const nextIdx = (REMINDER_MODES.indexOf(cur) + 1) % REMINDER_MODES.length;
      const next = { ...prev, [key]: REMINDER_MODES[nextIdx] };
      saveReminderModes(next);
      return next;
    });
  }

  async function handleSyncReminders() {
    return syncReminders({ rows, nextDates, modes: reminderModes });
  }

  function handleAddRow() {
    const newRow = {
      _id: `custom-${Date.now()}`,
      _isCustom: true,
      _defaultKey: null,
      category: "",
      item: "",
      task: "",
      schedule: "",
      season: null,
    };
    const customs = loadCustomData();
    saveCustomData([newRow, ...customs]);
    setRows(prev => [newRow, ...prev]);
  }

  function handleRowEdit(rowId, field, value) {
    setRows(prev => {
      const updated = prev.map(r => r._id === rowId ? { ...r, [field]: value } : r);
      const row = updated.find(r => r._id === rowId);
      if (row._isCustom) {
        const customs = updated.filter(r => r._isCustom);
        saveCustomData(customs);
      } else {
        const overrides = loadOverrides();
        const { _id, _isCustom, _defaultKey, ...fields } = row;
        overrides[_defaultKey] = fields;
        saveOverrides(overrides);
      }
      return updated;
    });
  }

  function handleDateChange(key, date) {
    setCompletedDates(prev => {
      const next = { ...prev, [key]: date };
      saveDates("maintenance-dates", next);
      return next;
    });

    if (followSchedule[key]) {
      const entry = rowDataByKey[key];
      if (entry) {
        const { schedule, season } = entry;
        const computed = computeNextDate(date ?? new Date(), schedule, season);
        if (computed) {
          setNextDates(prev => {
            const next = { ...prev, [key]: computed };
            saveDates("maintenance-next-dates", next);
            return next;
          });
        }
      }
    }
  }

  function handleNextDateChange(key, date) {
    if (followSchedule[key]) {
      setFollowSchedule(prev => {
        const next = { ...prev, [key]: false };
        localStorage.setItem("maintenance-follow", JSON.stringify(next));
        return next;
      });
    }
    setNextDates(prev => {
      const next = { ...prev, [key]: date };
      saveDates("maintenance-next-dates", next);
      return next;
    });
  }

  function handleToggleFollow(key) {
    const turningOn = !followSchedule[key];
    setFollowSchedule(prev => {
      const next = { ...prev, [key]: turningOn };
      localStorage.setItem("maintenance-follow", JSON.stringify(next));
      return next;
    });

    if (turningOn) {
      const base = completedDates[key] ?? new Date();
      const entry = rowDataByKey[key];
      if (entry) {
        const { schedule, season } = entry;
        const computed = computeNextDate(base, schedule, season);
        if (computed) {
          setNextDates(prev => {
            const next = { ...prev, [key]: computed };
            saveDates("maintenance-next-dates", next);
            return next;
          });
        }
      }
    }
  }

  function handleUnmute(row) {
    onInventoryChange(unmuteRow(inventory, row));
  }

  function handleDeleteRow(row) {
    const key = `${row.category}|${row.item}|${row.task}`;
    if (row._isCustom) {
      setRows(prev => {
        const updated = prev.filter(r => r._id !== row._id);
        saveCustomData(updated.filter(r => r._isCustom));
        return updated;
      });
    } else {
      setDeletedRows(prev => {
        const next = new Set(prev);
        next.add(key);
        saveDeletedRows(next);
        return next;
      });
    }
  }

  function handleHeaderClick(col, shiftKey) {
    setSortCols(prev => {
      if (!shiftKey || prev.length === 0) {
        const isPrimary = prev[0]?.col === col;
        return [{ col, dir: isPrimary && prev[0].dir === "asc" ? "desc" : "asc" }];
      }
      const primary = prev[0];
      if (primary?.col === col) return prev;
      const existing = prev[1]?.col === col ? prev[1] : null;
      return [primary, { col, dir: existing ? (existing.dir === "asc" ? "desc" : "asc") : "asc" }];
    });
  }

  function getSortValue(row, col) {
    const key = `${row.category}|${row.item}|${row.task}`;
    switch (col) {
      case "category":     return (row.category || "").toLowerCase();
      case "item":         return (row.item || "").toLowerCase();
      case "task":         return (row.task || "").toLowerCase();
      case "schedule":     return parseMonths(row.schedule || "");
      case "season":       return row.season || "";
      case "lastCompleted": return completedDates[key] ?? null;
      case "nextDate":     return nextDates[key] ?? null;
      case "notes":        return (notes[key] || "").toLowerCase();
      default:             return "";
    }
  }

  function compareSortValues(av, bv, col, dir) {
    const aEmpty = av === null || av === undefined || av === "";
    const bEmpty = bv === null || bv === undefined || bv === "";
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return -1;
    if (bEmpty) return 1;
    let raw;
    if (col === "schedule") raw = av - bv;
    else if (col === "lastCompleted" || col === "nextDate") raw = av.getTime() - bv.getTime();
    else raw = av.localeCompare(bv);
    return dir === "asc" ? raw : -raw;
  }

  const isNext30View = activeCategory === "Next 30 Days";

  const filtered = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today); in30Days.setDate(in30Days.getDate() + 30);

    const base = rows.filter(row => {
      const key = `${row.category}|${row.item}|${row.task}`;

      if (isNext30View) {
        if (row._isBlankCategory) return false;
        if (deletedCategories.has(row.category)) return false;
        if (deletedItems.has(`${row.category}|${row.item}`)) return false;
        if (getEffectiveRowState(inventory, row) === "excluded") return false;
        if (deletedRows.has(key)) return false;
        const nd = nextDates[key];
        return nd && nd >= today && nd <= in30Days;
      }

      if (row._isBlankCategory) {
        if (activeCategory !== "User") return false;
        const q = search.toLowerCase();
        return !q || (row.category || "").toLowerCase().includes(q);
      }
      if (deletedCategories.has(row.category)) return false;
      if (deletedItems.has(`${row.category}|${row.item}`)) return false;
      if (getEffectiveRowState(inventory, row) === "excluded") return false;
      if (deletedRows.has(key)) return false;

      let matchCat;
      if (activeCategory === "All") {
        matchCat = true;
      } else if (activeCategory === "User") {
        matchCat = row._isCustom && row.category && !DEFAULT_CAT_SET.has(row.category);
      } else {
        matchCat = row.category === activeCategory;
      }

      const matchFreq = activeFrequencies.size === 0 || activeFrequencies.has(getScheduleColor(row.schedule));
      const matchSeason = activeSeasons.size === 0 || (row.season && activeSeasons.has(row.season));
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (row.category || "").toLowerCase().includes(q) ||
        (row.item || "").toLowerCase().includes(q) ||
        (row.task || "").toLowerCase().includes(q) ||
        (row.schedule || "").toLowerCase().includes(q);
      return matchCat && matchFreq && matchSeason && matchSearch;
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

    return base.sort((a, b) => {
      const rank = r => r.category === "" ? -1 : (DEFAULT_CAT_ORDER.indexOf(r.category) === -1 ? Infinity : DEFAULT_CAT_ORDER.indexOf(r.category));
      const aRank = rank(a);
      const bRank = rank(b);
      if (aRank !== bRank) return aRank - bRank;
      if (a._isCustom !== b._isCustom) return a._isCustom ? -1 : 1;
      return 0;
    });
  }, [rows, activeCategory, isNext30View, activeFrequencies, activeSeasons, search, inventory, deletedRows, deletedCategories, deletedItems, sortCols, completedDates, nextDates, notes]);

  const rowStates = useMemo(() => Object.fromEntries(
    filtered.map(row => [
      `${row.category}|${row.item}|${row.task}`,
      getEffectiveRowState(inventory, row),
    ])
  ), [filtered, inventory]);


  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f1117",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#e8e0d0",
      padding: "0",
    }}>
      <div ref={pageHeaderRef} style={{
        background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 60%)",
        borderBottom: "1px solid #2a2f3e",
        padding: "2rem 2rem 2rem",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h1 style={{
                color: "#f0e6d3",
                fontSize: "clamp(2rem, 5vw, 3rem)",
                fontWeight: "normal",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                margin: "0 0 0.5rem",
              }}>
                Foreman
              </h1>
              <div>
                <span style={{ color: "#8b7d6b", display: "block", fontFamily: "monospace", fontSize: "0.7rem", letterSpacing: "0.25em", textTransform: "uppercase" }}>
                  THE COMPLETE
                </span>
                <span style={{ color: "#c9a96e", fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: "clamp(0.95rem, 2vw, 1.15rem)", letterSpacing: "0.01em" }}>
                  Home Maintenance Registry
                </span>
              </div>
            </div>
            <PageNav currentPage="maintenance" navigate={navigate} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem 2rem 4rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1.25rem" }}>
          <p style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.85rem", margin: 0 }}>
            {defaultData.length} maintenance items across {CATEGORY_TABS.filter(t => t !== "All" && t !== "User" && t !== "Hidden" && !deletedCategories.has(t)).length} categories
          </p>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items, types, schedules…"
            style={{
              background: "#1a1f2e",
              border: "1px solid #2e3448",
              borderRadius: "4px",
              color: "#e8e0d0",
              fontSize: "0.82rem",
              marginLeft: "auto",
              padding: "0.5rem 0.85rem",
              width: "260px",
              fontFamily: "monospace",
              outline: "none",
            }}
          />
          <span style={{ color: "#5a5460", fontSize: "0.78rem", fontFamily: "monospace" }}>
            {filtered.length} results
          </span>
          <button
            onClick={handleAddRow}
            onMouseEnter={() => setAddRowHovered(true)}
            onMouseLeave={() => setAddRowHovered(false)}
            style={{
              background: "transparent",
              border: `1px solid ${addRowHovered ? "#c9a96e" : "#2e3448"}`,
              borderRadius: "3px",
              color: addRowHovered ? "#c9a96e" : "#8b7d6b",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              padding: "0.4rem 0.9rem",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            + ADD TASK
          </button>
          <button
            onClick={() => setRemindersOpen(true)}
            className="foreman-reminders-header-btn"
            style={{
              background: "transparent",
              border: "1px solid #2e3448",
              borderRadius: "3px",
              color: "#8b7d6b",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              padding: "0.4rem 0.9rem",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#c9a96e"; e.currentTarget.style.color = "#c9a96e"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2e3448"; e.currentTarget.style.color = "#8b7d6b"; }}
          >
            REMINDERS
          </button>
        </div>
        <CategoryTabs
          special={["All", "User", "Next 30 Days"]}
          groups={categoryGroups}
          active={activeCategory}
          onSelect={setActiveCategory}
        />
        <Legend
          activeColors={activeFrequencies}
          onToggle={handleToggleFrequency}
          activeSeasons={activeSeasons}
          onToggleSeason={handleToggleSeason}
        />
        <MaintenanceTable
          rows={filtered}
          allRows={rows}
          completedDates={completedDates}
          onDateChange={handleDateChange}
          nextDates={nextDates}
          onNextDateChange={handleNextDateChange}
          followSchedule={followSchedule}
          onToggleFollow={handleToggleFollow}
          reminderModes={reminderModes}
          onCycleReminderMode={handleCycleReminderMode}
          notes={notes}
          onNoteChange={handleNoteChange}
          rowStates={rowStates}
          onUnmute={handleUnmute}
          onRowEdit={handleRowEdit}
          onDeleteRow={handleDeleteRow}
          sortCols={sortCols}
          onHeaderClick={handleHeaderClick}
          stickyTop={pageHeaderHeight}
        />
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
