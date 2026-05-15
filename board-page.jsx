import { useState, useMemo, useEffect, forwardRef } from "react";
import { fieldLabel, fieldInput, fieldSelect, DueDateBtn, STATUS_COLUMNS, PRIORITY_LABELS } from "./components/ModalShared.jsx";
import FmHeader from "./src/components/FmHeader.jsx";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import { loadTodos, saveTodos, createTodo } from "./lib/todos.js";
import { loadProjects, saveProjects, createProject } from "./lib/projects.js";
import { loadData } from "./lib/data.js";
import AssigneeInput from "./components/AssigneeInput.jsx";
import TodoModal from "./components/TodoModal.jsx";
import { loadDeletedCategories } from "./lib/deletedCategories.js";
import { loadDeletedItems } from "./lib/deletedItems.js";
import { computeNextDate } from "./lib/scheduleInterval.js";
import {
  loadChores, loadChoreNextDates, saveChoreNextDates,
  loadChoreCompletedDates, saveChoreCompletedDates, computeChoreNextDate,
} from "./lib/chores.js";

const PRIORITY_COLORS = {
  low:    "#4ade80",
  medium: "#c9a96e",
  high:   "#f59e0b",
  urgent: "#f87171",
};


function navBtnStyle(hovered) {
  return {
    background: "transparent",
    border: `1px solid ${hovered ? "#c9a96e" : "#a8a29c"}`,
    borderRadius: "3px",
    color: hovered ? "#c9a96e" : "#8b7d6b",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: "0.72rem",
    letterSpacing: "0.08em",
    padding: "0.4rem 0.9rem",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  };
}


