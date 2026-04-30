import { useState } from "react";
import data from "./data/maintenance.json";
import CategoryTabs from "./components/CategoryTabs.jsx";
import MaintenanceTable from "./components/MaintenanceTable.jsx";
import Legend from "./components/Legend.jsx";
import { computeNextDate } from "./lib/scheduleInterval.js";
import { getScheduleColor } from "./lib/scheduleColor.js";
import { getEffectiveRowState, unmuteRow } from "./lib/inventory.js";

const CATEGORIES = ["All", ...Array.from(new Set(data.map(d => d.category)))];

const rowDataByKey = Object.fromEntries(
  data.map(row => [
    `${row.category}|${row.item}|${row.type}`,
    { schedule: row.schedule, season: row.season ?? null },
  ])
);

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

export default function HomeMaintenanceTable({ inventory, onInventoryChange, onNavigate }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [activeFrequencies, setActiveFrequencies] = useState(new Set());
  const [activeSeasons, setActiveSeasons] = useState(new Set());
  const [navHovered, setNavHovered] = useState(false);

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

  function handleDateChange(key, date) {
    setCompletedDates(prev => {
      const next = { ...prev, [key]: date };
      saveDates("maintenance-dates", next);
      return next;
    });

    if (followSchedule[key]) {
      const { schedule, season } = rowDataByKey[key];
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
      const { schedule, season } = rowDataByKey[key];
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

  function handleUnmute(row) {
    onInventoryChange(unmuteRow(inventory, row));
  }

  const filtered = data.filter(row => {
    if (getEffectiveRowState(inventory, row) === "excluded") return false;
    const matchCat = activeCategory === "All" || row.category === activeCategory;
    const matchFreq = activeFrequencies.size === 0 || activeFrequencies.has(getScheduleColor(row.schedule));
    const matchSeason = activeSeasons.size === 0 || (row.season && activeSeasons.has(row.season));
    const q = search.toLowerCase();
    const matchSearch = !q ||
      row.category.toLowerCase().includes(q) ||
      row.item.toLowerCase().includes(q) ||
      row.type.toLowerCase().includes(q) ||
      row.schedule.toLowerCase().includes(q);
    return matchCat && matchFreq && matchSeason && matchSearch;
  });

  const rowStates = Object.fromEntries(
    filtered.map(row => [
      `${row.category}|${row.item}|${row.type}`,
      getEffectiveRowState(inventory, row),
    ])
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f1117",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#e8e0d0",
      padding: "0",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 60%)",
        borderBottom: "1px solid #2a2f3e",
        padding: "2rem 2rem 2rem",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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
              <div style={{ marginBottom: "0.6rem" }}>
                <span style={{ color: "#8b7d6b", display: "block", fontFamily: "monospace", fontSize: "0.7rem", letterSpacing: "0.25em", textTransform: "uppercase" }}>
                  THE COMPLETE
                </span>
                <span style={{ color: "#c9a96e", fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: "clamp(0.95rem, 2vw, 1.15rem)", letterSpacing: "0.01em" }}>
                  Home Maintenance Registry
                </span>
              </div>
            </div>
            <button
              onClick={onNavigate}
              onMouseEnter={() => setNavHovered(true)}
              onMouseLeave={() => setNavHovered(false)}
              style={{
                background: "transparent",
                border: `1px solid ${navHovered ? "#c9a96e" : "#2e3448"}`,
                borderRadius: "3px",
                color: navHovered ? "#c9a96e" : "#8b7d6b",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: "0.72rem",
                letterSpacing: "0.08em",
                padding: "0.4rem 0.9rem",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              ← Inventory
            </button>
          </div>
          <p style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.85rem", margin: "0 0 1.5rem" }}>
            {data.length} maintenance items across {CATEGORIES.length - 1} categories
          </p>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
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
                padding: "0.5rem 0.85rem",
                width: "260px",
                fontFamily: "monospace",
                outline: "none",
              }}
            />
            <span style={{ color: "#5a5460", fontSize: "0.78rem", fontFamily: "monospace" }}>
              {filtered.length} results
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem 2rem 4rem" }}>
        <CategoryTabs categories={CATEGORIES} active={activeCategory} onSelect={setActiveCategory} />
        <Legend
          activeColors={activeFrequencies}
          onToggle={handleToggleFrequency}
          activeSeasons={activeSeasons}
          onToggleSeason={handleToggleSeason}
        />
        <MaintenanceTable
          rows={filtered}
          completedDates={completedDates}
          onDateChange={handleDateChange}
          nextDates={nextDates}
          onNextDateChange={handleNextDateChange}
          followSchedule={followSchedule}
          onToggleFollow={handleToggleFollow}
          notes={notes}
          onNoteChange={handleNoteChange}
          rowStates={rowStates}
          onUnmute={handleUnmute}
        />
      </div>
    </div>
  );
}
