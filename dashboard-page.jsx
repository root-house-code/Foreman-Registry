import { useState, useMemo } from "react";
import PageNav from "./components/PageNav.jsx";
import { loadTodos } from "./lib/todos.js";
import { loadProjects } from "./lib/projects.js";
import { loadData } from "./lib/data.js";
import { loadDeletedCategories } from "./lib/deletedCategories.js";
import { loadDeletedItems } from "./lib/deletedItems.js";
import {
  loadChores, loadChoreNextDates, loadChoreCompletedDates,
  computeNextOccurrenceFromStart,
} from "./lib/chores.js";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function keyOf(row) {
  return `${row.category}|${row.item}|${row.task}`;
}

const card = {
  background: "#0f1117",
  border: "1px solid #1e2330",
  borderRadius: "6px",
  padding: "1.25rem 1.5rem",
};

const sectionHeader = {
  alignItems: "center",
  borderBottom: "1px solid #1e2330",
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "0.75rem",
  paddingBottom: "0.5rem",
};

const sectionTitle = {
  color: "#8b7d6b",
  fontFamily: "monospace",
  fontSize: "0.6rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const navLink = {
  background: "transparent",
  border: "none",
  color: "#4a4458",
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: "0.6rem",
  letterSpacing: "0.08em",
  padding: 0,
};

const emptyText = {
  color: "#2e3448",
  fontFamily: "monospace",
  fontSize: "0.72rem",
  padding: "0.5rem 0",
};

const rowStyle = {
  borderBottom: "1px solid #1a1d26",
  color: "#6a6478",
  display: "flex",
  fontFamily: "monospace",
  fontSize: "0.72rem",
  gap: "0.5rem",
  padding: "0.4rem 0",
};

