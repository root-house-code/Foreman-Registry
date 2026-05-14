import { useState } from "react";
import TodoModal from "./TodoModal.jsx";
import ProjectModal from "./ProjectModal.jsx";

const PRIORITY_COLORS = {
  urgent: "#f87171",
  high:   "#f59e0b",
  medium: "#c9a96e",
  low:    "#a8a29c",
};

function PriorityBadge({ priority }) {
  const color = PRIORITY_COLORS[priority] || "#a8a29c";
  return (
    <span style={{
      background: `${color}18`,
      border: `1px solid ${color}40`,
      borderRadius: "2px",
      color,
      flexShrink: 0,
      fontFamily: "monospace",
      fontSize: "0.56rem",
      letterSpacing: "0.08em",
      padding: "0.1rem 0.35rem",
      textTransform: "uppercase",
    }}>
      {priority}
    </span>
  );
}

function SectionCheckbox({ selected, total, onToggle }) {
  const allSelected = selected === total && total > 0;
  return (
    <button
      onClick={onToggle}
      style={{
        background: "none",
        border: "none",
        color: allSelected ? "#c9a96e" : "#a8a29c",
        cursor: "pointer",
        fontFamily: "monospace",
        fontSize: "0.6rem",
        letterSpacing: "0.06em",
        padding: "0.1rem 0",
        transition: "color 0.15s",
      }}
    >
      {allSelected ? "deselect all" : "select all"}
    </button>
  );
}

