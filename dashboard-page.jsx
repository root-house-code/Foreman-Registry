import { useState, useMemo } from "react";
import PageNav from "./components/PageNav.jsx";
import { loadTodos } from "./lib/todos.js";
import { loadProjects } from "./lib/projects.js";
import { loadData } from "./lib/data.js";
import { loadDeletedCategories } from "./lib/deletedCategories.js";
import { loadDeletedItems } from "./lib/deletedItems.js";

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

  const in30Days = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    return d;
  }, [today]);

  const rows = useMemo(() => loadData(), []);
  const deletedCategories = useMemo(() => loadDeletedCategories(), []);
  const deletedItems = useMemo(() => loadDeletedItems(), []);
  const todos = useMemo(() => loadTodos(), []);
  const projects = useMemo(() => loadProjects(), []);
  const nextDatesMap = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("maintenance-next-dates") || "{}"); }
    catch { return {}; }
  }, []);
  const completedDatesMap = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("maintenance-dates") || "{}"); }
    catch { return {}; }
  }, []);

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
      .filter(row => {
        const d = nextDatesMap[keyOf(row)];
        return d && new Date(d) < today;
      })
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

  const todoStatusCounts = useMemo(() => {
    const counts = { "not-started": 0, "in-progress": 0, "done": 0 };
    todos.forEach(t => { if (counts[t.status] != null) counts[t.status]++; });
    return counts;
  }, [todos]);

  const highPriorityTodos = useMemo(() =>
    todos
      .filter(t => (t.priority === "urgent" || t.priority === "high") && t.status !== "done")
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

  const completionsByMonth = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - i);
      result.push({ label: MONTH_LABELS[d.getMonth()], year: d.getFullYear(), month: d.getMonth(), count: 0 });
    }
    Object.values(completedDatesMap).forEach(dateList => {
      if (!Array.isArray(dateList)) return;
      dateList.forEach(dateStr => {
        const d = new Date(dateStr);
        const bucket = result.find(b => b.year === d.getFullYear() && b.month === d.getMonth());
        if (bucket) bucket.count++;
      });
    });
    return result;
  }, [completedDatesMap, today]);

  const maxCompletions = useMemo(() =>
    Math.max(...completionsByMonth.map(b => b.count), 1),
    [completionsByMonth]
  );

  const openTodosCount = todoStatusCounts["not-started"] + todoStatusCounts["in-progress"];
  const activeProjectsCount = projects.length;

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
  }

  const PRIORITY_COLORS = {
    low: "#4ade80",
    medium: "#c9a96e",
    high: "#f59e0b",
    urgent: "#f87171",
  };

  return (
    <div style={{ background: "#0f1117", color: "#d4c9b8", display: "flex", flexDirection: "column", fontFamily: "monospace", height: "100vh", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #0a0c12 0%, #0d0f16 100%)",
        borderBottom: "1px solid #1a1d26",
        flexShrink: 0,
        padding: "1.5rem 2rem 1rem",
      }}>
        <div style={{ alignItems: "flex-end", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#3a3548", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.15em", marginBottom: "0.2rem", textTransform: "uppercase" }}>
              YOUR HOME AT A GLANCE
            </div>
            <h1 style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 400, letterSpacing: "0.1em", margin: 0 }}>
              Dashboard
            </h1>
          </div>
          <PageNav currentPage="dashboard" navigate={navigate} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>

        {/* Stat summary row */}
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "1.5rem" }}>
          <StatCard
            label="Overdue"
            value={overdueItems.length}
            valueColor={overdueItems.length > 0 ? "#f87171" : "#4ade80"}
            sub="maintenance tasks"
            onClick={() => navigate("maintenance")}
          />
          <StatCard
            label="Upcoming"
            value={upcomingItems.length}
            valueColor="#c9a96e"
            sub="due within 30 days"
            onClick={() => navigate("maintenance")}
          />
          <StatCard
            label="Open To Dos"
            value={openTodosCount}
            valueColor="#8b7d6b"
            sub={`${todoStatusCounts["in-progress"]} in progress`}
            onClick={() => navigate("board")}
          />
          <StatCard
            label="Projects"
            value={activeProjectsCount}
            valueColor="#8b7d6b"
            sub="active"
            onClick={() => navigate("projects")}
          />
        </div>

        {/* Overdue + Upcoming */}
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr", marginBottom: "1rem" }}>
          {/* Overdue Maintenance */}
          <div style={card}>
            <div style={sectionHeader}>
              <span style={sectionTitle}>Overdue Maintenance</span>
              <button style={navLink} onClick={() => navigate("maintenance")}>&rarr; Maintenance</button>
            </div>
            {overdueItems.length === 0
              ? <div style={emptyText}>All clear</div>
              : overdueItems.slice(0, 8).map((row, i) => (
                <div key={i} style={rowStyle}>
                  <span style={{ color: "#f87171", minWidth: "60px" }}>{formatDate(nextDatesMap[keyOf(row)])}</span>
                  <span style={{ color: "#4a4458", minWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.category}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.task}</span>
                </div>
              ))
            }
            {overdueItems.length > 8 && (
              <div style={{ ...emptyText, marginTop: "0.25rem" }}>+{overdueItems.length - 8} more</div>
            )}
          </div>

          {/* Upcoming Maintenance */}
          <div style={card}>
            <div style={sectionHeader}>
              <span style={sectionTitle}>Upcoming — 30 Days</span>
              <button style={navLink} onClick={() => navigate("maintenance")}>&rarr; Maintenance</button>
            </div>
            {upcomingItems.length === 0
              ? <div style={emptyText}>Nothing due soon</div>
              : upcomingItems.slice(0, 8).map((row, i) => (
                <div key={i} style={rowStyle}>
                  <span style={{ color: "#c9a96e", minWidth: "60px" }}>{formatDate(nextDatesMap[keyOf(row)])}</span>
                  <span style={{ color: "#4a4458", minWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.category}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.task}</span>
                </div>
              ))
            }
            {upcomingItems.length > 8 && (
              <div style={{ ...emptyText, marginTop: "0.25rem" }}>+{upcomingItems.length - 8} more</div>
            )}
          </div>
        </div>

        {/* To Dos + Projects */}
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr", marginBottom: "1rem" }}>
          {/* To Dos Summary */}
          <div style={card}>
            <div style={sectionHeader}>
              <span style={sectionTitle}>To Dos</span>
              <button style={navLink} onClick={() => navigate("board")}>&rarr; Board</button>
            </div>
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.75rem" }}>
              {[
                { label: "Not Started", key: "not-started", color: "#4a4458" },
                { label: "In Progress", key: "in-progress", color: "#c9a96e" },
                { label: "Done", key: "done", color: "#4ade80" },
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
            {highPriorityTodos.length === 0
              ? <div style={emptyText}>No urgent or high priority items</div>
              : (
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
              )
            }
          </div>

          {/* Projects Progress */}
          <div style={card}>
            <div style={sectionHeader}>
              <span style={sectionTitle}>Projects</span>
              <button style={navLink} onClick={() => navigate("projects")}>&rarr; Projects</button>
            </div>
            {projectsWithProgress.length === 0
              ? <div style={emptyText}>No projects yet</div>
              : projectsWithProgress.map((p, i) => {
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
              })
            }
          </div>
        </div>

        {/* Completed Maintenance Over Time */}
        <div style={card}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>Completed Maintenance — Last 6 Months</span>
            <button style={navLink} onClick={() => navigate("maintenance")}>&rarr; Maintenance</button>
          </div>
          <div style={{ alignItems: "flex-end", display: "flex", gap: "1rem", height: "80px" }}>
            {completionsByMonth.map((bucket, i) => (
              <div key={i} style={{ alignItems: "center", display: "flex", flex: 1, flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ color: "#3a3548", fontFamily: "monospace", fontSize: "0.6rem" }}>
                  {bucket.count > 0 ? bucket.count : ""}
                </div>
                <div style={{
                  background: bucket.count > 0 ? "#c9a96e30" : "#1a1d26",
                  border: bucket.count > 0 ? "1px solid #c9a96e40" : "1px solid #1e2330",
                  borderRadius: "2px 2px 0 0",
                  height: `${Math.max((bucket.count / maxCompletions) * 48, bucket.count > 0 ? 4 : 0)}px`,
                  minHeight: bucket.count > 0 ? "4px" : "0",
                  width: "100%",
                }} />
                <div style={{ color: "#3a3548", fontFamily: "monospace", fontSize: "0.6rem" }}>
                  {bucket.label}
                </div>
              </div>
            ))}
          </div>
          {completionsByMonth.every(b => b.count === 0) && (
            <div style={{ ...emptyText, marginTop: "0.5rem" }}>No completed maintenance recorded yet</div>
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
