import { useState, useMemo, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import PageNav from "./components/PageNav.jsx";
import ScheduleBadge from "./components/ScheduleBadge.jsx";
import { defaultData } from "./lib/data.js";
import { loadDeletedRows, saveDeletedRows } from "./lib/deletedRows.js";
import { CATEGORY_TIPS, ITEM_TIPS, TASK_TIPS } from "./lib/tooltips.js";
import { MANUFACTURERS_BY_ITEM } from "./lib/manufacturers.js";
import { getModels } from "./lib/models.js";
import { loadItemDetails } from "./lib/itemDetails.js";
import { loadCategoryFieldSchemas, loadItemFieldSchemas, loadCustomFieldValues } from "./lib/customFields.js";
import { loadGuideNotes, saveGuideNotes } from "./lib/guideNotes.js";

const SEASON_LABELS = { spring: "Spring", summer: "Summer", fall: "Fall", winter: "Winter" };

const EDITOR_STYLES = `
.foreman-note-editor .ProseMirror {
  color: #e8e4dd;
  font-family: monospace;
  font-size: 0.75rem;
  line-height: 1.75;
  min-height: 60px;
  outline: none;
}
.foreman-note-editor .ProseMirror > * + * { margin-top: 0.4rem; }
.foreman-note-editor .ProseMirror p { margin: 0; }
.foreman-note-editor .ProseMirror strong { color: #f0e6d3; }
.foreman-note-editor .ProseMirror em { font-style: italic; }
.foreman-note-editor .ProseMirror s { color: #a8a29c; }
.foreman-note-editor .ProseMirror code {
  background: #1a1f2e;
  border: 1px solid #a8a29c;
  border-radius: 2px;
  color: #8b7d6b;
  font-size: 0.7rem;
  padding: 0.1em 0.35em;
}
.foreman-note-editor .ProseMirror pre {
  background: #1a1f2e;
  border: 1px solid #a8a29c;
  border-radius: 3px;
  margin: 0.4rem 0;
  overflow-x: auto;
  padding: 0.5rem 0.75rem;
}
.foreman-note-editor .ProseMirror pre code {
  background: none;
  border: none;
  padding: 0;
}
.foreman-note-editor .ProseMirror blockquote {
  border-left: 2px solid #a8a29c;
  color: #a8a29c;
  margin: 0;
  padding-left: 0.75rem;
}
.foreman-note-editor .ProseMirror ul {
  list-style: disc;
  margin: 0;
  padding-left: 1.2rem;
}
.foreman-note-editor .ProseMirror ol {
  list-style: decimal;
  margin: 0;
  padding-left: 1.2rem;
}
.foreman-note-editor .ProseMirror li + li { margin-top: 0.15rem; }
.foreman-note-editor .ProseMirror h1 {
  color: #c9a96e;
  font-size: 0.85rem;
  font-weight: 500;
  margin: 0.5rem 0 0.2rem;
}
.foreman-note-editor .ProseMirror h2 {
  color: #c9a96e;
  font-size: 0.78rem;
  font-weight: 500;
  margin: 0.5rem 0 0.15rem;
}
.foreman-note-editor .ProseMirror h3 {
  color: #8b7d6b;
  font-size: 0.75rem;
  font-weight: 500;
  margin: 0.4rem 0 0.1rem;
}
.foreman-note-editor .ProseMirror.is-editor-empty:first-child::before {
  color: #a8a29c;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
`;

function timeAgo(isoStr) {
  if (!isoStr) return null;
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatPurchaseDate(isoStr) {
  if (!isoStr) return null;
  return new Date(isoStr).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ─── Item Detail Widget ────────────────────────────────────────────────────────────

const PANEL_LABEL = {
  color: "#c9a96e",
  fontFamily: "monospace",
  fontSize: "0.6rem",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
};

function DetailField({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
      <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem", flexShrink: 0 }}>{label}</span>
      <span style={{
        color: "#8b7d6b",
        fontFamily: "monospace",
        fontSize: "0.7rem",
        maxWidth: "58%",
        overflow: "hidden",
        textAlign: "right",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {value}
      </span>
    </div>
  );
}

function ItemDetailWidget({ selectedItem, itemDetails, categoryFieldSchemas = {}, itemFieldSchemas = {}, customFieldValues = {} }) {
  if (!selectedItem) {
    return (
      <div style={{
        alignItems: "center",
        borderBottom: "1px solid #13161f",
        display: "flex",
        flex: 1,
        justifyContent: "center",
        padding: "1rem",
      }}>
        <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.68rem" }}>
          Select an item
        </span>
      </div>
    );
  }

  const key = `${selectedItem.category}|${selectedItem.item}`;
  const d = itemDetails[key] || {};
  const catFields = categoryFieldSchemas[selectedItem.category] || [];
  const itmFields = itemFieldSchemas[key] || [];
  const allCustomFields = [...catFields, ...itmFields];
  const cfVals = customFieldValues[key] || {};

  function formatCustomValue(field) {
    const v = cfVals[field.id];
    if (!v && v !== 0) return null;
    if (field.type === "date") {
      const d = new Date(v);
      return isNaN(d) ? v : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    return String(v);
  }

  return (
    <div style={{
      borderBottom: "1px solid #13161f",
      display: "flex",
      flex: 1,
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e2330", flexShrink: 0, padding: "0.65rem 1rem 0.55rem" }}>
        <div style={PANEL_LABEL}>Item</div>
        <div style={{ color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.8rem", marginTop: "0.2rem" }}>
          {selectedItem.item}
          <span style={{ color: "#a8a29c", fontSize: "0.62rem", marginLeft: "0.5rem" }}>
            {"◆"} {selectedItem.category}
          </span>
        </div>
      </div>

      {/* Fields — extendable: add new DetailField rows or sections here */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.65rem 1rem" }}>
        <DetailField label="Manufacturer" value={d.manufacturer || null} />
        <DetailField label="Model"        value={d.model        || null} />
        <DetailField label="Serial"       value={d.serial       || null} />
        <DetailField label="Purchased"    value={formatPurchaseDate(d.purchaseDate)} />

        {!d.manufacturer && !d.model && !d.serial && !d.purchaseDate && !d.receipt && allCustomFields.length === 0 && (
          <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.65rem" }}>
            No details recorded — add them on the Inventory page.
          </div>
        )}

        {d.receipt && (
          <div style={{ marginTop: "0.6rem" }}>
            <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem", marginBottom: "0.3rem" }}>
              Receipt
            </div>
            <img
              src={d.receipt}
              alt="Receipt"
              onClick={() => window.open(d.receipt, "_blank")}
              style={{ borderRadius: "3px", cursor: "pointer", maxWidth: "100%", opacity: 0.85 }}
            />
          </div>
        )}

        {allCustomFields.length > 0 && (
          <div style={{ borderTop: "1px solid #1e2330", marginTop: "0.65rem", paddingTop: "0.65rem" }}>
            {allCustomFields.map(field => (
              <DetailField key={field.id} label={field.name} value={formatCustomValue(field)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Journal Widget ───────────────────────────────────────────────────────────────

function NoteToolbar({ editor }) {
  if (!editor) return null;

  const btns = [
    { label: "B",  cmd: () => editor.chain().focus().toggleBold().run(),        isActive: editor.isActive("bold"),        title: "Bold",          style: { fontWeight: "bold" } },
    { label: "I",  cmd: () => editor.chain().focus().toggleItalic().run(),      isActive: editor.isActive("italic"),      title: "Italic",        style: { fontStyle: "italic" } },
    { label: "S",  cmd: () => editor.chain().focus().toggleStrike().run(),      isActive: editor.isActive("strike"),      title: "Strikethrough", style: { textDecoration: "line-through" } },
    { label: "<>", cmd: () => editor.chain().focus().toggleCode().run(),        isActive: editor.isActive("code"),        title: "Inline code",   style: {} },
    { label: '"',  cmd: () => editor.chain().focus().toggleBlockquote().run(),  isActive: editor.isActive("blockquote"),  title: "Blockquote",    style: {} },
    { label: "•",  cmd: () => editor.chain().focus().toggleBulletList().run(),  isActive: editor.isActive("bulletList"),  title: "Bullet list",   style: {} },
    { label: "1.", cmd: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive("orderedList"), title: "Numbered list", style: {} },
  ];

  return (
    <div style={{
      borderBottom: "1px solid #1e2330",
      display: "flex",
      flexShrink: 0,
      gap: "0.1rem",
      padding: "0.3rem 0.65rem",
    }}>
      {btns.map(btn => (
        <button
          key={btn.label}
          onMouseDown={e => { e.preventDefault(); btn.cmd(); }}
          title={btn.title}
          style={{
            background: btn.isActive ? "#c9a96e18" : "transparent",
            border: `1px solid ${btn.isActive ? "#c9a96e40" : "transparent"}`,
            borderRadius: "3px",
            color: btn.isActive ? "#c9a96e" : "#a8a29c",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: "1.3rem",
            padding: "0.4rem 0.8rem",
            transition: "color 0.1s",
            ...btn.style,
          }}
          onMouseEnter={e => { if (!btn.isActive) e.currentTarget.style.color = "#8b7d6b"; }}
          onMouseLeave={e => { if (!btn.isActive) e.currentTarget.style.color = "#a8a29c"; }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}

function NoteEditor({ initialContent, onSave }) {
  const timerRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start typing⬦",
        emptyEditorClass: "is-editor-empty",
      }),
      Markdown.configure({ html: false, transformCopiedText: true }),
    ],
    content: initialContent,
    onUpdate({ editor }) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSave(editor.storage.markdown.getMarkdown());
      }, 400);
    },
  });

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="foreman-note-editor" style={{ display: "flex", flex: 1, flexDirection: "column", overflow: "hidden" }}>
      <NoteToolbar editor={editor} />
      <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1rem" }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function JournalWidget({ selectedItem, notes, onSave }) {
  const itemKey = selectedItem ? `${selectedItem.category}|${selectedItem.item}` : null;
  const noteData = itemKey ? (notes[itemKey] ?? { content: "", updatedAt: null }) : null;

  return (
    <div style={{ display: "flex", flex: 2, flexDirection: "column", overflow: "hidden" }}>
      <div style={{
        alignItems: "center",
        borderBottom: "1px solid #1e2330",
        display: "flex",
        flexShrink: 0,
        justifyContent: "space-between",
        padding: "0.65rem 1rem 0.55rem",
      }}>
        <span style={PANEL_LABEL}>Notes</span>
        {noteData?.updatedAt && (
          <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.58rem" }}>
            {timeAgo(noteData.updatedAt)}
          </span>
        )}
      </div>

      {!selectedItem ? (
        <div style={{
          alignItems: "center",
          color: "#a8a29c",
          display: "flex",
          flex: 1,
          fontFamily: "monospace",
          fontSize: "0.68rem",
          justifyContent: "center",
          padding: "1rem",
          textAlign: "center",
        }}>
          Select an item to take notes
        </div>
      ) : (
        <NoteEditor
          key={itemKey}
          initialContent={noteData?.content ?? ""}
          onSave={content => onSave(itemKey, content)}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────────

export default function GuidePage({ navigate }) {
  const [deletedRows, setDeletedRows] = useState(() => loadDeletedRows());
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails]        = useState(() => loadItemDetails());
  const [categoryFieldSchemas] = useState(() => loadCategoryFieldSchemas());
  const [itemFieldSchemas]     = useState(() => loadItemFieldSchemas());
  const [customFieldValues]    = useState(() => loadCustomFieldValues());
  const [notes, setNotes] = useState(() => loadGuideNotes());

  const grouped = useMemo(() => {
    const catOrder = [];
    const catItemOrder = {};
    const taskMap = {};

    defaultData.forEach(row => {
      if (!catOrder.includes(row.category)) {
        catOrder.push(row.category);
        catItemOrder[row.category] = [];
      }
      const itemKey = `${row.category}||${row.item}`;
      if (!catItemOrder[row.category].includes(row.item)) {
        catItemOrder[row.category].push(row.item);
        taskMap[itemKey] = [];
      }
      taskMap[itemKey].push(row);
    });

    return catOrder.map(cat => ({
      category: cat,
      items: catItemOrder[cat].map(item => ({
        item,
        tasks: taskMap[`${cat}||${item}`],
      })),
    }));
  }, []);

  const [activeCategory, setActiveCategory] = useState(grouped[0]?.category ?? null);
  const contentRef   = useRef(null);
  const sectionRefs  = useRef({});

  const deletedCount = useMemo(() =>
    defaultData.filter(row => deletedRows.has(`${row.category}|${row.item}|${row.task}`)).length,
    [deletedRows]
  );

  function scrollTo(category) {
    sectionRefs.current[category]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const coverageItems = useMemo(() => Object.keys(MANUFACTURERS_BY_ITEM).sort(), []);

  function handleScroll() {
    const container = contentRef.current;
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top;
    let current = grouped[0]?.category ?? null;
    for (const { category } of grouped) {
      const el = sectionRefs.current[category];
      if (el && el.getBoundingClientRect().top - containerTop <= 40) current = category;
    }
    const coverageEl = sectionRefs.current["__coverage__"];
    if (coverageEl && coverageEl.getBoundingClientRect().top - containerTop <= 40) current = "__coverage__";
    setActiveCategory(current);
  }

  function handleRestore(key) {
    setDeletedRows(prev => {
      const next = new Set(prev);
      next.delete(key);
      saveDeletedRows(next);
      return next;
    });
  }

  function handleNoteSave(itemKey, content) {
    setNotes(prev => {
      const next = { ...prev, [itemKey]: { content, updatedAt: new Date().toISOString() } };
      saveGuideNotes(next);
      return next;
    });
  }

  return (
    <div style={{ background: "#0f1117", color: "#e8e4dd", display: "flex", flexDirection: "column", fontFamily: "monospace", height: "100vh", overflow: "hidden" }}>
      <style>{EDITOR_STYLES}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 60%)", borderBottom: "1px solid #a8a29c", flexShrink: 0, padding: "2rem", zIndex: 50 }}>
        <div style={{ alignItems: "flex-end", display: "flex", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ color: "#f0e6d3", fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: "normal", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 0.5rem" }}>Foreman</h1>
            <div>
              <span style={{ color: "#8b7d6b", display: "block", fontFamily: "monospace", fontSize: "0.7rem", letterSpacing: "0.25em", textTransform: "uppercase" }}>YOUR HOME, EXPLAINED</span>
              <span style={{ color: "#c9a96e", fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: "clamp(0.95rem, 2vw, 1.15rem)", letterSpacing: "0.01em" }}>Guide</span>
            </div>
          </div>
          <PageNav currentPage="guide" navigate={navigate} />
        </div>
      </div>

      {deletedCount > 0 && (
        <div style={{ borderBottom: "1px solid #1a1d26", flexShrink: 0, padding: "0.4rem 2rem" }}>
          <span style={{ color: "#f87171", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.1em" }}>
            {deletedCount} removed from schedule
          </span>
        </div>
      )}

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Table of contents */}
        <div style={{ borderRight: "1px solid #13161f", flexShrink: 0, overflowY: "auto", padding: "2rem 0 4rem", width: "180px" }}>
          {grouped.map(({ category }) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                onClick={() => scrollTo(category)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderLeft: `2px solid ${isActive ? "#c9a96e" : "transparent"}`,
                  color: isActive ? "#c9a96e" : "#a8a29c",
                  cursor: "pointer",
                  display: "block",
                  fontFamily: "monospace",
                  fontSize: "0.65rem",
                  letterSpacing: "0.05em",
                  padding: "0.3rem 1rem",
                  textAlign: "left",
                  transition: "color 0.15s, border-color 0.15s",
                  width: "100%",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "#a8a29c"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "#a8a29c"; }}
              >
                {category}
              </button>
            );
          })}
          <div style={{ borderTop: "1px solid #1a1d26", margin: "0.75rem 0" }} />
          {(() => {
            const isActive = activeCategory === "__coverage__";
            return (
              <button
                onClick={() => scrollTo("__coverage__")}
                style={{
                  background: "transparent",
                  border: "none",
                  borderLeft: `2px solid ${isActive ? "#c9a96e" : "transparent"}`,
                  color: isActive ? "#c9a96e" : "#a8a29c",
                  cursor: "pointer",
                  display: "block",
                  fontFamily: "monospace",
                  fontSize: "0.65rem",
                  letterSpacing: "0.05em",
                  padding: "0.3rem 1rem",
                  textAlign: "left",
                  transition: "color 0.15s, border-color 0.15s",
                  width: "100%",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "#a8a29c"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "#a8a29c"; }}
              >
                Model Coverage
              </button>
            );
          })()}
        </div>

        {/* Content */}
        <div ref={contentRef} onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", padding: "2rem 0.25rem 4rem 2.5rem" }}>
          {grouped.map(({ category, items }) => (
            <div key={category} ref={el => sectionRefs.current[category] = el} style={{ marginBottom: "4rem" }}>
              <h2 style={{ color: "#c9a96e", fontSize: "1rem", fontWeight: 400, letterSpacing: "0.08em", margin: "0 0 0.35rem" }}>
                {category}
              </h2>
              {CATEGORY_TIPS[category] && (
                <p style={{ color: "#a8a29c", fontSize: "0.7rem", lineHeight: 1.7, margin: "0 0 1.75rem", maxWidth: "780px" }}>
                  {CATEGORY_TIPS[category]}
                </p>
              )}

              {items.map(({ item, tasks }) => {
                const isSelected = selectedItem?.category === category && selectedItem?.item === item;
                return (
                  <div key={item} style={{ marginBottom: "1.75rem", paddingLeft: "1.25rem" }}>
                    <h3
                      onClick={() => setSelectedItem(isSelected ? null : { category, item })}
                      style={{
                        background: isSelected ? "#c9a96e08" : "transparent",
                        border: "none",
                        borderLeft: `2px solid ${isSelected ? "#c9a96e50" : "transparent"}`,
                        borderRadius: "2px",
                        color: "#c9a96e",
                        cursor: "pointer",
                        display: "inline-block",
                        fontFamily: "monospace",
                        fontSize: "0.78rem",
                        fontWeight: 400,
                        letterSpacing: "0.05em",
                        margin: "0 0 0.25rem -0.75rem",
                        padding: "0.1rem 0.5rem 0.1rem 0.6rem",
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#ffffff05"; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                    >
                      {item}
                    </h3>
                    {ITEM_TIPS[item] && (
                      <p style={{ color: "#a8a29c", fontSize: "0.67rem", lineHeight: 1.7, margin: "0 0 0.75rem", maxWidth: "720px" }}>
                        {ITEM_TIPS[item]}
                      </p>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", paddingLeft: "1rem" }}>
                      {tasks.map(row => {
                        const key = `${row.category}|${row.item}|${row.task}`;
                        const isDeleted = deletedRows.has(key);
                        const tip = TASK_TIPS[key];
                        return (
                          <div key={key}>
                            <div style={{ opacity: isDeleted ? 0.4 : 1, transition: "opacity 0.2s" }}>
                              <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: tip ? "0.3rem" : 0 }}>
                                <span style={{ color: isDeleted ? "#a8a29c" : "#8b7d6b", fontSize: "0.75rem", textDecoration: isDeleted ? "line-through" : "none" }}>
                                  {row.task}
                                </span>
                                {row.schedule && <ScheduleBadge schedule={row.schedule} />}
                                {row.season && (
                                  <span style={{ background: "#1a1f2e", border: "1px solid #a8a29c", borderRadius: "3px", color: "#a8a29c", fontSize: "0.6rem", letterSpacing: "0.08em", padding: "0.15rem 0.4rem" }}>
                                    {SEASON_LABELS[row.season] ?? row.season}
                                  </span>
                                )}
                              </div>
                              {tip && (
                                <p style={{ color: "#a8a29c", fontSize: "0.67rem", lineHeight: 1.7, margin: 0, maxWidth: "720px" }}>
                                  {tip}
                                </p>
                              )}
                            </div>
                            {isDeleted && (
                              <div style={{ alignItems: "center", display: "flex", gap: "0.6rem", marginTop: "0.35rem" }}>
                                <span style={{ color: "#f87171", fontSize: "0.6rem", letterSpacing: "0.08em" }}>removed from schedule</span>
                                <RestoreButton onRestore={() => handleRestore(key)} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Model Coverage */}
          <div ref={el => sectionRefs.current["__coverage__"] = el} style={{ marginBottom: "4rem" }}>
            <h2 style={{ color: "#c9a96e", fontSize: "1rem", fontWeight: 400, letterSpacing: "0.08em", margin: "0 0 0.35rem" }}>
              Model Coverage
            </h2>
            <p style={{ color: "#a8a29c", fontSize: "0.7rem", lineHeight: 1.7, margin: "0 0 1.75rem", maxWidth: "780px" }}>
              {coverageItems.length} appliance types · 1,420 models across 140 manufacturer pairings.
            </p>
            {coverageItems.map(item => {
              const manufacturers = MANUFACTURERS_BY_ITEM[item];
              return (
                <div key={item} style={{ marginBottom: "1.5rem", paddingLeft: "1.25rem" }}>
                  <div style={{ color: "#c9a96e", fontSize: "0.75rem", letterSpacing: "0.04em", marginBottom: "0.4rem" }}>
                    {item}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", paddingLeft: "1rem" }}>
                    {manufacturers.map(mfr => {
                      const models = getModels(mfr, item);
                      return (
                        <div key={mfr}>
                          <span style={{ color: "#a8a29c", fontSize: "0.7rem" }}>{mfr}</span>
                          {models.length > 0 && (
                            <div style={{ color: "#a8a29c", fontSize: "0.62rem", letterSpacing: "0.02em", lineHeight: 1.6, marginTop: "0.05rem" }}>
                              {models.join("  ·  ")}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        <div style={{
          borderLeft: "1px solid #13161f",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
          width: "616px",
        }}>
          <ItemDetailWidget selectedItem={selectedItem} itemDetails={itemDetails} categoryFieldSchemas={categoryFieldSchemas} itemFieldSchemas={itemFieldSchemas} customFieldValues={customFieldValues} />
          <JournalWidget selectedItem={selectedItem} notes={notes} onSave={handleNoteSave} />
        </div>

      </div>
    </div>
  );
}

function RestoreButton({ onRestore }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onRestore}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "transparent",
        border: `1px solid ${hovered ? "#c9a96e" : "#a8a29c"}`,
        borderRadius: "3px",
        color: hovered ? "#c9a96e" : "#a8a29c",
        cursor: "pointer",
        fontFamily: "monospace",
        fontSize: "0.6rem",
        letterSpacing: "0.08em",
        marginLeft: "0.25rem",
        padding: "0.15rem 0.5rem",
        transition: "all 0.15s",
      }}
    >
      Restore &rarr; Schedule
    </button>
  );
}