export default function InspectionReview({ data, categories, categoryItems, allProjects, onImport, onCancel }) {
  const [localData, setLocalData] = useState({
    appliances: data.appliances,
    todos:      data.todos,
    projects:   data.projects,
  });

  const [selections, setSelections] = useState({
    appliances: new Set(data.appliances.map((_, i) => i)),
    todos:      new Set(data.todos.map((_, i) => i)),
    projects:   new Set(data.projects.map((_, i) => i)),
  });

  // editModal: null | { type: "todo" | "project" | "convert", index: number }
  const [editModal, setEditModal] = useState(null);

  function toggle(section, idx) {
    setSelections(prev => {
      const next = new Set(prev[section]);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return { ...prev, [section]: next };
    });
  }

  function toggleSection(section, items) {
    setSelections(prev => {
      const allSelected = prev[section].size === items.length;
      return {
        ...prev,
        [section]: allSelected ? new Set() : new Set(items.map((_, i) => i)),
      };
    });
  }

  function updateTodo(idx, updated) {
    setLocalData(prev => {
      const todos = [...prev.todos];
      todos[idx] = { ...todos[idx], ...updated };
      return { ...prev, todos };
    });
    setEditModal(null);
  }

  function updateProject(idx, updated) {
    setLocalData(prev => {
      const projects = [...prev.projects];
      projects[idx] = { ...projects[idx], ...updated };
      return { ...prev, projects };
    });
    setEditModal(null);
  }

  function convertTodoToProject(idx, projectData) {
    setLocalData(prev => {
      const todos = prev.todos.filter((_, i) => i !== idx);
      const projects = [...prev.projects, {
        name: projectData.name,
        description: projectData.description || "",
        priority: projectData.priority || "medium",
        status: projectData.status || "not-started",
        linkedCategory: projectData.linkedCategory || null,
        linkedItem: projectData.linkedItem || null,
        labels: projectData.labels || [],
        images: projectData.images || [],
        tasks: [],
      }];
      return { ...prev, todos, projects };
    });
    setSelections(prev => {
      // Rebuild todos set after removal: shift indices above idx down by 1
      const newTodos = new Set();
      prev.todos.forEach(i => {
        if (i < idx) newTodos.add(i);
        else if (i > idx) newTodos.add(i - 1);
      });
      const currentProjectCount = localData.projects.length;
      const newProjects = new Set([...prev.projects, currentProjectCount]);
      return { ...prev, todos: newTodos, projects: newProjects };
    });
    setEditModal(null);
  }

  const totalSelected = selections.appliances.size + selections.todos.size + selections.projects.size;

  function handleImport() {
    onImport({
      appliances: localData.appliances.filter((_, i) => selections.appliances.has(i)),
      todos:      localData.todos.filter((_, i) => selections.todos.has(i)),
      projects:   localData.projects.filter((_, i) => selections.projects.has(i)),
    });
  }

  const sectionHeader = (label, count, selectedCount, section, items) => (
    <div style={{ alignItems: "center", borderBottom: "1px solid #1e2330", display: "flex", justifyContent: "space-between", padding: "0.6rem 1.25rem 0.5rem" }}>
      <div style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}>
        <span style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          {label}
        </span>
        <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.6rem" }}>
          {selectedCount}/{count} selected
        </span>
      </div>
      <SectionCheckbox
        selected={selectedCount}
        total={count}
        onToggle={() => toggleSection(section, items)}
      />
    </div>
  );

  const editingTodo = editModal?.type === "todo" ? localData.todos[editModal.index] : null;
  const editingProject = editModal?.type === "project" ? localData.projects[editModal.index] : null;
  const convertingTodo = editModal?.type === "convert" ? localData.todos[editModal.index] : null;

  return (
    <div
      style={{ alignItems: "center", background: "rgba(0,0,0,0.75)", bottom: 0, display: "flex", justifyContent: "center", left: 0, position: "fixed", right: 0, top: 0, zIndex: 1000 }}
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: "#0f1117", border: "1px solid #a8a29c", borderRadius: "8px", display: "flex", flexDirection: "column", maxHeight: "85vh", maxWidth: 620, overflow: "hidden", width: "90%" }}>

        {/* Header */}
        <div style={{ borderBottom: "1px solid #1e2330", flexShrink: 0, padding: "1.25rem 1.5rem 1rem" }}>
          <div style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.15em", marginBottom: "0.35rem", textTransform: "uppercase" }}>
            Inspection Import Review
          </div>
          <div style={{ color: "#e8e4dd", fontFamily: "'Georgia','Times New Roman',serif", fontSize: "1.05rem", marginBottom: "0.5rem" }}>
            Select what to add to Foreman
          </div>
          <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.68rem" }}>
            Found {localData.appliances.length} {localData.appliances.length === 1 ? "appliance" : "appliances"} · {localData.todos.length} {localData.todos.length === 1 ? "to do" : "to dos"} · {localData.projects.length} {localData.projects.length === 1 ? "project" : "projects"}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* Appliances */}
          {localData.appliances.length > 0 && (
            <div style={{ borderBottom: "1px solid #1e2330" }}>
              {sectionHeader("Appliances", localData.appliances.length, selections.appliances.size, "appliances", localData.appliances)}
              {localData.appliances.map((a, i) => (
                <div
                  key={i}
                  onClick={() => toggle("appliances", i)}
                  style={{
                    alignItems: "flex-start",
                    borderBottom: i < localData.appliances.length - 1 ? "1px solid #1e2330" : "none",
                    cursor: "pointer",
                    display: "flex",
                    gap: "0.75rem",
                    opacity: selections.appliances.has(i) ? 1 : 0.4,
                    padding: "0.65rem 1.25rem",
                    transition: "opacity 0.1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#13161f"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ alignItems: "center", border: `1px solid ${selections.appliances.has(i) ? "#c9a96e" : "#a8a29c"}`, borderRadius: "2px", display: "flex", flexShrink: 0, height: 14, justifyContent: "center", marginTop: 2, width: 14 }}>
                    {selections.appliances.has(i) && <span style={{ color: "#c9a96e", fontSize: "0.55rem", lineHeight: 1 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.78rem", marginBottom: "0.15rem" }}>
                      {a.item}
                      {a.category && <span style={{ color: "#a8a29c", fontSize: "0.65rem", marginLeft: "0.5rem" }}>— {a.category}</span>}
                    </div>
                    <div style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.62rem" }}>
                      {[a.manufacturer, a.model, a.age].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* To Dos */}
          {localData.todos.length > 0 && (
            <div style={{ borderBottom: "1px solid #1e2330" }}>
              {sectionHeader("To Dos", localData.todos.length, selections.todos.size, "todos", localData.todos)}
              {localData.todos.map((t, i) => (
                <div
                  key={i}
                  style={{
                    alignItems: "flex-start",
                    borderBottom: i < localData.todos.length - 1 ? "1px solid #1e2330" : "none",
                    borderLeft: `3px solid ${PRIORITY_COLORS[t.priority] || "#a8a29c"}`,
                    display: "flex",
                    gap: "0.75rem",
                    opacity: selections.todos.has(i) ? 1 : 0.4,
                    padding: "0.65rem 1.25rem 0.65rem 1rem",
                    transition: "opacity 0.1s",
                  }}
                >
                  {/* Checkbox */}
                  <div
                    onClick={() => toggle("todos", i)}
                    style={{ alignItems: "center", border: `1px solid ${selections.todos.has(i) ? "#c9a96e" : "#a8a29c"}`, borderRadius: "2px", cursor: "pointer", display: "flex", flexShrink: 0, height: 14, justifyContent: "center", marginTop: 3, width: 14 }}
                  >
                    {selections.todos.has(i) && <span style={{ color: "#c9a96e", fontSize: "0.55rem", lineHeight: 1 }}>✓</span>}
                  </div>

                  {/* Content — clickable to edit */}
                  <div
                    onClick={() => setEditModal({ type: "todo", index: i })}
                    style={{ cursor: "pointer", flex: 1, minWidth: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "0.8"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                  >
                    <div style={{ alignItems: "center", display: "flex", gap: "0.4rem", marginBottom: "0.2rem" }}>
                      <PriorityBadge priority={t.priority} />
                      <span style={{ color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.title}
                      </span>
                    </div>
                    {t.description && (
                      <div style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.62rem", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {t.description}
                      </div>
                    )}
                    {(t.linkedCategory || t.linkedItem) && (
                      <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.6rem", marginTop: "0.2rem" }}>
                        {[t.linkedCategory, t.linkedItem].filter(Boolean).join(" → ")}
                      </div>
                    )}
                  </div>

                  {/* Convert to project button */}
                  <button
                    onClick={e => { e.stopPropagation(); setEditModal({ type: "convert", index: i }); }}
                    title="Convert to project"
                    style={{
                      alignSelf: "center",
                      background: "none",
                      border: "1px solid #1e2330",
                      borderRadius: "2px",
                      color: "#4a5060",
                      cursor: "pointer",
                      flexShrink: 0,
                      fontFamily: "monospace",
                      fontSize: "0.55rem",
                      letterSpacing: "0.06em",
                      padding: "0.15rem 0.4rem",
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#c9a96e40"; e.currentTarget.style.color = "#c9a96e"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2330"; e.currentTarget.style.color = "#4a5060"; }}
                  >
                    → project
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Projects */}
          {localData.projects.length > 0 && (
            <div>
              {sectionHeader("Projects", localData.projects.length, selections.projects.size, "projects", localData.projects)}
              {localData.projects.map((p, i) => (
                <div
                  key={i}
                  style={{
                    alignItems: "flex-start",
                    borderBottom: i < localData.projects.length - 1 ? "1px solid #1e2330" : "none",
                    display: "flex",
                    gap: "0.75rem",
                    opacity: selections.projects.has(i) ? 1 : 0.4,
                    padding: "0.65rem 1.25rem",
                    transition: "opacity 0.1s",
                  }}
                >
                  {/* Checkbox */}
                  <div
                    onClick={() => toggle("projects", i)}
                    style={{ alignItems: "center", border: `1px solid ${selections.projects.has(i) ? "#c9a96e" : "#a8a29c"}`, borderRadius: "2px", cursor: "pointer", display: "flex", flexShrink: 0, height: 14, justifyContent: "center", marginTop: 3, width: 14 }}
                  >
                    {selections.projects.has(i) && <span style={{ color: "#c9a96e", fontSize: "0.55rem", lineHeight: 1 }}>✓</span>}
                  </div>

                  {/* Content — clickable to edit */}
                  <div
                    onClick={() => setEditModal({ type: "project", index: i })}
                    style={{ cursor: "pointer", flex: 1, minWidth: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "0.8"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                  >
                    <div style={{ alignItems: "center", display: "flex", gap: "0.4rem", marginBottom: "0.2rem" }}>
                      <PriorityBadge priority={p.priority} />
                      <span style={{ color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </span>
                    </div>
                    {p.description && (
                      <div style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.62rem", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {p.description}
                      </div>
                    )}
                    {(p.linkedCategory || p.linkedItem) && (
                      <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.6rem", marginTop: "0.2rem" }}>
                        {[p.linkedCategory, p.linkedItem].filter(Boolean).join(" → ")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {localData.appliances.length === 0 && localData.todos.length === 0 && localData.projects.length === 0 && (
            <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.75rem", padding: "2.5rem 1.5rem", textAlign: "center" }}>
              No items were extracted from this report.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ alignItems: "center", borderTop: "1px solid #1e2330", display: "flex", flexShrink: 0, gap: "0.75rem", justifyContent: "flex-end", padding: "1rem 1.25rem" }}>
          <button
            onClick={onCancel}
            style={{ background: "transparent", border: "1px solid #a8a29c", borderRadius: "3px", color: "#8b7d6b", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.45rem 1rem", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#e8e4dd"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#8b7d6b"; }}
          >
            Start Over
          </button>
          <button
            onClick={handleImport}
            disabled={totalSelected === 0}
            style={{ background: totalSelected > 0 ? "#c9a96e18" : "transparent", border: `1px solid ${totalSelected > 0 ? "#c9a96e" : "#a8a29c"}`, borderRadius: "3px", color: totalSelected > 0 ? "#c9a96e" : "#a8a29c", cursor: totalSelected > 0 ? "pointer" : "default", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.45rem 1.25rem", transition: "all 0.15s" }}
            onMouseEnter={e => { if (totalSelected > 0) e.currentTarget.style.background = "#c9a96e28"; }}
            onMouseLeave={e => { if (totalSelected > 0) e.currentTarget.style.background = "#c9a96e18"; }}
          >
            Import Selected ({totalSelected})
          </button>
        </div>
      </div>

      {/* Edit to do modal */}
      {editingTodo && (
        <TodoModal
          todo={editingTodo}
          categories={categories || []}
          categoryItems={categoryItems || {}}
          projects={allProjects || []}
          onSave={updated => updateTodo(editModal.index, updated)}
          onClose={() => setEditModal(null)}
        />
      )}

      {/* Edit project modal */}
      {editingProject && (
        <ProjectModal
          project={editingProject}
          categories={categories || []}
          categoryItems={categoryItems || {}}
          onSave={updated => updateProject(editModal.index, updated)}
          onClose={() => setEditModal(null)}
        />
      )}

      {/* Convert to do → project modal */}
      {convertingTodo && (
        <ProjectModal
          project={{
            name: convertingTodo.title || "",
            description: convertingTodo.description || "",
            priority: convertingTodo.priority || "medium",
            status: "not-started",
            linkedCategory: convertingTodo.linkedCategory || null,
            linkedItem: convertingTodo.linkedItem || null,
            labels: convertingTodo.labels || [],
            images: convertingTodo.images || [],
            tasks: [],
          }}
          categories={categories || []}
          categoryItems={categoryItems || {}}
          onSave={projectData => convertTodoToProject(editModal.index, projectData)}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  );
}
