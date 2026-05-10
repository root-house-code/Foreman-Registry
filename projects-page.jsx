import { useState, useMemo, useEffect, useRef, forwardRef } from "react";
import PageNav from "./components/PageNav.jsx";
import DatePicker from "react-datepicker";
import { loadTodos, saveTodos, createTodo } from "./lib/todos.js";
import { loadProjects, saveProjects, createProject } from "./lib/projects.js";
import { loadData } from "./lib/data.js";
import { loadDeletedCategories } from "./lib/deletedCategories.js";
import { loadDeletedItems } from "./lib/deletedItems.js";

const PRIORITY_COLORS = {
  low: "#4ade80", medium: "#c9a96e", high: "#f59e0b", urgent: "#f87171",
};

function navBtnStyle(hovered) {
  return {
    background: "transparent",
    border: `1px solid ${hovered ? "#c9a96e" : "#6b6560"}`,
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

const fieldLabel = {
  color: "#a8a29c",
  display: "block",
  fontFamily: "monospace",
  fontSize: "0.6rem",
  letterSpacing: "0.12em",
  marginBottom: "0.3rem",
  textTransform: "uppercase",
};

const fieldInput = {
  background: "#13161f",
  border: "1px solid #6b6560",
  borderRadius: "3px",
  boxSizing: "border-box",
  color: "#e8e4dd",
  fontFamily: "monospace",
  fontSize: "0.78rem",
  outline: "none",
  padding: "0.35rem 0.5rem",
  width: "100%",
};

const fieldSelect = { ...fieldInput, cursor: "pointer" };

const DueDateBtn = forwardRef(({ value, onClick }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    style={{ ...fieldInput, color: value ? "#e8e4dd" : "#a8a29c", cursor: "pointer", textAlign: "left" }}
  >
    {value || "No date"}
  </button>
));

function TaskCheckbox({ completed, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        alignItems: "center",
        background: completed ? "#c9a96e18" : "transparent",
        border: `1px solid ${completed ? "#c9a96e40" : "#6b6560"}`,
        borderRadius: "3px",
        cursor: "pointer",
        display: "flex",
        flexShrink: 0,
        height: 16,
        justifyContent: "center",
        padding: 0,
        width: 16,
      }}
    >
      {completed && <span style={{ color: "#c9a96e", fontSize: "0.55rem", lineHeight: 1 }}>✓</span>}
    </button>
  );
}

function statusBadgeStyle(status) {
  return {
    background: status === "done" ? "#4ade8018" : status === "in-progress" ? "#c9a96e18" : "#1a1f2e",
    border: `1px solid ${status === "done" ? "#4ade8040" : status === "in-progress" ? "#c9a96e40" : "#6b6560"}`,
    borderRadius: "2px",
    color: status === "done" ? "#4ade80" : status === "in-progress" ? "#c9a96e" : "#a8a29c",
    display: "inline-block",
    flexShrink: 0,
    fontFamily: "monospace",
    fontSize: "0.58rem",
    letterSpacing: "0.06em",
    padding: "0.1rem 0.35rem",
    textTransform: "uppercase",
  };
}