export default function DashboardPage({ navigate }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const in7Days = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d;
  }, [today]);

  const in30Days = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    return d;
  }, [today]);

  // ── Maintenance data ──────────────────────────────────────────────────────
  const rows               = useMemo(() => loadData(), []);
  const deletedCategories  = useMemo(() => loadDeletedCategories(), []);
  const deletedItems       = useMemo(() => loadDeletedItems(), []);
  const nextDatesMap       = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("maintenance-next-dates") || "{}"); }
    catch { return {}; }
  }, []);
  const completedDatesMap  = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("maintenance-dates") || "{}"); }
    catch { return {}; }
  }, []);

  // ── Chores data ───────────────────────────────────────────────────────────
  const chores              = useMemo(() => loadChores(), []);
  const choreNextDates      = useMemo(() => loadChoreNextDates(), []);
  const choreCompletedDates = useMemo(() => loadChoreCompletedDates(), []);

  // ── Todos / projects data ─────────────────────────────────────────────────
  const todos    = useMemo(() => loadTodos(), []);
  const projects = useMemo(() => loadProjects(), []);

  // ── Derived: maintenance ──────────────────────────────────────────────────
  const activeRows = useMemo(() =>
    rows.filter(row =>
      !row._isBlankCategory && row.category && row.item && row.task &&
      !deletedCategories.has(row.category) &&
      !deletedItems.has(`${row.category}|${row.item}`)
    ),
    [rows, deletedCategories, deletedItems]
  );

  const overdueItems = useMemo(() =>
    activeRows
      .filter(row => { const d = nextDatesMap[keyOf(row)]; return d && new Date(d) < today; })
      .sort((a, b) => new Date(nextDatesMap[keyOf(a)]) - new Date(nextDatesMap[keyOf(b)])),
    [activeRows, nextDatesMap, today]
  );

  const upcomingItems = useMemo(() =>
    activeRows
      .filter(row => {
        const d = nextDatesMap[keyOf(row)];
        if (!d) return false;
        const date = new Date(d);
        return date >= today && date <= in30Days;
      })
      .sort((a, b) => new Date(nextDatesMap[keyOf(a)]) - new Date(nextDatesMap[keyOf(b)])),
    [activeRows, nextDatesMap, today, in30Days]
  );

  // ── Derived: chores ───────────────────────────────────────────────────────
  function choreNextDate(c) {
    if (choreNextDates[c.id]) return new Date(choreNextDates[c.id]);
    if (!c.startDate) return null;
    return computeNextOccurrenceFromStart(new Date(c.startDate), c.schedule, c.dayOfWeek, c.timeOfDay);
  }

  const overdueChores = useMemo(() =>
    chores
      .filter(c => { const d = choreNextDate(c); return d && d < today; })
      .sort((a, b) => {
        const dA = choreNextDate(a) ?? new Date(0);
        const dB = choreNextDate(b) ?? new Date(0);
        return dA - dB;
      }),
    [chores, choreNextDates, today]
  );

  const upcomingChores = useMemo(() =>
    chores
      .filter(c => { const d = choreNextDate(c); return d && d >= today && d <= in7Days; })
      .sort((a, b) => {
        const dA = choreNextDate(a) ?? new Date(0);
        const dB = choreNextDate(b) ?? new Date(0);
        return dA - dB;
      }),
    [chores, choreNextDates, today, in7Days]
  );

  // ── Derived: todos / projects ─────────────────────────────────────────────
  const todoStatusCounts = useMemo(() => {
    const counts = { "not-started": 0, "in-progress": 0, "done": 0 };
    todos.forEach(t => { if (counts[t.status] != null) counts[t.status]++; });
    return counts;
  }, [todos]);

  const highPriorityTodos = useMemo(() =>
    todos
      .filter(t => (t.priority === "urgent" || t.priority === "high") && t.status !== "done" && !t._isOverdueChore)
      .sort((a, b) => (a.priority === "urgent" ? -1 : 1)),
    [todos]
  );

  const projectsWithProgress = useMemo(() =>
    projects.map(p => {
      const projectTodos = todos.filter(t => t.projectId === p.id);
      const done = projectTodos.filter(t => t.status === "done").length;
      return { ...p, total: projectTodos.length, done };
    }),
    [projects, todos]
  );

  // ── Completion chart (bug-fixed + chore series) ───────────────────────────
  const completionsByMonth = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - i);
      result.push({ label: MONTH_LABELS[d.getMonth()], year: d.getFullYear(), month: d.getMonth(), maint: 0, chores: 0 });
    }

    // Maintenance completions — stored as single ISO strings (not arrays); handle both
    Object.values(completedDatesMap).forEach(dateOrList => {
      const dates = Array.isArray(dateOrList) ? dateOrList : (dateOrList ? [dateOrList] : []);
      dates.forEach(dateStr => {
        const d = new Date(dateStr);
        const bucket = result.find(b => b.year === d.getFullYear() && b.month === d.getMonth());
        if (bucket) bucket.maint++;
      });
    });

    // Chore completions — stored as single ISO strings per chore ID
    Object.values(choreCompletedDates).forEach(dateStr => {
      if (!dateStr) return;
      const d = new Date(dateStr);
      const bucket = result.find(b => b.year === d.getFullYear() && b.month === d.getMonth());
      if (bucket) bucket.chores++;
    });

    return result;
  }, [completedDatesMap, choreCompletedDates, today]);

  const maxCompletions = useMemo(() =>
    Math.max(...completionsByMonth.map(b => b.maint + b.chores), 1),
    [completionsByMonth]
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  const openTodosCount = todoStatusCounts["not-started"] + todoStatusCounts["in-progress"];
  const totalOverdue   = overdueItems.length + overdueChores.length;

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
  }

  function formatDateFromDate(d) {
    if (!d) return "—";
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
  }

  const PRIORITY_COLORS = {
    low: "#4ade80", medium: "#c9a96e", high: "#f59e0b", urgent: "#f87171",
  };

  // Combined overdue list (maintenance first, then chores), capped at 8
  const combinedOverdue = useMemo(() => {
    const maintRows = overdueItems.map(row => ({
      type: "maint",
      date: nextDatesMap[keyOf(row)] ? new Date(nextDatesMap[keyOf(row)]) : null,
      label: row.task,
      sub: row.category,
    }));
    const choreRows = overdueChores.map(c => ({
      type: "chore",
      date: choreNextDate(c),
      label: c.title,
      sub: c.room,
    }));
    return [...maintRows, ...choreRows]
      .sort((a, b) => (a.date ?? new Date(0)) - (b.date ?? new Date(0)))
      .slice(0, 8);
  }, [overdueItems, overdueChores, nextDatesMap]);

  // Combined due-soon list (maintenance ≤30d + chores ≤7d), sorted by date, capped at 8
  const combinedUpcoming = useMemo(() => {
    const maintRows = upcomingItems.map(row => ({
      type: "maint",
      date: new Date(nextDatesMap[keyOf(row)]),
      label: row.task,
      sub: row.category,
    }));
    const choreRows = upcomingChores.map(c => ({
      type: "chore",
      date: choreNextDate(c),
      label: c.title,
      sub: c.room,
    }));
    return [...maintRows, ...choreRows]
      .sort((a, b) => (a.date ?? new Date(0)) - (b.date ?? new Date(0)))
      .slice(0, 8);
  }, [upcomingItems, upcomingChores, nextDatesMap]);

  const combinedOverdueTotal  = overdueItems.length + overdueChores.length;
  const combinedUpcomingTotal = upcomingItems.length + upcomingChores.length;

  return (
    <div style={{ background: "#0f1117", color: "#d4c9b8", display: "flex", flexDirection: "column", fontFamily: "monospace", height: "100vh", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 60%)", borderBottom: "1px solid #2a2f3e", flexShrink: 0, padding: "2rem", zIndex: 50 }}>
        <div style={{ alignItems: "flex-end", display: "flex", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ color: "#f0e6d3", fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: "normal", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 0.5rem" }}>Foreman</h1>
            <div>
              <span style={{ color: "#8b7d6b", display: "block", fontFamily: "monospace", fontSize: "0.7rem", letterSpacing: "0.25em", textTransform: "uppercase" }}>YOUR HOME AT A GLANCE</span>
              <span style={{ color: "#c9a96e", fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: "clamp(0.95rem, 2vw, 1.15rem)", letterSpacing: "0.01em" }}>Dashboard</span>
            </div>
          </div>
          <PageNav currentPage="dashboard" navigate={navigate} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>

        {/* Stat summary row — Overdue · Upcoming · Chores This Week · Open To Dos */}
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "1.5rem" }}>
          <StatCard
            label="Overdue"
            value={totalOverdue}
            valueColor={totalOverdue > 0 ? "#f87171" : "#4ade80"}
            sub={overdueItems.length > 0 || overdueChores.length > 0
              ? `${overdueItems.length} maint · ${overdueChores.length} chores`
              : "all clear"}
            onClick={() => navigate("maintenance")}
          />
          <StatCard
            label="Upcoming"
            value={upcomingItems.length}
            valueColor="#c9a96e"
            sub="maintenance in 30 days"
            onClick={() => navigate("maintenance")}
          />
          <StatCard
            label="Chores This Week"
            value={upcomingChores.length}
            valueColor={upcomingChores.length > 0 ? "#c9a96e" : "#3a3548"}
            sub="due in 7 days"
            onClick={() => navigate("chores")}
          />
          <StatCard
            label="Open To Dos"
            value={openTodosCount}
            valueColor="#8b7d6b"
            sub={`${todoStatusCounts["in-progress"]} in progress`}
            onClick={() => navigate("board")}
          />
        </div>

        {/* Overdue + Due Soon */}
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr", marginBottom: "1rem" }}>

          {/* Overdue (maintenance + chores) */}
          <div style={card}>
            <div style={sectionHeader}>
              <span style={sectionTitle}>Overdue</span>
              <button style={navLink} onClick={() => navigate("maintenance")}>&rarr; Maintenance</button>
            </div>
            {combinedOverdue.length === 0 ? (
              <div style={emptyText}>All clear</div>
            ) : (
              combinedOverdue.map((item, i) => (
                <div key={i} style={rowStyle}>
                  <span style={{ color: "#f87171", flexShrink: 0, minWidth: "58px" }}>{formatDateFromDate(item.date)}</span>
                  <span style={{ color: "#2e3448", flexShrink: 0, minWidth: "44px" }}>{item.type === "chore" ? "chore" : "maint"}</span>
                  <span style={{ color: "#4a4458", flexShrink: 0, minWidth: "70px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sub}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                </div>
              ))
            )}
            {combinedOverdueTotal > 8 && (
              <div style={{ ...emptyText, marginTop: "0.25rem" }}>+{combinedOverdueTotal - 8} more</div>
            )}
          </div>

          {/* Due Soon (maintenance ≤30d + chores ≤7d) */}
          <div style={card}>
            <div style={sectionHeader}>
              <span style={sectionTitle}>Due Soon</span>
              <button style={navLink} onClick={() => navigate("calendar")}>&rarr; Calendar</button>
            </div>
            {combinedUpcoming.length === 0 ? (
              <div style={emptyText}>Nothing due soon</div>
            ) : (
              combinedUpcoming.map((item, i) => (
                <div key={i} style={rowStyle}>
                  <span style={{ color: "#c9a96e", flexShrink: 0, minWidth: "58px" }}>{formatDateFromDate(item.date)}</span>
                  <span style={{ color: "#2e3448", flexShrink: 0, minWidth: "44px" }}>{item.type === "chore" ? "chore" : "maint"}</span>
                  <span style={{ color: "#4a4458", flexShrink: 0, minWidth: "70px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sub}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                </div>
              ))
            )}
            {combinedUpcomingTotal > 8 && (
              <div style={{ ...emptyText, marginTop: "0.25rem" }}>+{combinedUpcomingTotal - 8} more</div>
            )}
          </div>
        </div>

        {/* To Dos + Projects */}
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr", marginBottom: "1rem" }}>

          {/* To Dos Summary */}
          <div style={card}>
            <div style={sectionHeader}>
              <span style={sectionTitle}>To Dos</span>
              <button style={navLink} onClick={() => navigate("board")}>&rarr; To Dos</button>
            </div>
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.75rem" }}>
              {[
                { label: "Not Started", key: "not-started", color: "#4a4458" },
                { label: "In Progress", key: "in-progress", color: "#c9a96e" },
                { label: "Done",        key: "done",        color: "#4ade80" },
              ].map(s => (
                <div key={s.key} style={{ textAlign: "center" }}>
                  <div style={{ color: s.color, fontFamily: "monospace", fontSize: "1.4rem", fontWeight: 300 }}>
                    {todoStatusCounts[s.key]}
                  </div>
                  <div style={{ color: "#3a3548", fontFamily: "monospace", fontSize: "0.55rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
            {highPriorityTodos.length === 0 ? (
              <div style={emptyText}>No urgent or high priority items</div>
            ) : (
              <>
                <div style={{ color: "#3a3548", fontFamily: "monospace", fontSize: "0.55rem", letterSpacing: "0.1em", marginBottom: "0.4rem", textTransform: "uppercase" }}>
                  High Priority Open
                </div>
                {highPriorityTodos.slice(0, 6).map((t, i) => (
                  <div key={i} style={rowStyle}>
                    <span style={{ color: PRIORITY_COLORS[t.priority], minWidth: "50px" }}>{t.priority}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                  </div>
                ))}
                {highPriorityTodos.length > 6 && (
                  <div style={{ ...emptyText, marginTop: "0.25rem" }}>+{highPriorityTodos.length - 6} more</div>
                )}
              </>
            )}
          </div>

          {/* Projects Progress */}
          <div style={card}>
            <div style={sectionHeader}>
              <span style={sectionTitle}>Projects</span>
              <button style={navLink} onClick={() => navigate("projects")}>&rarr; Projects</button>
            </div>
            {projectsWithProgress.length === 0 ? (
              <div style={emptyText}>No projects yet</div>
            ) : projectsWithProgress.map((p, i) => {
              const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <div key={i} style={{ marginBottom: "0.85rem" }}>
                  <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                    <span style={{ color: "#6a6478", fontFamily: "monospace", fontSize: "0.72rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </span>
                    <span style={{ color: "#3a3548", flexShrink: 0, fontFamily: "monospace", fontSize: "0.6rem", marginLeft: "0.5rem" }}>
                      {p.done}/{p.total}
                    </span>
                  </div>
                  <div style={{ background: "#1a1d26", borderRadius: "2px", height: "3px", width: "100%" }}>
                    <div style={{ background: pct === 100 ? "#4ade80" : "#c9a96e", borderRadius: "2px", height: "100%", transition: "width 0.3s", width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completion chart — maintenance (amber) + chores (green), stacked */}
        <div style={card}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>Completed — Last 6 Months</span>
            <div style={{ alignItems: "center", display: "flex", gap: "0.9rem" }}>
              <span style={{ alignItems: "center", color: "#3a3548", display: "flex", fontFamily: "monospace", fontSize: "0.58rem", gap: "0.3rem" }}>
                <span style={{ background: "#c9a96e", borderRadius: "1px", display: "inline-block", height: "6px", width: "10px" }} />
                Maintenance
              </span>
              <span style={{ alignItems: "center", color: "#3a3548", display: "flex", fontFamily: "monospace", fontSize: "0.58rem", gap: "0.3rem" }}>
                <span style={{ background: "#4ade80", borderRadius: "1px", display: "inline-block", height: "6px", width: "10px" }} />
                Chores
              </span>
            </div>
          </div>
          <div style={{ alignItems: "flex-end", display: "flex", gap: "1rem", height: "80px" }}>
            {completionsByMonth.map((bucket, i) => {
              const total     = bucket.maint + bucket.chores;
              const maxH      = 48;
              const totalH    = Math.max((total / maxCompletions) * maxH, total > 0 ? 4 : 0);
              const maintH    = total > 0 ? Math.round((bucket.maint / total) * totalH) : 0;
              const choreH    = totalH - maintH;
              return (
                <div key={i} style={{ alignItems: "center", display: "flex", flex: 1, flexDirection: "column", gap: "0.4rem" }}>
                  <div style={{ color: "#3a3548", fontFamily: "monospace", fontSize: "0.6rem" }}>
                    {total > 0 ? total : ""}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column-reverse", justifyContent: "flex-start", width: "100%" }}>
                    {/* Maintenance segment (bottom) */}
                    <div style={{
                      background: bucket.maint > 0 ? "#c9a96e30" : "#1a1d26",
                      border: bucket.maint > 0 ? "1px solid #c9a96e40" : "1px solid #1e2330",
                      borderRadius: maintH > 0 && choreH === 0 ? "2px 2px 0 0" : "0 0 0 0",
                      height: `${Math.max(maintH, bucket.maint > 0 ? 4 : 0)}px`,
                      minHeight: bucket.maint > 0 ? "4px" : "0",
                      width: "100%",
                    }} />
                    {/* Chore segment (top) */}
                    {bucket.chores > 0 && (
                      <div style={{
                        background: "#4ade8030",
                        border: "1px solid #4ade8040",
                        borderRadius: "2px 2px 0 0",
                        height: `${Math.max(choreH, 4)}px`,
                        width: "100%",
                      }} />
                    )}
                  </div>
                  <div style={{ color: "#3a3548", fontFamily: "monospace", fontSize: "0.6rem" }}>
                    {bucket.label}
                  </div>
                </div>
              );
            })}
          </div>
          {completionsByMonth.every(b => b.maint + b.chores === 0) && (
            <div style={{ ...emptyText, marginTop: "0.5rem" }}>No completed maintenance or chores recorded yet</div>
          )}
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, valueColor, sub, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#0f1117" : "#0d0f16",
        border: `1px solid ${hovered ? "#2e3448" : "#1e2330"}`,
        borderRadius: "6px",
        cursor: "pointer",
        padding: "1rem 1.25rem",
        textAlign: "left",
        transition: "all 0.15s",
      }}
    >
      <div style={{ color: "#3a3548", fontFamily: "monospace", fontSize: "0.55rem", letterSpacing: "0.12em", marginBottom: "0.4rem", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ color: valueColor, fontFamily: "monospace", fontSize: "1.8rem", fontWeight: 300, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ color: "#2e3448", fontFamily: "monospace", fontSize: "0.6rem", marginTop: "0.3rem" }}>
        {sub}
      </div>
    </button>
  );
}
