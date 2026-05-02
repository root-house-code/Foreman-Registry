import { useState, useMemo, forwardRef } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import { loadTodos, saveTodos, createTodo } from "./lib/todos.js";
import { loadData } from "./lib/data.js";
import { loadDeletedCategories } from "./lib/deletedCategories.js";
import { loadDeletedItems } from "./lib/deletedItems.js";

const PRIORITY_COLORS = {
  low:    "#4ade80",
  medium: "#c9a96e",
  high:   "#f59e0b",
  urgent: "#f87171",
};

const PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };

const STATUS_COLUMNS = [
  { key: "not-started", label: "Not Started" },
  { key: "in-progress", label: "In Progress" },
  { key: "done",        label: "Done" },
];

function navBtnStyle(hovered) {
  return {
    background: "transparent",
    border: `1px solid ${hovered ? "#c9a96e" : "#2e3448"}`,
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
  color: "#5a5460",
  display: "block",
  fontFamily: "monospace",
  fontSize: "0.6rem",
  letterSpacing: "0.12em",
  marginBottom: "0.3rem",
  textTransform: "uppercase",
};

const fieldInput = {
  background: "#13161f",
  border: "1px solid #2a2f3e",
  borderRadius: "3px",
  boxSizing: "border-box",
  color: "#d4c9b8",
  fontFamily: "monospace",
  fontSize: "0.78rem",
  outline: "none",
  padding: "0.35rem 0.5rem",
  width: "100%",
};

const fieldSelect = {
  ...fieldInput,
  cursor: "pointer",
};

const DueDateBtn = forwardRef(({ value, onClick }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    style={{
      ...fieldInput,
      cursor: "pointer",
      color: value ? "#d4c9b8" : "#5a5460",
      textAlign: "left",
    }}
  >
    {value || "No date"}
  </button>
));

function TodoModal({ todo, categories, categoryItems, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(todo ? {
    ...todo,
    labels: todo.labels || [],
    estimatedCost: todo.estimatedCost ?? "",
  } : {
    title: "", description: "", status: "not-started", priority: "medium",
    dueDate: null, assignee: "", labels: [], estimatedCost: "",
    linkedCategory: null, linkedItem: null,
  });

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const linkedItems = form.linkedCategory ? (categoryItems[form.linkedCategory] || []) : [];

  return createPortal(
    <div
      onClick={onClose}
      style={{
        alignItems: "center",
        background: "rgba(0,0,0,0.7)",
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        left: 0,
        position: "fixed",
        right: 0,
        top: 0,
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#1a1f2e",
          border: "1px solid #2e3448",
          borderRadius: "8px",
          maxHeight: "90vh",
          maxWidth: 540,
          overflowY: "auto",
          padding: "2rem",
          width: "90%",
        }}
      >
        <div style={{
          color: "#f0e6d3",
          fontFamily: "monospace",
          fontSize: "0.72rem",
          letterSpacing: "0.15em",
          marginBottom: "1.5rem",
          textTransform: "uppercase",
        }}>
          {todo ? "Edit To Do" : "New To Do"}
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={fieldLabel}>Title</label>
          <input
            autoFocus
            value={form.title}
            onChange={e => set("title", e.target.value)}
            placeholder="What needs to be done?"
            style={fieldInput}
            onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#2a2f3e"; }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={fieldLabel}>Description</label>
          <textarea
            value={form.description}
            onChange={e => set("description", e.target.value)}
            placeholder="Additional notes or context..."
            rows={2}
            style={{ ...fieldInput, resize: "vertical" }}
            onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#2a2f3e"; }}
          />
        </div>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label style={fieldLabel}>Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value)} style={fieldSelect}>
              {STATUS_COLUMNS.map(col => (
                <option key={col.key} value={col.key}>{col.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={fieldLabel}>Priority</label>
            <select value={form.priority} onChange={e => set("priority", e.target.value)} style={fieldSelect}>
              {["low", "medium", "high", "urgent"].map(p => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={fieldLabel}>Due Date</label>
            <DatePicker
              selected={form.dueDate ? new Date(form.dueDate) : null}
              onChange={date => set("dueDate", date ? date.toISOString() : null)}
              dateFormat="MMM d, yyyy"
              customInput={<DueDateBtn value={form.dueDate ? new Date(form.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null} />}
              popperPlacement="bottom-start"
              isClearable
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label style={fieldLabel}>Assignee</label>
            <input
              value={form.assignee}
              onChange={e => set("assignee", e.target.value)}
              placeholder="Homeowner, contractor..."
              style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "#2a2f3e"; }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={fieldLabel}>Est. Cost ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.estimatedCost}
              onChange={e => set("estimatedCost", e.target.value)}
              placeholder="0.00"
              style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "#2a2f3e"; }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label style={fieldLabel}>Category</label>
            <select
              value={form.linkedCategory || ""}
              onChange={e => { set("linkedCategory", e.target.value || null); set("linkedItem", null); }}
              style={fieldSelect}
            >
              <option value="">None</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={fieldLabel}>Item</label>
            <select
              value={form.linkedItem || ""}
              onChange={e => set("linkedItem", e.target.value || null)}
              style={{ ...fieldSelect, opacity: !form.linkedCategory ? 0.4 : 1 }}
              disabled={!form.linkedCategory}
            >
              <option value="">Category-level</option>
              {linkedItems.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "1.75rem" }}>
          <label style={fieldLabel}>Labels</label>
          <input
            value={form.labels.join(", ")}
            onChange={e => set("labels", e.target.value.split(",").map(l => l.trim()).filter(Boolean))}
            placeholder="Plumbing, Seasonal, Cosmetic..."
            style={fieldInput}
            onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#2a2f3e"; }}
          />
          <span style={{ color: "#3a3440", fontFamily: "monospace", fontSize: "0.6rem", marginTop: "0.25rem", display: "block" }}>
            Comma-separated
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between" }}>
          <div>
            {todo && onDelete && (
              <button
                onClick={() => { onDelete(); onClose(); }}
                style={{
                  background: "transparent",
                  border: "1px solid #f8717140",
                  borderRadius: "3px",
                  color: "#f87171",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: "0.72rem",
                  letterSpacing: "0.08em",
                  padding: "0.4rem 0.9rem",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f8717118"; e.currentTarget.style.borderColor = "#f87171"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#f8717140"; }}
              >
                Delete
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={onClose}
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
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#5a5460"; e.currentTarget.style.color = "#d4c9b8"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#2e3448"; e.currentTarget.style.color = "#8b7d6b"; }}
            >
              Cancel
            </button>
            <button
              onClick={() => { if (form.title.trim()) onSave({ ...form, estimatedCost: form.estimatedCost !== "" ? parseFloat(form.estimatedCost) : null }); }}
              disabled={!form.title.trim()}
              style={{
                background: form.title.trim() ? "#c9a96e18" : "transparent",
                border: `1px solid ${form.title.trim() ? "#c9a96e40" : "#2e3448"}`,
                borderRadius: "3px",
                color: form.title.trim() ? "#c9a96e" : "#5a5460",
                cursor: form.title.trim() ? "pointer" : "default",
                fontFamily: "monospace",
                fontSize: "0.72rem",
                letterSpacing: "0.08em",
                padding: "0.4rem 0.9rem",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (form.title.trim()) { e.currentTarget.style.background = "#c9a96e30"; e.currentTarget.style.borderColor = "#c9a96e"; }}}
              onMouseLeave={e => { if (form.title.trim()) { e.currentTarget.style.background = "#c9a96e18"; e.currentTarget.style.borderColor = "#c9a96e40"; }}}
            >
              {todo ? "Save Changes" : "Create To Do"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
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
        background: "#1a1f2e",
        border: "1px solid #2e3448",
        borderLeft: `3px solid ${PRIORITY_COLORS[todo.priority] || "#c9a96e"}`,
        borderRadius: "6px",
        cursor: "grab",
        marginBottom: "0.5rem",
        opacity: isDragging ? 0.4 : 1,
        padding: "0.65rem 0.75rem",
        transition: "border-color 0.15s, opacity 0.15s",
        userSelect: "none",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#3a3f52"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#2e3448"; }}
    >
      <div style={{
        color: isDone ? "#5a5460" : "#d4c9b8",
        fontSize: "0.82rem",
        lineHeight: 1.35,
        marginBottom: "0.35rem",
        textDecoration: isDone ? "line-through" : "none",
      }}>
        {todo.title}
      </div>

      {todo.labels?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "0.35rem" }}>
          {todo.labels.map(label => (
            <span key={label} style={{
              background: "#2a2f3e",
              borderRadius: "2px",
              color: "#8b7d6b",
              fontFamily: "monospace",
              fontSize: "0.58rem",
              letterSpacing: "0.06em",
              padding: "0.1rem 0.35rem",
            }}>
              {label}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "0.5rem" }}>
        <div style={{ minWidth: 0 }}>
          {(todo.linkedCategory || todo.linkedItem) && (
            <div style={{ color: "#3a3440", fontFamily: "monospace", fontSize: "0.62rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {todo.linkedItem
                ? `${todo.linkedCategory} › ${todo.linkedItem}`
                : todo.linkedCategory}
            </div>
          )}
          {todo.assignee && (
            <div style={{ color: "#3a3440", fontFamily: "monospace", fontSize: "0.62rem" }}>
              {todo.assignee}
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          {todo.estimatedCost != null && (
            <div style={{ color: "#5a5460", fontFamily: "monospace", fontSize: "0.62rem" }}>
              ${Number(todo.estimatedCost).toLocaleString()}
            </div>
          )}
          {todo.dueDate && (
            <div style={{ color: isOverdue ? "#f87171" : "#5a5460", fontFamily: "monospace", fontSize: "0.62rem" }}>
              {new Date(todo.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BoardPage({ navigate }) {
  const [todos, setTodos] = useState(() => loadTodos());
  const [modalState, setModalState] = useState(null); // null | "new" | { todo, colKey } | todo-object
  const [navHovered, setNavHovered] = useState({});
  const [dragging, setDragging] = useState(null); // todo id
  const [dragOverCol, setDragOverCol] = useState(null);

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

  function persistTodos(next) {
    setTodos(next);
    saveTodos(next);
  }

  function handleSaveTodo(form) {
    const now = new Date().toISOString();
    if (modalState && modalState !== "new" && typeof modalState === "object" && modalState.id) {
      const prev = modalState;
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

  function handleStatusChange(id, status) {
    const now = new Date().toISOString();
    persistTodos(todos.map(t => t.id === id ? {
      ...t, status,
      completedDate: status === "done" ? now : null,
    } : t));
  }

  function handleDrop(colKey) {
    if (!dragging) return;
    handleStatusChange(dragging, colKey);
    setDragging(null);
    setDragOverCol(null);
  }

  const todosByStatus = useMemo(() => {
    const map = { "not-started": [], "in-progress": [], "done": [] };
    todos.forEach(t => { if (map[t.status]) map[t.status].push(t); });
    return map;
  }, [todos]);

  const modalTodo = modalState && modalState !== "new" && typeof modalState === "object" && modalState.id
    ? modalState
    : null;

  return (
    <div style={{
      background: "#0f1117",
      color: "#e8e0d0",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      minHeight: "100vh",
      padding: 0,
    }}>

      {modalState !== null && (
        <TodoModal
          todo={modalTodo}
          categories={categories}
          categoryItems={categoryItems}
          onSave={handleSaveTodo}
          onClose={() => setModalState(null)}
          onDelete={modalTodo ? () => handleDelete(modalTodo.id) : null}
        />
      )}

      <div style={{
        background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 60%)",
        borderBottom: "1px solid #2a2f3e",
        padding: "2rem",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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
                PROJECT
              </span>
              <span style={{ color: "#c9a96e", fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: "clamp(0.95rem, 2vw, 1.15rem)", letterSpacing: "0.01em" }}>
                Board
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <button
              onClick={() => navigate("inventory")}
              onMouseEnter={() => setNavHovered(h => ({ ...h, inv: true }))}
              onMouseLeave={() => setNavHovered(h => ({ ...h, inv: false }))}
              style={navBtnStyle(navHovered.inv)}
            >
              Inventory
            </button>
            <button
              onClick={() => navigate("registry")}
              onMouseEnter={() => setNavHovered(h => ({ ...h, reg: true }))}
              onMouseLeave={() => setNavHovered(h => ({ ...h, reg: false }))}
              style={navBtnStyle(navHovered.reg)}
            >
              Registry
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 2rem 4rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
          <span style={{ color: "#5a5460", fontFamily: "monospace", fontSize: "0.72rem" }}>
            {todos.length} {todos.length === 1 ? "to do" : "to dos"}
          </span>
          <button
            onClick={() => setModalState("new")}
            style={{
              background: "#c9a96e18",
              border: "1px solid #c9a96e40",
              borderRadius: "3px",
              color: "#c9a96e",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              padding: "0.4rem 0.9rem",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#c9a96e30"; e.currentTarget.style.borderColor = "#c9a96e"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#c9a96e18"; e.currentTarget.style.borderColor = "#c9a96e40"; }}
          >
            + New To Do
          </button>
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
                  borderRadius: "8px",
                  flex: 1,
                  minHeight: 240,
                  padding: "0.75rem",
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                  <span style={{
                    color: "#c9a96e",
                    fontFamily: "monospace",
                    fontSize: "0.62rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}>
                    {col.label}
                  </span>
                  <span style={{ color: "#3a3440", fontFamily: "monospace", fontSize: "0.65rem" }}>
                    {colTodos.length}
                  </span>
                </div>

                {colTodos.map(todo => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    onEdit={() => setModalState(todo)}
                    isDragging={dragging === todo.id}
                    onDragStart={() => setDragging(todo.id)}
                    onDragEnd={() => { setDragging(null); setDragOverCol(null); }}
                  />
                ))}

                <button
                  onClick={() => setModalState({ colKey: col.key })}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#3a3440",
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                    marginTop: "0.25rem",
                    padding: "0.3rem 0",
                    transition: "color 0.15s",
                    width: "100%",
                    textAlign: "left",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#3a3440"; }}
                >
                  + Add
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
