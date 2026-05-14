import { useState } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import AssigneeInput from "./AssigneeInput.jsx";
import ImageAttachments from "./ImageAttachments.jsx";
import { fieldLabel, fieldInput, fieldSelect, DueDateBtn, STATUS_COLUMNS, PRIORITY_LABELS } from "./ModalShared.jsx";

export default function TodoModal({ todo, categories, categoryItems, projects, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(todo ? {
    ...todo,
    labels: todo.labels || [],
    estimatedCost: todo.estimatedCost ?? "",
    images: todo.images || [],
  } : {
    title: "", description: "", status: "not-started", priority: "medium",
    dueDate: null, assignee: "", labels: [], estimatedCost: "",
    linkedCategory: null, linkedItem: null, projectId: null, images: [],
  });

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const linkedItems = form.linkedCategory ? (categoryItems[form.linkedCategory] || []) : [];

  return createPortal(
    <div
      onClick={onClose}
      style={{
        alignItems: "center", background: "rgba(0,0,0,0.7)", bottom: 0,
        display: "flex", justifyContent: "center", left: 0,
        position: "fixed", right: 0, top: 0, zIndex: 1100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#1a1f2e", border: "1px solid #a8a29c", borderRadius: "8px",
          maxHeight: "90vh", maxWidth: 540, overflowY: "auto", padding: "2rem", width: "90%",
        }}
      >
        <div style={{ color: "#f0e6d3", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.15em", marginBottom: "1.5rem", textTransform: "uppercase" }}>
          {todo ? "Edit To Do" : "New To Do"}
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={fieldLabel}>Title</label>
          <input autoFocus value={form.title} onChange={e => set("title", e.target.value)}
            placeholder="What needs to be done?" style={fieldInput}
            onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#a8a29c"; }} />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={fieldLabel}>Description</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)}
            placeholder="Additional notes or context..." rows={2}
            style={{ ...fieldInput, resize: "vertical" }}
            onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#a8a29c"; }} />
        </div>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label style={fieldLabel}>Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value)} style={fieldSelect}>
              {STATUS_COLUMNS.map(col => <option key={col.key} value={col.key}>{col.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={fieldLabel}>Priority</label>
            <select value={form.priority} onChange={e => set("priority", e.target.value)} style={fieldSelect}>
              {["low", "medium", "high", "urgent"].map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
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
            <AssigneeInput
              value={form.assignee}
              onChange={v => set("assignee", v)}
              placeholder="Homeowner, contractor..."
              style={fieldInput}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={fieldLabel}>Est. Cost ($)</label>
            <input type="number" min="0" step="0.01" value={form.estimatedCost}
              onChange={e => set("estimatedCost", e.target.value)} placeholder="0.00" style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "#a8a29c"; }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label style={fieldLabel}>Category</label>
            <select value={form.linkedCategory || ""} style={fieldSelect}
              onChange={e => { set("linkedCategory", e.target.value || null); set("linkedItem", null); }}>
              <option value="">None</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={fieldLabel}>Item</label>
            <select value={form.linkedItem || ""} onChange={e => set("linkedItem", e.target.value || null)}
              style={{ ...fieldSelect, opacity: !form.linkedCategory ? 0.4 : 1 }} disabled={!form.linkedCategory}>
              <option value="">Category-level</option>
              {linkedItems.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label style={fieldLabel}>Project</label>
            <select value={form.projectId || ""} onChange={e => set("projectId", e.target.value || null)} style={fieldSelect}>
              <option value="">None</option>
              {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={fieldLabel}>Labels</label>
          <input
            value={form.labels.join(", ")}
            onChange={e => set("labels", e.target.value.split(",").map(l => l.trim()).filter(Boolean))}
            placeholder="Plumbing, Seasonal, Cosmetic..." style={fieldInput}
            onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#a8a29c"; }} />
          <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.6rem", marginTop: "0.25rem", display: "block" }}>
            Comma-separated
          </span>
        </div>

        <div style={{ borderTop: "1px solid #1e2330", marginBottom: "1.75rem", paddingTop: "1rem" }}>
          <ImageAttachments
            imageIds={form.images}
            onChange={ids => set("images", ids)}
          />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between" }}>
          <div>
            {todo && onDelete && (
              <button onClick={() => { onDelete(); onClose(); }} style={{
                background: "transparent", border: "1px solid #f8717140", borderRadius: "3px",
                color: "#f87171", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem",
                letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f8717118"; e.currentTarget.style.borderColor = "#f87171"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#f8717140"; }}>
                Delete
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
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
              onClick={() => { if (form.title.trim()) onSave({ ...form, estimatedCost: form.estimatedCost !== "" ? parseFloat(form.estimatedCost) : null }); }}
              disabled={!form.title.trim()}
              style={{
                background: form.title.trim() ? "#c9a96e18" : "transparent",
                border: `1px solid ${form.title.trim() ? "#c9a96e40" : "#a8a29c"}`,
                borderRadius: "3px", color: form.title.trim() ? "#c9a96e" : "#a8a29c",
                cursor: form.title.trim() ? "pointer" : "default", fontFamily: "monospace",
                fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (form.title.trim()) { e.currentTarget.style.background = "#c9a96e30"; e.currentTarget.style.borderColor = "#c9a96e"; }}}
              onMouseLeave={e => { if (form.title.trim()) { e.currentTarget.style.background = "#c9a96e18"; e.currentTarget.style.borderColor = "#c9a96e40"; }}}>
              {todo ? "Save Changes" : "Create To Do"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