export default function ProjectsPage({ navigate }) {
  const [projects, setProjects] = useState(() => loadProjects());
  const [todos, setTodos] = useState(() => loadTodos());
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedTodoId, setSelectedTodoId] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [addingTodoToProject, setAddingTodoToProject] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [expandedTodos, setExpandedTodos] = useState(() => new Set());
  const [centerAddingTaskFor, setCenterAddingTaskFor] = useState(null);
  const [centerNewTaskTitle, setCenterNewTaskTitle] = useState("");
  const [rightAddingTask, setRightAddingTask] = useState(false);
  const [rightNewTaskTitle, setRightNewTaskTitle] = useState("");
  const [rightPanelForm, setRightPanelForm] = useState(null);
  const [navHovered, setNavHovered] = useState(null);
  const headerRef = useRef(null);

  // Inventory data for right panel dropdowns
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
  const allCategories = Object.keys(categoryItems);

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId) || null, [projects, selectedProjectId]);
  const selectedTodo = useMemo(() => todos.find(t => t.id === selectedTodoId) || null, [todos, selectedTodoId]);
  const projectTodos = useMemo(() => selectedProjectId ? todos.filter(t => t.projectId === selectedProjectId) : [], [todos, selectedProjectId]);

  const todoCategories = useMemo(() => {
    const cats = new Set(todos.filter(t => t.linkedCategory && !t._isOverdueChore).map(t => t.linkedCategory));
    return Array.from(cats).sort();
  }, [todos]);

  const filteredSidebarTodos = useMemo(() => {
    const base = todos.filter(t => !t._isOverdueChore);
    if (activeCategory === "All") return base;
    return base.filter(t => t.linkedCategory === activeCategory);
  }, [todos, activeCategory]);

  const linkedItems = rightPanelForm?.linkedCategory ? (categoryItems[rightPanelForm.linkedCategory] || []) : [];

  // Sync right panel form when selected To Do changes
  useEffect(() => {
    const todo = todos.find(t => t.id === selectedTodoId) || null;
    if (todo) {
      setRightPanelForm({
        ...todo,
        labelsText: (todo.labels || []).join(", "),
        estimatedCostText: todo.estimatedCost != null ? String(todo.estimatedCost) : "",
      });
    } else {
      setRightPanelForm(null);
    }
    setRightAddingTask(false);
    setRightNewTaskTitle("");
  }, [selectedTodoId]); // intentionally not depending on todos — form is source of truth while editing

  function persistTodos(next) { setTodos(next); saveTodos(next); }
  function persistProjects(next) { setProjects(next); saveProjects(next); }

  function handleCreateProject() {
    const name = newProjectName.trim();
    setAddingProject(false);
    setNewProjectName("");
    if (!name) return;
    const proj = createProject({ name });
    persistProjects([...projects, proj]);
    setSelectedProjectId(proj.id);
  }

  function handleAddTodoToProject() {
    const title = newTodoTitle.trim();
    setAddingTodoToProject(false);
    setNewTodoTitle("");
    if (!title || !selectedProjectId) return;
    const todo = createTodo({ title, projectId: selectedProjectId });
    persistTodos([...todos, todo]);
  }

  function addTask(todoId, title) {
    const t = title.trim();
    if (!t) return;
    const task = { id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, title: t, completed: false };
    persistTodos(todos.map(todo => todo.id === todoId ? { ...todo, tasks: [...(todo.tasks || []), task] } : todo));
  }

  function handleCenterAddTask(todoId) {
    addTask(todoId, centerNewTaskTitle);
    setCenterAddingTaskFor(null);
    setCenterNewTaskTitle("");
  }

  function handleRightAddTask() {
    if (!selectedTodoId) return;
    addTask(selectedTodoId, rightNewTaskTitle);
    setRightAddingTask(false);
    setRightNewTaskTitle("");
  }

  function handleToggleTask(todoId, taskId) {
    persistTodos(todos.map(todo =>
      todo.id === todoId
        ? { ...todo, tasks: (todo.tasks || []).map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) }
        : todo
    ));
  }

  function handleDeleteTask(todoId, taskId) {
    persistTodos(todos.map(todo =>
      todo.id === todoId
        ? { ...todo, tasks: (todo.tasks || []).filter(t => t.id !== taskId) }
        : todo
    ));
  }

  function saveRightField(field, value) {
    if (!selectedTodoId) return;
    persistTodos(todos.map(t => t.id === selectedTodoId ? { ...t, [field]: value } : t));
  }

  function setRightField(field, value) {
    setRightPanelForm(f => f ? { ...f, [field]: value } : f);
  }

  function handleRightBlur(field) {
    if (!rightPanelForm || !selectedTodoId) return;
    if (field === "labels") {
      const parsed = rightPanelForm.labelsText.split(",").map(l => l.trim()).filter(Boolean);
      saveRightField("labels", parsed);
    } else if (field === "estimatedCost") {
      const parsed = rightPanelForm.estimatedCostText !== "" ? parseFloat(rightPanelForm.estimatedCostText) : null;
      saveRightField("estimatedCost", isNaN(parsed) ? null : parsed);
    } else {
      saveRightField(field, rightPanelForm[field]);
    }
  }

  function handleRightSelectChange(field, value) {
    setRightField(field, value);
    saveRightField(field, value);
  }

  function toggleExpandTodo(id) {
    setExpandedTodos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div style={{
      background: "#0f1117",
      color: "#e8e0d0",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      height: "100vh",
      overflow: "hidden",
    }}>

      {/* Header */}
      <div ref={headerRef} style={{
        background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 60%)",
        borderBottom: "1px solid #6b6560",
        flexShrink: 0,
        padding: "2rem",
        zIndex: 50,
      }}>
        <div style={{ alignItems: "flex-end", display: "flex", justifyContent: "space-between" }}>
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
                MANAGE YOUR
              </span>
              <span style={{ color: "#c9a96e", fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: "clamp(0.95rem, 2vw, 1.15rem)", letterSpacing: "0.01em" }}>
                Projects
              </span>
            </div>
          </div>
          <PageNav currentPage="projects" navigate={navigate} />
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left sidebar */}
        <aside style={{
          borderRight: "1px solid #1e2330",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
          width: 240,
        }}>

          {/* Projects widget */}
          <div style={{ borderBottom: "1px solid #1e2330", display: "flex", flexDirection: "column", flexShrink: 0, maxHeight: "45%", minHeight: 100 }}>
            <div style={{ alignItems: "center", borderBottom: "1px solid #1e2330", display: "flex", flexShrink: 0, justifyContent: "space-between", padding: "0.6rem 0.85rem" }}>
              <span style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Projects
              </span>
              <button
                onClick={() => { setAddingProject(true); setNewProjectName(""); }}
                title="New project"
                style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.85rem", lineHeight: 1, padding: "0.1rem 0.2rem", transition: "color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#a8a29c"; }}
              >
                +
              </button>
            </div>
            <div style={{ overflowY: "auto" }}>
              {projects.map(proj => (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProjectId(proj.id)}
                  style={{
                    background: selectedProjectId === proj.id ? "#1a2035" : "transparent",
                    borderLeft: `2px solid ${selectedProjectId === proj.id ? "#c9a96e" : "transparent"}`,
                    color: selectedProjectId === proj.id ? "#c9a96e" : "#a89e8e",
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    overflow: "hidden",
                    padding: "0.45rem 0.85rem",
                    textOverflow: "ellipsis",
                    transition: "background 0.1s, color 0.1s",
                    whiteSpace: "nowrap",
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
                    autoFocus
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
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
                <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.68rem", padding: "0.75rem 0.85rem" }}>
                  No projects yet
                </div>
              )}
            </div>
          </div>

          {/* To Dos widget */}
          <div style={{ display: "flex", flex: 1, flexDirection: "column", overflow: "hidden" }}>
            <div style={{ borderBottom: "1px solid #1e2330", flexShrink: 0, padding: "0.6rem 0.85rem 0.5rem" }}>
              <span style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                To Dos
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.5rem" }}>
                {["All", ...todoCategories].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      background: activeCategory === cat ? "#c9a96e" : "transparent",
                      border: `1px solid ${activeCategory === cat ? "#c9a96e" : "#6b6560"}`,
                      borderRadius: "3px",
                      color: activeCategory === cat ? "#0f1117" : "#8b7d6b",
                      cursor: "pointer",
                      fontFamily: "monospace",
                      fontSize: "0.62rem",
                      fontWeight: activeCategory === cat ? "bold" : "normal",
                      letterSpacing: "0.05em",
                      padding: "0.2rem 0.45rem",
                      transition: "all 0.15s",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filteredSidebarTodos.length === 0 ? (
                <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.68rem", padding: "0.75rem 0.85rem" }}>
                  No to dos
                </div>
              ) : (
                filteredSidebarTodos.map(todo => {
                  const isSelected = selectedTodoId === todo.id && !projectTodos.find(t => t.id === todo.id);
                  return (
                    <div
                      key={todo.id}
                      onClick={() => setSelectedTodoId(todo.id)}
                      style={{
                        alignItems: "center",
                        background: selectedTodoId === todo.id ? "#1a2035" : "transparent",
                        borderBottom: "1px solid #1e2330",
                        borderLeft: `3px solid ${PRIORITY_COLORS[todo.priority] || "#c9a96e"}`,
                        cursor: "pointer",
                        display: "flex",
                        gap: "0.4rem",
                        padding: "0.45rem 0.75rem 0.45rem 0.6rem",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => { if (selectedTodoId !== todo.id) e.currentTarget.style.background = "#13161f"; }}
                      onMouseLeave={e => { if (selectedTodoId !== todo.id) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: selectedTodoId === todo.id ? "#c9a96e" : "#a89e8e",
                          fontFamily: "monospace",
                          fontSize: "0.72rem",
                          overflow: "hidden",
                          textDecoration: todo.status === "done" ? "line-through" : "none",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
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
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Center panel */}
        <main style={{ display: "flex", flex: 1, flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {!selectedProject ? (
            <div style={{ alignItems: "center", display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", gap: "0.5rem" }}>
              <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                No project selected
              </div>
              <div style={{ color: "#6b6560", fontFamily: "monospace", fontSize: "0.68rem" }}>
                Choose a project from the sidebar or create a new one
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flex: 1, flexDirection: "column", overflow: "hidden" }}>
              {/* Project header */}
              <div style={{ borderBottom: "1px solid #1e2330", flexShrink: 0, padding: "1rem 1.5rem 0.85rem" }}>
                <div style={{ color: "#f0e6d3", fontSize: "1.1rem" }}>
                  {selectedProject.name}
                </div>
                <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.65rem", marginTop: "0.2rem" }}>
                  {projectTodos.length} {projectTodos.length === 1 ? "to do" : "to dos"}
                </div>
              </div>

              {/* Column headers */}
              <div style={{ borderBottom: "1px solid #1e2330", display: "flex", flexShrink: 0, padding: "0.4rem 1.5rem 0.4rem 2.5rem" }}>
                <span style={{ color: "#6b6560", flex: 1, fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Name</span>
                <span style={{ color: "#6b6560", flexShrink: 0, fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.1em", textAlign: "right", textTransform: "uppercase", width: 72 }}>Due</span>
                <span style={{ color: "#6b6560", flexShrink: 0, fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.1em", textAlign: "right", textTransform: "uppercase", width: 88 }}>Status</span>
              </div>

              {/* To Do list */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {projectTodos.map(todo => {
                  const isExpanded = expandedTodos.has(todo.id);
                  const isSelected = selectedTodoId === todo.id;
                  const tasks = todo.tasks || [];
                  const doneTasks = tasks.filter(t => t.completed).length;
                  const isOverdue = todo.dueDate && todo.status !== "done" && new Date(todo.dueDate) < new Date();

                  return (
                    <div key={todo.id} style={{ borderBottom: "1px solid #1e2330" }}>
                      <div
                        onClick={() => setSelectedTodoId(isSelected ? null : todo.id)}
                        style={{
                          alignItems: "center",
                          background: isSelected ? "#1a2035" : "transparent",
                          borderLeft: `3px solid ${isSelected ? "#c9a96e" : PRIORITY_COLORS[todo.priority] || "#c9a96e"}`,
                          cursor: "pointer",
                          display: "flex",
                          gap: "0.5rem",
                          padding: "0.65rem 1.5rem 0.65rem 0.85rem",
                          transition: "background 0.1s",
                          userSelect: "none",
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#0d1019"; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                      >
                        <button
                          onClick={e => { e.stopPropagation(); toggleExpandTodo(todo.id); }}
                          style={{ background: "none", border: "none", color: tasks.length > 0 ? "#a8a29c" : "#6b6560", cursor: "pointer", flexShrink: 0, fontFamily: "monospace", fontSize: "0.58rem", padding: 0, width: 12 }}
                        >
                          {isExpanded ? "▼" : "▶"}
                        </button>

                        <span style={{
                          color: isSelected ? "#c9a96e" : "#e8e4dd",
                          flex: 1,
                          fontFamily: "monospace",
                          fontSize: "0.82rem",
                          minWidth: 0,
                          overflow: "hidden",
                          textDecoration: todo.status === "done" ? "line-through" : "none",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {todo.title}
                        </span>

                        {tasks.length > 0 && (
                          <span style={{ color: "#a8a29c", flexShrink: 0, fontFamily: "monospace", fontSize: "0.6rem" }}>
                            {doneTasks}/{tasks.length}
                          </span>
                        )}

                        <span style={{ color: isOverdue ? "#f87171" : "#a8a29c", flexShrink: 0, fontFamily: "monospace", fontSize: "0.65rem", textAlign: "right", width: 72 }}>
                          {todo.dueDate ? new Date(todo.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                        </span>

                        <span style={{ flexShrink: 0, textAlign: "right", width: 88 }}>
                          <span style={statusBadgeStyle(todo.status)}>
                            {todo.status === "not-started" ? "To Do" : todo.status === "in-progress" ? "In Prog." : "Done"}
                          </span>
                        </span>
                      </div>

                      {/* Expanded tasks */}
                      {isExpanded && (
                        <div style={{ background: "#0d1019", paddingBottom: "0.35rem" }}>
                          {tasks.map(task => (
                            <div
                              key={task.id}
                              style={{ alignItems: "center", display: "flex", gap: "0.6rem", padding: "0.3rem 1.5rem 0.3rem 2.6rem" }}
                            >
                              <TaskCheckbox completed={task.completed} onToggle={() => handleToggleTask(todo.id, task.id)} />
                              <span style={{
                                color: task.completed ? "#a8a29c" : "#8b7d6b",
                                flex: 1,
                                fontFamily: "monospace",
                                fontSize: "0.72rem",
                                textDecoration: task.completed ? "line-through" : "none",
                              }}>
                                {task.title}
                              </span>
                              <button
                                onClick={() => handleDeleteTask(todo.id, task.id)}
                                style={{ background: "none", border: "none", color: "#6b6560", cursor: "pointer", fontFamily: "monospace", fontSize: "0.7rem", padding: "0 0.2rem", transition: "color 0.15s" }}
                                onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; }}
                                onMouseLeave={e => { e.currentTarget.style.color = "#6b6560"; }}
                              >
                                ×
                              </button>
                            </div>
                          ))}

                          {centerAddingTaskFor === todo.id ? (
                            <div style={{ alignItems: "center", display: "flex", gap: "0.6rem", padding: "0.3rem 1.5rem 0.3rem 2.6rem" }}>
                              <div style={{ border: "1px solid #6b6560", borderRadius: "3px", flexShrink: 0, height: 16, width: 16 }} />
                              <input
                                autoFocus
                                value={centerNewTaskTitle}
                                onChange={e => setCenterNewTaskTitle(e.target.value)}
                                placeholder="Task title..."
                                onKeyDown={e => {
                                  if (e.key === "Enter") { e.preventDefault(); handleCenterAddTask(todo.id); }
                                  if (e.key === "Escape") { setCenterAddingTaskFor(null); setCenterNewTaskTitle(""); }
                                }}
                                onBlur={() => handleCenterAddTask(todo.id)}
                                style={{ ...fieldInput, flex: 1, fontSize: "0.72rem", padding: "0.2rem 0.4rem" }}
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => { setCenterAddingTaskFor(todo.id); setCenterNewTaskTitle(""); }}
                              style={{ background: "none", border: "none", color: "#6b6560", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem", letterSpacing: "0.05em", padding: "0.25rem 0 0.25rem 2.6rem", transition: "color 0.15s", width: "100%", textAlign: "left" }}
                              onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; }}
                              onMouseLeave={e => { e.currentTarget.style.color = "#6b6560"; }}
                            >
                              + Add task
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Inline add To Do */}
                {addingTodoToProject ? (
                  <div style={{ borderBottom: "1px solid #1e2330", padding: "0.5rem 1.5rem 0.5rem 2.25rem" }}>
                    <input
                      autoFocus
                      value={newTodoTitle}
                      onChange={e => setNewTodoTitle(e.target.value)}
                      placeholder="To Do title..."
                      onKeyDown={e => {
                        if (e.key === "Enter") { e.preventDefault(); handleAddTodoToProject(); }
                        if (e.key === "Escape") { setAddingTodoToProject(false); setNewTodoTitle(""); }
                      }}
                      onBlur={handleAddTodoToProject}
                      style={{ ...fieldInput, fontSize: "0.82rem" }}
                    />
                  </div>
                ) : (
                  <div style={{ padding: "0.5rem 1.5rem" }}>
                    <button
                      onClick={() => setAddingTodoToProject(true)}
                      style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.05em", padding: "0.2rem 0", transition: "color 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#a8a29c"; }}
                    >
                      + Add To Do
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right panel */}
        <aside style={{
          borderLeft: "1px solid #1e2330",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
          width: 300,
        }}>
          {!rightPanelForm ? (
            <div style={{ alignItems: "center", display: "flex", flex: 1, flexDirection: "column", justifyContent: "center" }}>
              <div style={{ color: "#6b6560", fontFamily: "monospace", fontSize: "0.68rem", padding: "1rem", textAlign: "center" }}>
                Select a To Do to view details
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1rem 2rem" }}>

              {/* Title */}
              <input
                value={rightPanelForm.title || ""}
                onChange={e => setRightField("title", e.target.value)}
                onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "#6b6560"; handleRightBlur("title"); }}
                style={{ ...fieldInput, fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: "1rem", marginBottom: "1.1rem", padding: "0.4rem 0.5rem" }}
              />

              {/* Status + Priority */}
              <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.75rem" }}>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>Status</label>
                  <select value={rightPanelForm.status || "not-started"} onChange={e => handleRightSelectChange("status", e.target.value)} style={fieldSelect}>
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>Priority</label>
                  <select value={rightPanelForm.priority || "medium"} onChange={e => handleRightSelectChange("priority", e.target.value)} style={fieldSelect}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={fieldLabel}>Due Date</label>
                <DatePicker
                  selected={rightPanelForm.dueDate ? new Date(rightPanelForm.dueDate) : null}
                  onChange={date => {
                    const val = date ? date.toISOString() : null;
                    setRightField("dueDate", val);
                    saveRightField("dueDate", val);
                  }}
                  dateFormat="MMM d, yyyy"
                  customInput={<DueDateBtn value={rightPanelForm.dueDate ? new Date(rightPanelForm.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null} />}
                  popperPlacement="bottom-start"
                  isClearable
                />
              </div>

              {/* Assignee + Cost */}
              <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.75rem" }}>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>Assignee</label>
                  <input
                    value={rightPanelForm.assignee || ""}
                    onChange={e => setRightField("assignee", e.target.value)}
                    onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#6b6560"; handleRightBlur("assignee"); }}
                    placeholder="—"
                    style={fieldInput}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>Est. Cost ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={rightPanelForm.estimatedCostText || ""}
                    onChange={e => setRightField("estimatedCostText", e.target.value)}
                    onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#6b6560"; handleRightBlur("estimatedCost"); }}
                    placeholder="—"
                    style={fieldInput}
                  />
                </div>
              </div>

              {/* Category + Item */}
              <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.75rem" }}>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>Category</label>
                  <select
                    value={rightPanelForm.linkedCategory || ""}
                    onChange={e => {
                      handleRightSelectChange("linkedCategory", e.target.value || null);
                      if (!e.target.value) handleRightSelectChange("linkedItem", null);
                    }}
                    style={fieldSelect}
                  >
                    <option value="">None</option>
                    {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>Item</label>
                  <select
                    value={rightPanelForm.linkedItem || ""}
                    onChange={e => handleRightSelectChange("linkedItem", e.target.value || null)}
                    style={{ ...fieldSelect, opacity: !rightPanelForm.linkedCategory ? 0.4 : 1 }}
                    disabled={!rightPanelForm.linkedCategory}
                  >
                    <option value="">Category-level</option>
                    {linkedItems.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </div>

              {/* Project */}
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={fieldLabel}>Project</label>
                <select
                  value={rightPanelForm.projectId || ""}
                  onChange={e => handleRightSelectChange("projectId", e.target.value || null)}
                  style={fieldSelect}
                >
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Labels */}
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={fieldLabel}>Labels</label>
                <input
                  value={rightPanelForm.labelsText || ""}
                  onChange={e => setRightField("labelsText", e.target.value)}
                  onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#6b6560"; handleRightBlur("labels"); }}
                  placeholder="Plumbing, Seasonal..."
                  style={fieldInput}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={fieldLabel}>Description</label>
                <textarea
                  value={rightPanelForm.description || ""}
                  onChange={e => setRightField("description", e.target.value)}
                  onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#6b6560"; handleRightBlur("description"); }}
                  placeholder="Notes..."
                  rows={3}
                  style={{ ...fieldInput, resize: "vertical" }}
                />
              </div>

              {/* Tasks */}
              <div style={{ borderTop: "1px solid #1e2330", paddingTop: "0.85rem" }}>
                <label style={{ ...fieldLabel, marginBottom: "0.5rem" }}>Tasks</label>
                {(selectedTodo?.tasks || []).map(task => (
                  <div key={task.id} style={{ alignItems: "center", display: "flex", gap: "0.5rem", marginBottom: "0.3rem" }}>
                    <TaskCheckbox completed={task.completed} onToggle={() => selectedTodo && handleToggleTask(selectedTodo.id, task.id)} />
                    <span style={{
                      color: task.completed ? "#a8a29c" : "#a89e8e",
                      flex: 1,
                      fontFamily: "monospace",
                      fontSize: "0.72rem",
                      textDecoration: task.completed ? "line-through" : "none",
                    }}>
                      {task.title}
                    </span>
                    <button
                      onClick={() => selectedTodo && handleDeleteTask(selectedTodo.id, task.id)}
                      style={{ background: "none", border: "none", color: "#6b6560", cursor: "pointer", fontFamily: "monospace", fontSize: "0.7rem", padding: "0 0.1rem", transition: "color 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#6b6560"; }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {rightAddingTask ? (
                  <div style={{ alignItems: "center", display: "flex", gap: "0.5rem", marginTop: "0.3rem" }}>
                    <div style={{ border: "1px solid #6b6560", borderRadius: "3px", flexShrink: 0, height: 16, width: 16 }} />
                    <input
                      autoFocus
                      value={rightNewTaskTitle}
                      onChange={e => setRightNewTaskTitle(e.target.value)}
                      placeholder="Task title..."
                      onKeyDown={e => {
                        if (e.key === "Enter") { e.preventDefault(); handleRightAddTask(); }
                        if (e.key === "Escape") { setRightAddingTask(false); setRightNewTaskTitle(""); }
                      }}
                      onBlur={handleRightAddTask}
                      style={{ ...fieldInput, flex: 1, fontSize: "0.72rem", padding: "0.2rem 0.4rem" }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setRightAddingTask(true)}
                    style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem", letterSpacing: "0.05em", marginTop: "0.25rem", padding: "0.2rem 0", transition: "color 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#a8a29c"; }}
                  >
                    + Add task
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