function TodoCard({ todo, onEdit, isDragging, onDragStart, onDragEnd }) {
  const isOverdue = todo.dueDate && todo.status !== "done" && new Date(todo.dueDate) < new Date();
  const isDone = todo.status === "done";

  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={onEdit}
      style={{
        background: "#1a1f2e", border: "1px solid #a8a29c",
        borderLeft: `3px solid ${PRIORITY_COLORS[todo.priority] || "#c9a96e"}`,
        borderRadius: "6px", cursor: "grab", marginBottom: "0.5rem",
        opacity: isDragging ? 0.4 : 1, padding: "0.65rem 0.75rem",
        transition: "border-color 0.15s, opacity 0.15s", userSelect: "none",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#3a3f52"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#a8a29c"; }}
    >
      {todo._isOverdueMaintenance && (
        <div style={{ marginBottom: "0.4rem" }}>
          <span style={{
            background: "#f8717115", border: "1px solid #f8717140", borderRadius: "2px",
            color: "#f87171", fontFamily: "monospace", fontSize: "0.55rem",
            letterSpacing: "0.08em", padding: "0.1rem 0.35rem", textTransform: "uppercase",
          }}>
            Overdue Maintenance
          </span>
        </div>
      )}

      <div style={{
        color: isDone ? "#a8a29c" : "#e8e4dd", fontSize: "0.82rem", lineHeight: 1.35,
        marginBottom: "0.35rem", textDecoration: isDone ? "line-through" : "none",
      }}>
        {todo.title}
      </div>

      {todo.labels?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "0.35rem" }}>
          {todo.labels.map(label => (
            <span key={label} style={{
              background: "#a8a29c", borderRadius: "2px", color: "#8b7d6b",
              fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.06em", padding: "0.1rem 0.35rem",
            }}>
              {label}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "0.5rem" }}>
        <div style={{ minWidth: 0 }}>
          {(todo.linkedCategory || todo.linkedItem) && (
            <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {todo.linkedItem ? `${todo.linkedCategory} › ${todo.linkedItem}` : todo.linkedCategory}
            </div>
          )}
          {todo.assignee && (
            <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem" }}>{todo.assignee}</div>
          )}
        </div>
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          {todo.tasks?.length > 0 && (() => {
            const done = todo.tasks.filter(t => t.completed).length;
            return (
              <div style={{ color: done === todo.tasks.length ? "#4ade8080" : "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem" }}>
                {done}/{todo.tasks.length} tasks
              </div>
            );
          })()}
          {todo.estimatedCost != null && (
            <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem" }}>
              ${Number(todo.estimatedCost).toLocaleString()}
            </div>
          )}
          {todo.dueDate && (
            <div style={{ color: isOverdue ? "#f87171" : "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem" }}>
              {new Date(todo.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MaintenanceCompletionModal({ todo, rowDataByKey, onConfirm, onClose }) {
  const rowData = todo._maintenanceKey ? rowDataByKey[todo._maintenanceKey] : null;
  const { schedule, season } = rowData || {};
  const [lastCompleted, setLastCompleted] = useState(new Date());
  const [nextDate, setNextDate] = useState(null);

  function handleFollowSchedule() {
    if (!schedule) return;
    const computed = computeNextDate(lastCompleted, schedule, season);
    if (computed) setNextDate(computed);
  }

  return createPortal(
    <div
      onClick={onClose}
      style={{
        alignItems: "center", background: "rgba(0,0,0,0.75)",
        bottom: 0, display: "flex", justifyContent: "center",
        left: 0, position: "fixed", right: 0, top: 0, zIndex: 1100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#1a1f2e", border: "1px solid #a8a29c",
          borderRadius: "8px", maxWidth: 420, padding: "1.75rem 2rem", width: "90%",
        }}
      >
        <div style={{ color: "#f0e6d3", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.15em", marginBottom: "0.35rem", textTransform: "uppercase" }}>
          Log Maintenance Completion
        </div>
        <div style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.7rem", marginBottom: "1.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {todo.linkedItem || todo.linkedCategory} — {todo.title.replace(/^Overdue:\s*/i, "")}
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={fieldLabel}>Last Completed On</label>
          <DatePicker
            selected={lastCompleted}
            onChange={date => { if (date) { setLastCompleted(date); setNextDate(null); } }}
            dateFormat="MMM d, yyyy"
            customInput={<DueDateBtn value={lastCompleted.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />}
            popperPlacement="bottom-start"
            maxDate={new Date()}
          />
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <label style={fieldLabel}>Next Maintenance Date</label>
          <DatePicker
            selected={nextDate}
            onChange={date => setNextDate(date || null)}
            dateFormat="MMM d, yyyy"
            customInput={<DueDateBtn value={nextDate ? nextDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null} />}
            popperPlacement="bottom-start"
            isClearable
          />
        </div>

        {schedule && (
          <div style={{ marginBottom: "1.5rem" }}>
            <button
              onClick={handleFollowSchedule}
              style={{
                background: "#c9a96e10", border: "1px solid #c9a96e30", borderRadius: "3px",
                color: "#c9a96e", cursor: "pointer", fontFamily: "monospace", fontSize: "0.65rem",
                letterSpacing: "0.06em", marginTop: "0.5rem", padding: "0.35rem 0.7rem", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#c9a96e22"; e.currentTarget.style.borderColor = "#c9a96e60"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#c9a96e10"; e.currentTarget.style.borderColor = "#c9a96e30"; }}
            >
              Follow Recommended Schedule
            </button>
            <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.6rem", marginTop: "0.3rem" }}>
              {schedule}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid #a8a29c", borderRadius: "3px",
            color: "#8b7d6b", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem",
            letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#e8e4dd"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#8b7d6b"; }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ lastCompleted, nextDate })}
            style={{
              background: "#c9a96e18", border: "1px solid #c9a96e40", borderRadius: "3px",
              color: "#c9a96e", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem",
              letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#c9a96e30"; e.currentTarget.style.borderColor = "#c9a96e"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#c9a96e18"; e.currentTarget.style.borderColor = "#c9a96e40"; }}>
            Confirm &amp; Mark Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function BoardPage({ navigate }) {
  const [todos, setTodos] = useState(() => loadTodos());
  const [projects, setProjects] = useState(() => loadProjects());
  const [modalState, setModalState] = useState(null);
  const [maintenanceCompletionTodo, setMaintenanceCompletionTodo] = useState(null);
  const [navHovered, setNavHovered] = useState({});
  const [dragging, setDragging] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [chores] = useState(() => loadChores());
  const [choreNextDates, setChoreNextDates] = useState(() => loadChoreNextDates());
  const [choreCompletedDates, setChoreCompletedDates] = useState(() => loadChoreCompletedDates());
  const [showChoresOnly, setShowChoresOnly] = useState(false);

  const rows = useMemo(() => loadData(), []);
  const deletedCategories = useMemo(() => loadDeletedCategories(), []);
  const deletedItems = useMemo(() => loadDeletedItems(), []);

  const categoryItems = useMemo(() => {
    const map = {};
    rows.forEach(row => {
      if (deletedCategories.has(row.category)) return;
      if (row._isBlankCategory || !row.category || !row.item) return;
      if (deletedItems.has(`${row.category}|${row.item}`)) return;
      if (!map[row.category]) map[row.category] = [];
      if (!map[row.category].includes(row.item)) map[row.category].push(row.item);
    });
    return map;
  }, [rows, deletedCategories, deletedItems]);

  const categories = Object.keys(categoryItems);

  const rowDataByKey = useMemo(() => {
    const map = {};
    rows.forEach(row => {
      if (!row.category || !row.item || !row.task || row._isBlankCategory) return;
      map[`${row.category}|${row.item}|${row.task}`] = { schedule: row.schedule, season: row.season ?? null };
    });
    return map;
  }, [rows]);

  // Auto-generate overdue maintenance To Dos on mount
  useEffect(() => {
    const nextDatesRaw = JSON.parse(localStorage.getItem("maintenance-next-dates") || "{}");
    const currentTodos = loadTodos();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newTodos = [];
    rows.forEach(row => {
      if (!row.category || !row.item || !row.task || row._isBlankCategory) return;
      if (deletedCategories.has(row.category)) return;
      if (deletedItems.has(`${row.category}|${row.item}`)) return;

      const key = `${row.category}|${row.item}|${row.task}`;
      const nextDateStr = nextDatesRaw[key];
      if (!nextDateStr) return;
      if (new Date(nextDateStr) >= today) return;

      // Suppress: already have an auto-generated To Do for this key
      if (currentTodos.some(t => t._maintenanceKey === key)) return;
      // Suppress: manual To Do already linked to same item
      if (currentTodos.some(t => !t._maintenanceKey && t.linkedCategory === row.category && t.linkedItem === row.item)) return;

      newTodos.push(createTodo({
        title: `Overdue: ${row.task}`,
        linkedCategory: row.category,
        linkedItem: row.item,
        status: "not-started",
        priority: "high",
        _maintenanceKey: key,
        _isOverdueMaintenance: true,
      }));
    });

    if (newTodos.length === 0) return;
    const merged = [...currentTodos, ...newTodos];
    saveTodos(merged);
    setTodos(merged);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate overdue chore To Dos on mount
  useEffect(() => {
    const nextDatesRaw = loadChoreNextDates();
    const currentTodos = loadTodos();
    const now = new Date();

    const newTodos = [];
    chores.forEach(chore => {
      const nextDateStr = nextDatesRaw[chore.id];
      const nextDate = nextDateStr ? new Date(nextDateStr) : null;

      // No next date = newly created chore, treat as immediately due
      if (nextDate && nextDate >= now) return;

      // Already has an active (non-done) todo for this chore
      if (currentTodos.some(t => t._choreId === chore.id && t.status !== "done")) return;

      newTodos.push(createTodo({
        title: chore.title,
        linkedCategory: chore.room,
        status: "not-started",
        priority: "medium",
        _choreId: chore.id,
        _isOverdueChore: true,
      }));
    });

    if (newTodos.length === 0) return;
    const merged = [...currentTodos, ...newTodos];
    saveTodos(merged);
    setTodos(merged);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function persistTodos(next) { setTodos(next); saveTodos(next); }
  function persistProjects(next) { setProjects(next); saveProjects(next); }

  function advanceChoreDate(todo) {
    const chore = chores.find(c => c.id === todo._choreId);
    if (!chore) return;
    const today = new Date();
    const updatedCompleted = { ...choreCompletedDates, [chore.id]: today.toISOString() };
    const nextDate = computeChoreNextDate(today, chore.schedule, chore.dayOfWeek, chore.timeOfDay);
    const updatedNext = { ...choreNextDates, [chore.id]: nextDate.toISOString() };
    saveChoreCompletedDates(updatedCompleted);
    saveChoreNextDates(updatedNext);
    setChoreCompletedDates(updatedCompleted);
    setChoreNextDates(updatedNext);
  }

  function handleCreateProject() {
    const name = newProjectName.trim();
    setAddingProject(false);
    setNewProjectName("");
    if (!name) return;
    const proj = createProject({ name });
    persistProjects([...projects, proj]);
    setSelectedProjectId(proj.id);
  }

  function handleSaveTodo(form) {
    const now = new Date().toISOString();
    if (modalState && modalState !== "new" && typeof modalState === "object" && modalState.id) {
      const prev = modalState;
      const existing = todos.find(t => t.id === prev.id);
      if (form.status === "done" && existing?.status !== "done" && existing?._isOverdueMaintenance) {
        setMaintenanceCompletionTodo({ ...existing, ...form });
        setModalState(null);
        return;
      }
      if (form.status === "done" && existing?.status !== "done" && existing?._isOverdueChore) {
        advanceChoreDate(existing);
      }
      persistTodos(todos.map(t => t.id === prev.id ? {
        ...t, ...form,
        completedDate: form.status === "done" && t.status !== "done" ? now
          : form.status !== "done" ? null
          : t.completedDate,
      } : t));
    } else {
      const colKey = (modalState && modalState.colKey) || "not-started";
      persistTodos([...todos, createTodo({ ...form, status: form.status || colKey })]);
    }
    setModalState(null);
  }

  function handleDelete(id) {
    persistTodos(todos.filter(t => t.id !== id));
  }

  function markDone(id) {
    const now = new Date().toISOString();
    persistTodos(todos.map(t => t.id === id ? { ...t, status: "done", completedDate: now } : t));
  }

  function handleStatusChange(id, status) {
    if (status === "done") {
      const todo = todos.find(t => t.id === id);
      if (todo?._isOverdueMaintenance && todo.status !== "done") {
        setMaintenanceCompletionTodo(todo);
        return;
      }
      if (todo?._isOverdueChore && todo.status !== "done") {
        advanceChoreDate(todo);
      }
    }
    const now = new Date().toISOString();
    persistTodos(todos.map(t => t.id === id ? {
      ...t, status,
      completedDate: status === "done" ? now : null,
    } : t));
  }

  function handleDrop(colKey) {
    if (!dragging) return;
    if (colKey === "done") {
      const todo = todos.find(t => t.id === dragging);
      if (todo?._isOverdueMaintenance && todo.status !== "done") {
        setMaintenanceCompletionTodo(todo);
        setDragging(null);
        setDragOverCol(null);
        return;
      }
      if (todo?._isOverdueChore && todo.status !== "done") {
        advanceChoreDate(todo);
      }
    }
    handleStatusChange(dragging, colKey);
    setDragging(null);
    setDragOverCol(null);
  }

  function handleMaintenanceComplete({ lastCompleted, nextDate }) {
    const todo = maintenanceCompletionTodo;
    if (!todo) return;
    const key = todo._maintenanceKey;
    if (key) {
      const completedDates = JSON.parse(localStorage.getItem("maintenance-dates") || "{}");
      completedDates[key] = lastCompleted.toISOString();
      localStorage.setItem("maintenance-dates", JSON.stringify(completedDates));
      if (nextDate) {
        const nextDates = JSON.parse(localStorage.getItem("maintenance-next-dates") || "{}");
        nextDates[key] = nextDate.toISOString();
        localStorage.setItem("maintenance-next-dates", JSON.stringify(nextDates));
      }
    }
    markDone(todo.id);
    setMaintenanceCompletionTodo(null);
  }

  const todoCategories = useMemo(() => {
    const cats = new Set(todos.filter(t => t.linkedCategory && !t._isOverdueChore).map(t => t.linkedCategory));
    return Array.from(cats).sort();
  }, [todos]);

  const filteredTodos = useMemo(() => todos.filter(t => {
    if (selectedProjectId && t.projectId !== selectedProjectId) return false;
    if (activeCategory !== "All" && t.linkedCategory !== activeCategory) return false;
    if (!showChoresOnly && t._isOverdueChore) return false;
    return true;
  }), [todos, selectedProjectId, activeCategory, showChoresOnly]);

  const todosByStatus = useMemo(() => {
    const map = { "not-started": [], "in-progress": [], "done": [] };
    filteredTodos.forEach(t => { if (map[t.status]) map[t.status].push(t); });
    return map;
  }, [filteredTodos]);

  const modalTodo = modalState && modalState !== "new" && typeof modalState === "object" && modalState.id
    ? modalState : null;

  const sidebarTodos = useMemo(() => {
    const nonChore = todos.filter(t => !t._isOverdueChore);
    return activeCategory === "All" ? nonChore : nonChore.filter(t => t.linkedCategory === activeCategory);
  }, [todos, activeCategory]);

  return (
    <div style={{
      background: "#0f1117", color: "#e8e4dd", display: "flex", flexDirection: "column",
      fontFamily: "'Georgia', 'Times New Roman', serif", height: "100vh", overflow: "hidden",
    }}>

      {modalState !== null && (
        <TodoModal
          todo={modalTodo} categories={categories} categoryItems={categoryItems} projects={projects}
          onSave={handleSaveTodo} onClose={() => setModalState(null)}
          onDelete={modalTodo ? () => handleDelete(modalTodo.id) : null}
        />
      )}

      {maintenanceCompletionTodo && (
        <MaintenanceCompletionModal
          todo={maintenanceCompletionTodo}
          rowDataByKey={rowDataByKey}
          onConfirm={handleMaintenanceComplete}
          onClose={() => setMaintenanceCompletionTodo(null)}
        />
      )}

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 60%)",
        borderBottom: "1px solid #a8a29c", flexShrink: 0, padding: "2rem", zIndex: 50,
      }}>
        <FmHeader active="To Dos" tagline="ad-hoc work in flight" />
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar */}
        <aside style={{ borderRight: "1px solid #1e2330", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden", width: 240 }}>

          {/* Projects widget */}
          <div style={{ borderBottom: "1px solid #1e2330", display: "flex", flexDirection: "column", flexShrink: 0, maxHeight: "45%", minHeight: 100 }}>
            <div style={{ alignItems: "center", borderBottom: "1px solid #1e2330", display: "flex", flexShrink: 0, justifyContent: "space-between", padding: "0.6rem 0.85rem" }}>
              <span style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>Projects</span>
              <button
                onClick={() => { setAddingProject(true); setNewProjectName(""); }}
                style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.85rem", lineHeight: 1, padding: "0.1rem 0.2rem", transition: "color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#a8a29c"; }}
              >+</button>
            </div>
            <div style={{ overflowY: "auto" }}>
              <div
                onClick={() => setSelectedProjectId(null)}
                style={{
                  background: selectedProjectId === null ? "#1a2035" : "transparent",
                  borderLeft: `2px solid ${selectedProjectId === null ? "#c9a96e" : "transparent"}`,
                  color: selectedProjectId === null ? "#c9a96e" : "#a8a29c",
                  cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem",
                  padding: "0.45rem 0.85rem", transition: "background 0.1s, color 0.1s",
                }}
                onMouseEnter={e => { if (selectedProjectId !== null) e.currentTarget.style.background = "#13161f"; }}
                onMouseLeave={e => { if (selectedProjectId !== null) e.currentTarget.style.background = "transparent"; }}
              >
                All
              </div>
              {projects.map(proj => (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProjectId(proj.id === selectedProjectId ? null : proj.id)}
                  style={{
                    background: selectedProjectId === proj.id ? "#1a2035" : "transparent",
                    borderLeft: `2px solid ${selectedProjectId === proj.id ? "#c9a96e" : "transparent"}`,
                    color: selectedProjectId === proj.id ? "#c9a96e" : "#a8a29c",
                    cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem",
                    overflow: "hidden", padding: "0.45rem 0.85rem",
                    textOverflow: "ellipsis", transition: "background 0.1s, color 0.1s", whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => { if (selectedProjectId !== proj.id) e.currentTarget.style.background = "#13161f"; }}
                  onMouseLeave={e => { if (selectedProjectId !== proj.id) e.currentTarget.style.background = "transparent"; }}
                >
                  {proj.name}
                </div>
              ))}
              {addingProject && (
                <div style={{ padding: "0.35rem 0.65rem" }}>
                  <input
                    autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                    placeholder="Project name..."
                    onKeyDown={e => {
                      if (e.key === "Enter") { e.preventDefault(); handleCreateProject(); }
                      if (e.key === "Escape") { setAddingProject(false); setNewProjectName(""); }
                    }}
                    onBlur={handleCreateProject}
                    style={{ ...fieldInput, fontSize: "0.75rem", padding: "0.3rem 0.4rem" }}
                  />
                </div>
              )}
              {projects.length === 0 && !addingProject && (
                <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.68rem", padding: "0.75rem 0.85rem" }}>No projects yet</div>
              )}
            </div>
          </div>

          {/* To Dos widget */}
          <div style={{ display: "flex", flex: 1, flexDirection: "column", overflow: "hidden" }}>
            <div style={{ borderBottom: "1px solid #1e2330", flexShrink: 0, padding: "0.6rem 0.85rem 0.5rem" }}>
              <span style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>To Dos</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.5rem" }}>
                {["All", ...todoCategories].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                    background: activeCategory === cat ? "#c9a96e" : "transparent",
                    border: `1px solid ${activeCategory === cat ? "#c9a96e" : "#a8a29c"}`,
                    borderRadius: "3px", color: activeCategory === cat ? "#0f1117" : "#8b7d6b",
                    cursor: "pointer", fontFamily: "monospace", fontSize: "0.62rem",
                    fontWeight: activeCategory === cat ? "bold" : "normal",
                    letterSpacing: "0.05em", padding: "0.2rem 0.45rem", transition: "all 0.15s",
                  }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {sidebarTodos.length === 0 ? (
                <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.68rem", padding: "0.75rem 0.85rem" }}>No to dos</div>
              ) : sidebarTodos.map(todo => (
                <div
                  key={todo.id}
                  onClick={() => setModalState(todo)}
                  style={{
                    alignItems: "center", background: "transparent", borderBottom: "1px solid #1e2330",
                    borderLeft: `3px solid ${PRIORITY_COLORS[todo.priority] || "#c9a96e"}`,
                    cursor: "pointer", display: "flex", gap: "0.4rem",
                    padding: "0.45rem 0.75rem 0.45rem 0.6rem", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#13161f"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem",
                      overflow: "hidden", textDecoration: todo.status === "done" ? "line-through" : "none",
                      textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {todo.title}
                    </div>
                    {todo.dueDate && (
                      <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.6rem" }}>
                        {new Date(todo.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main kanban area */}
        <div style={{ display: "flex", flex: 1, flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem 4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
              <div style={{ alignItems: "center", display: "flex", gap: "1.25rem" }}>
                <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem" }}>
                  {filteredTodos.length} {filteredTodos.length === 1 ? "to do" : "to dos"}
                  {selectedProjectId && projects.find(p => p.id === selectedProjectId) && ` · ${projects.find(p => p.id === selectedProjectId).name}`}
                  {activeCategory !== "All" && ` · ${activeCategory}`}
                </span>
                <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.65rem" }}>Overdue maintenance tasks and chores are automatically added here.</span>
              </div>
              <div style={{ alignItems: "center", display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => setShowChoresOnly(prev => !prev)}
                  style={{
                    background: showChoresOnly ? "#c9a96e18" : "transparent",
                    border: `1px solid ${showChoresOnly ? "#c9a96e" : "#a8a29c"}`,
                    borderRadius: "3px", color: showChoresOnly ? "#c9a96e" : "#a8a29c",
                    cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem",
                    letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!showChoresOnly) { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#8b7d6b"; } }}
                  onMouseLeave={e => { if (!showChoresOnly) { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#a8a29c"; } }}
                >
                  Chores
                </button>
                <button
                  onClick={() => setModalState("new")}
                  style={{
                    background: "#c9a96e18", border: "1px solid #c9a96e40", borderRadius: "3px",
                    color: "#c9a96e", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem",
                    letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#c9a96e30"; e.currentTarget.style.borderColor = "#c9a96e"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#c9a96e18"; e.currentTarget.style.borderColor = "#c9a96e40"; }}
                >
                  + New To Do
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              {STATUS_COLUMNS.map(col => {
                const colTodos = todosByStatus[col.key];
                const isDragTarget = !!dragging && dragOverCol === col.key;
                return (
                  <div
                    key={col.key}
                    onDragEnter={() => dragging && setDragOverCol(col.key)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(col.key)}
                    style={{
                      background: isDragTarget ? "#1a2035" : "#13161f",
                      border: `1px solid ${isDragTarget ? "#c9a96e50" : "#1e2330"}`,
                      borderRadius: "8px", flex: 1, minHeight: 240,
                      padding: "0.75rem", transition: "background 0.15s, border-color 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                      <span style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                        {col.label}
                      </span>
                      <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.65rem" }}>{colTodos.length}</span>
                    </div>

                    {colTodos.map(todo => (
                      <TodoCard
                        key={todo.id} todo={todo} onEdit={() => setModalState(todo)}
                        isDragging={dragging === todo.id}
                        onDragStart={() => setDragging(todo.id)}
                        onDragEnd={() => { setDragging(null); setDragOverCol(null); }}
                      />
                    ))}

                    <button
                      onClick={() => setModalState({ colKey: col.key })}
                      style={{
                        background: "none", border: "none", color: "#a8a29c", cursor: "pointer",
                        fontFamily: "monospace", fontSize: "0.7rem", letterSpacing: "0.05em",
                        marginTop: "0.25rem", padding: "0.3rem 0", transition: "color 0.15s",
                        width: "100%", textAlign: "left",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#a8a29c"; }}
                    >
                      + Add
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
