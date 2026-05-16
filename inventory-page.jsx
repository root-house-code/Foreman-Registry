import { useState, useMemo, useEffect, useRef, Fragment, forwardRef } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import FmHeader from "./src/components/FmHeader.jsx";
import FmSubnav from "./src/components/FmSubnav.jsx";
import Tooltip from "./components/Tooltip.jsx";
import { loadTodos, saveTodos, createTodo } from "./lib/todos.js";
import { loadProjects, saveProjects, createProject } from "./lib/projects.js";
import { CATEGORY_TIPS, ITEM_TIPS } from "./lib/tooltips.js";
import {
  loadData, defaultData,
  loadCustomData, saveCustomData,
  loadOverrides, saveOverrides,
} from "./lib/data.js";
import { getCategoriesForGroup, getAllDefaultItems } from "./lib/categoryData.js";
import { loadDeletedCategories, saveDeletedCategories } from "./lib/deletedCategories.js";
import { loadDeletedItems, saveDeletedItems } from "./lib/deletedItems.js";
import { loadDeletedRows, saveDeletedRows } from "./lib/deletedRows.js";
import { loadItemDetails, saveItemDetails } from "./lib/itemDetails.js";
import { loadItemFieldSchemas, saveItemFieldSchemas, loadCustomFieldValues, saveCustomFieldValues } from "./lib/customFields.js";
import { UNIVERSAL_FIELDS, ITEM_FIELDS } from "./lib/fieldLibrary.js";
import {
  loadCategoryTypeOverrides,
  saveCategoryTypeOverrides,
  loadRoomSubtypes,
  saveRoomSubtypes,
  ROOM_SUBTYPES,
  GROUP_ORDER,
  GROUP_LABELS,
} from "./lib/categoryTypes.js";
import { getManufacturers } from "./lib/manufacturers.js";
import { getModels } from "./lib/models.js";
import { SEASON_OPTIONS } from "./lib/scheduleOptions.js";
import FollowButton from "./components/FollowButton.jsx";
import SchedulePicker from "./components/SchedulePicker.jsx";
import AddTaskModal from "./components/AddTaskModal.jsx";

const PRIORITY_COLORS = {
  low:    "var(--fm-green)",
  medium: "var(--fm-brass)",
  high:   "var(--fm-amber)",
  urgent: "var(--fm-red)",
};

function navBtnStyle(hovered) {
  return {
    background: "transparent",
    border: `1px solid ${hovered ? "var(--fm-brass)" : "var(--fm-ink-dim)"}`,
    borderRadius: "3px",
    color: hovered ? "var(--fm-brass)" : "var(--fm-brass-dim)",
    cursor: "pointer",
    fontFamily: "var(--fm-mono)",
    fontSize: "0.72rem",
    letterSpacing: "0.08em",
    padding: "0.4rem 0.9rem",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  };
}

function addBtnStyle(hovered) {
  return {
    background: "transparent",
    border: "none",
    color: hovered ? "var(--fm-brass)" : "var(--fm-brass-dim)",
    cursor: "pointer",
    fontFamily: "var(--fm-mono)",
    fontSize: "0.72rem",
    letterSpacing: "0.08em",
    padding: "0.4rem 0",
    transition: "color 0.15s",
    whiteSpace: "nowrap",
  };
}

function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const PurchaseDateTrigger = forwardRef(({ value, onClick }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    style={{
      background: "var(--fm-bg-raised)",
      border: "1px solid var(--fm-hairline2)",
      borderRadius: "3px",
      boxSizing: "border-box",
      color: value ? "var(--fm-ink)" : "var(--fm-ink-dim)",
      cursor: "pointer",
      fontFamily: "var(--fm-mono)",
      fontSize: "0.75rem",
      padding: "0.3rem 0.5rem",
      textAlign: "left",
      width: "100%",
    }}
  >
    {value || "—"}
  </button>
));

function InlineInput({ initialValue = "", placeholder = "", onCommit, onCancel }) {
  const [value, setValue] = useState(initialValue);
  function commit() { onCommit(value); }
  return (
    <input
      autoFocus
      value={value}
      placeholder={placeholder}
      onChange={e => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      }}
      style={{
        background: "var(--fm-bg-panel)",
        border: "1px solid var(--fm-hairline2)",
        borderRadius: "2px",
        boxSizing: "border-box",
        color: "var(--fm-ink)",
        flex: 1,
        fontFamily: "inherit",
        fontSize: "0.95rem",
        outline: "none",
        padding: "0.1rem 0.4rem",
      }}
    />
  );
}

function InlineComboInput({ placeholder = "", onCommit, onCancel, options = [] }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(true);
  const [pos, setPos] = useState(null);
  const inputRef = useRef(null);

  const filtered = value === ""
    ? options
    : options.filter(o => o.toLowerCase().includes(value.toLowerCase()));

  useEffect(() => {
    if (focused && filtered.length > 0 && inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom, width: r.width });
    } else {
      setPos(null);
    }
  }, [focused, value]);

  function commit(val) { onCommit(val !== undefined ? val : value); }

  return (
    <div style={{ flex: 1 }}>
      <input
        ref={inputRef}
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={e => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); commit(value); }}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commit(value); }
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
        style={{
          background: "var(--fm-bg-panel)",
          border: "1px solid var(--fm-hairline2)",
          borderRadius: "2px",
          boxSizing: "border-box",
          color: "var(--fm-ink)",
          fontFamily: "inherit",
          fontSize: "0.95rem",
          outline: "none",
          padding: "0.1rem 0.4rem",
          width: "100%",
        }}
      />
      {pos && createPortal(
        <div
          onMouseDown={e => e.preventDefault()}
          style={{
            background: "var(--fm-bg-panel)",
            border: "1px solid var(--fm-hairline2)",
            borderRadius: "0 0 2px 2px",
            left: pos.left,
            maxHeight: 200,
            overflowY: "auto",
            position: "fixed",
            top: pos.top,
            width: pos.width,
            zIndex: 9998,
          }}
        >
          {filtered.map(opt => (
            <div
              key={opt}
              onMouseDown={() => commit(opt)}
              style={{
                color: "var(--fm-brass)",
                cursor: "pointer",
                fontFamily: "var(--fm-mono)",
                fontSize: "0.78rem",
                padding: "0.3rem 0.4rem",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--fm-ink-dim)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              {opt}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

function ModelComboField({ value = "", models = [], fieldStyle, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState(null);
  const inputRef        = useRef(null);

  const filtered = models.filter(m => !value || m.toLowerCase().includes(value.toLowerCase()));

  function openDropdown() {
    const r = inputRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom, left: r.left, width: r.width });
    setOpen(true);
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        value={value}
        placeholder="—"
        onChange={e => { onChange(e.target.value); openDropdown(); }}
        onFocus={openDropdown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{ ...fieldStyle }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--fm-brass)"}
        onMouseLeave={e => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "var(--fm-ink-dim)"; }}
      />
      {open && filtered.length > 0 && pos && createPortal(
        <div style={{
          background: "var(--fm-bg-raised)",
          border: "1px solid var(--fm-hairline2)",
          borderRadius: "0 0 2px 2px",
          left: pos.left,
          maxHeight: 200,
          overflowY: "auto",
          position: "fixed",
          top: pos.top,
          width: pos.width,
          zIndex: 9998,
        }}>
          {filtered.map(m => (
            <div
              key={m}
              onMouseDown={() => { onChange(m); setOpen(false); }}
              style={{ color: "var(--fm-brass)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.78rem", padding: "0.3rem 0.4rem" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--fm-ink-dim)30"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              {m}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function InventoryPage({ navigate, navState }) {
  const [rows, setRows] = useState(() => loadData());
  const [deletedCategories, setDeletedCategories] = useState(() => loadDeletedCategories());
  const [deletedItems, setDeletedItems] = useState(() => loadDeletedItems());
  const [deletePrompt, setDeletePrompt] = useState(null); // { category, itemCount, taskCount, isDefault } | { category, item, taskCount, isDefault }
  const [newItemIds, setNewItemIds] = useState(() => new Set());
  const [editingCategoryName, setEditingCategoryName] = useState(null);
  const [editingItemName, setEditingItemName] = useState(null); // { category, item }
  const [editingTask, setEditingTask] = useState(null); // row being edited, or null
  const [pendingNewCategory, setPendingNewCategory] = useState(null); // { id, groupType }

  const CATEGORY_ITEMS = useMemo(() => {
    const map = {};
    rows.forEach(row => {
      if (!row._isCustom && deletedCategories.has(row.category)) return;
      if (row._isBlankCategory) {
        if (row.category) map[row.category] = map[row.category] || [];
        return;
      }
      if (!row.category || !row.item) return;
      if (deletedItems.has(`${row.category}|${row.item}`)) return;
      if (!map[row.category]) map[row.category] = [];
      if (!map[row.category].includes(row.item)) map[row.category].push(row.item);
    });
    return map;
  }, [rows, deletedCategories, deletedItems]);

  const CATEGORIES = Object.keys(CATEGORY_ITEMS);

  const defaultCategoryTypes = useMemo(() => {
    const map = {};
    rows.forEach(row => {
      if (!row.category || !row.categoryType) return;
      // Custom rows (user-created) take priority over default rows so that
      // a category added in "Rooms" isn't silently reassigned by a same-named
      // default category that lives in a different group.
      if (!map[row.category] || row._isCustom) {
        map[row.category] = row.categoryType;
      }
    });
    return map;
  }, [rows]);

  const [categoryTypeOverrides, setCategoryTypeOverridesState] = useState(() => loadCategoryTypeOverrides());

  const effectiveCategoryTypes = useMemo(() => {
    const result = {};
    CATEGORIES.forEach(cat => {
      result[cat] = categoryTypeOverrides[cat] ?? defaultCategoryTypes[cat] ?? "general";
    });
    return result;
  }, [CATEGORIES, categoryTypeOverrides, defaultCategoryTypes]);

  const groupedCategories = useMemo(() => {
    const groups = {};
    GROUP_ORDER.forEach(type => { groups[type] = []; });
    CATEGORIES.forEach(cat => {
      const type = effectiveCategoryTypes[cat];
      (groups[type] ?? groups["general"]).push(cat);
    });
    return groups;
  }, [CATEGORIES, effectiveCategoryTypes]);

  const totalItems = useMemo(() =>
    CATEGORIES.reduce((n, cat) => n + (CATEGORY_ITEMS[cat]?.length || 0), 0),
    [CATEGORIES, CATEGORY_ITEMS]
  );
  const systemCatCount = useMemo(() =>
    CATEGORIES.filter(c => effectiveCategoryTypes[c] !== "room").length,
    [CATEGORIES, effectiveCategoryTypes]
  );
  const roomCatCount = useMemo(() =>
    CATEGORIES.filter(c => effectiveCategoryTypes[c] === "room").length,
    [CATEGORIES, effectiveCategoryTypes]
  );
  const filteredGroupOrder = useMemo(() => {
    if (activeTab === "By system") return GROUP_ORDER.filter(g => g !== "room");
    if (activeTab === "By room")   return GROUP_ORDER.filter(g => g === "room");
    return GROUP_ORDER;
  }, [activeTab]);

  const newItemRowsByCategory = useMemo(() => {
    const map = {};
    rows.forEach(row => {
      if (newItemIds.has(row._id)) {
        if (!map[row.category]) map[row.category] = [];
        map[row.category].push(row);
      }
    });
    return map;
  }, [rows, newItemIds]);

  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(CATEGORIES.map(cat => [cat, true]))
  );
  const [collapsedGroups, setCollapsedGroups] = useState(() =>
    Object.fromEntries(GROUP_ORDER.map(g => [g, true]))
  );
  const [activeTab, setActiveTab] = useState("All items");
  const [sortedGroups, setSortedGroups] = useState(() => new Set());
  const [navHovered, setNavHovered] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOverGroup, setDragOverGroup] = useState(null);
  const [draggingItem, setDraggingItem] = useState(null); // { item, fromCategory }
  const [dragOverCategory, setDragOverCategory] = useState(null);
  const [duplicateItemPopup, setDuplicateItemPopup] = useState(null); // { item, fromCategory, x, y }
  const [itemDetails, setItemDetails] = useState(() => loadItemDetails());
  const [selectedItem, setSelectedItem] = useState(null); // { category, item }
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [todos, setTodos] = useState(() => loadTodos());
  const [addingTodo, setAddingTodo] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [projects, setProjects] = useState(() => loadProjects());
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [deleteProjectPrompt, setDeleteProjectPrompt] = useState(null);
  const [hoveredProjectId, setHoveredProjectId] = useState(null);
  const [addingTask, setAddingTask] = useState(false);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ task: "", schedule: "", season: null, lastCompleted: null, nextDate: null, followSchedule: false, notes: "" });
  const [deleteTaskPrompt, setDeleteTaskPrompt] = useState(null);
  const [deleteTodoPrompt, setDeleteTodoPrompt] = useState(null);
  const [hoveredTodoId, setHoveredTodoId] = useState(null);
  const [deletedRows, setDeletedRows] = useState(() => loadDeletedRows());
  const [nextDatesMap, setNextDatesMapInv] = useState(() => {
    try { return JSON.parse(localStorage.getItem("maintenance-next-dates") || "{}"); }
    catch { return {}; }
  });
  const [suggestedTasks, setSuggestedTasks] = useState(null); // null | Array<{task,schedule,season,selected}>
  const [suggestedFor, setSuggestedFor] = useState(null); // { category, item }
  const [fetchingTasks, setFetchingTasks] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [itemFieldSchemas, setItemFieldSchemas] = useState(() => loadItemFieldSchemas());
  const [customFieldValues, setCustomFieldValues] = useState(() => loadCustomFieldValues());
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [newField, setNewField] = useState({ name: "", type: "text", options: "" });
  const [roomSubtypes, setRoomSubtypes] = useState(() => loadRoomSubtypes());

  const itemTasks = useMemo(() => {
    if (!selectedItem) return [];
    return rows.filter(r =>
      r.category === selectedItem.category &&
      r.item === selectedItem.item &&
      !r._isBlankCategory &&
      r.task &&
      !(!r._isCustom && deletedCategories.has(r.category)) &&
      !deletedItems.has(`${r.category}|${r.item}`) &&
      !deletedRows.has(`${r.category}|${r.item}|${r.task}`)
    );
  }, [rows, selectedItem, deletedRows, deletedCategories, deletedItems]);

  const selectedTodos = useMemo(() => {
    if (!selectedItem) return [];
    return todos.filter(t =>
      t.linkedCategory === selectedItem.category &&
      (t.linkedItem === selectedItem.item || t.linkedItem === null)
    );
  }, [todos, selectedItem]);

  const selectedProjects = useMemo(() => {
    if (!selectedItem) return [];
    return projects.filter(p =>
      p.linkedCategory === selectedItem.category &&
      (p.linkedItem === selectedItem.item || p.linkedItem === null)
    );
  }, [projects, selectedItem]);

  const itemCoverageMap = useMemo(() => {
    const map = {};
    rows.forEach(row => {
      if (row._isBlankCategory || !row.category || !row.item || !row.task) return;
      if (!row._isCustom && deletedCategories.has(row.category)) return;
      if (deletedItems.has(`${row.category}|${row.item}`)) return;
      const drKey = `${row.category}|${row.item}|${row.task}`;
      if (deletedRows.has(drKey)) return;
      const itemKey = `${row.category}|${row.item}`;
      if (!map[itemKey]) map[itemKey] = { total: 0, unscheduled: 0 };
      map[itemKey].total++;
      if (!row.schedule && !nextDatesMap[drKey]) map[itemKey].unscheduled++;
    });
    return map;
  }, [rows, deletedCategories, deletedItems, deletedRows, nextDatesMap]);

  function handleAddTask() {
    if (!newTask.task.trim() || !selectedItem) return;
    const taskName = newTask.task.trim();
    const key = `${selectedItem.category}|${selectedItem.item}|${taskName}`;
    const newRow = {
      _id: `custom-${Date.now()}`,
      _isCustom: true,
      _defaultKey: null,
      category: selectedItem.category,
      item: selectedItem.item,
      task: taskName,
      schedule: newTask.schedule || "",
      season: newTask.season || null,
    };
    const customs = loadCustomData();
    saveCustomData([...customs, newRow]);
    if (newTask.lastCompleted) {
      const dates = JSON.parse(localStorage.getItem("maintenance-dates") || "{}");
      dates[key] = new Date(newTask.lastCompleted).toISOString();
      localStorage.setItem("maintenance-dates", JSON.stringify(dates));
    }
    if (newTask.nextDate) {
      const nextDates = JSON.parse(localStorage.getItem("maintenance-next-dates") || "{}");
      nextDates[key] = new Date(newTask.nextDate).toISOString();
      localStorage.setItem("maintenance-next-dates", JSON.stringify(nextDates));
    }
    if (newTask.notes) {
      const notes = JSON.parse(localStorage.getItem("maintenance-notes") || "{}");
      notes[key] = newTask.notes;
      localStorage.setItem("maintenance-notes", JSON.stringify(notes));
    }
    if (newTask.followSchedule) {
      const follow = JSON.parse(localStorage.getItem("maintenance-follow") || "{}");
      follow[key] = true;
      localStorage.setItem("maintenance-follow", JSON.stringify(follow));
    }
    reload();
    setAddingTask(false);
    setNewTask({ task: "", schedule: "", season: null, lastCompleted: null, nextDate: null, followSchedule: false, notes: "" });
  }

  function handleAddTaskFromModal(form) {
    if (!selectedItem) return;
    const taskName = form.task.trim();
    const key = `${selectedItem.category}|${selectedItem.item}|${taskName}`;
    const newRow = {
      _id: `custom-${Date.now()}`,
      _isCustom: true,
      _defaultKey: null,
      category: selectedItem.category,
      item: selectedItem.item,
      task: taskName,
      schedule: form.schedule || "",
      season: form.season || null,
    };
    const customs = loadCustomData();
    saveCustomData([...customs, newRow]);
    if (form.lastCompleted) {
      const dates = JSON.parse(localStorage.getItem("maintenance-dates") || "{}");
      dates[key] = new Date(form.lastCompleted).toISOString();
      localStorage.setItem("maintenance-dates", JSON.stringify(dates));
    }
    if (form.nextDate) {
      const nextDates = JSON.parse(localStorage.getItem("maintenance-next-dates") || "{}");
      nextDates[key] = new Date(form.nextDate).toISOString();
      localStorage.setItem("maintenance-next-dates", JSON.stringify(nextDates));
    }
    if (form.notes) {
      const notes = JSON.parse(localStorage.getItem("maintenance-notes") || "{}");
      notes[key] = form.notes;
      localStorage.setItem("maintenance-notes", JSON.stringify(notes));
    }
    if (form.followSchedule) {
      const follow = JSON.parse(localStorage.getItem("maintenance-follow") || "{}");
      follow[key] = true;
      localStorage.setItem("maintenance-follow", JSON.stringify(follow));
    }
    reload();
    setAddTaskModalOpen(false);
  }

  function handleDeleteTask(row) {
    if (row._isCustom) {
      const customs = loadCustomData();
      saveCustomData(customs.filter(r => r._id !== row._id));
      reload();
    } else {
      const key = `${row.category}|${row.item}|${row.task}`;
      const next = new Set([...deletedRows, key]);
      saveDeletedRows(next);
      setDeletedRows(next);
    }
  }

  async function handleFetchTasks(manufacturer, model, item, category) {
    setFetchingTasks(true);
    setFetchError(null);
    setSuggestedTasks(null);
    setSuggestedFor({ category, item });

    const scheduleValues = "every 1 month, every 3 months, every 6 months, every 1 year, every 2 years, every 5 years, every 10 years, as needed, every load";
    const prompt = `You are a home maintenance expert. List the manufacturer-recommended maintenance tasks for this appliance.

Manufacturer: ${manufacturer}
Model: ${model || "unknown"}
Appliance type: ${item}

Return ONLY a JSON array with no explanation or markdown. Each object must have exactly these fields:
- "task": string — concise task name (e.g. "Replace water filter")
- "schedule": string — use one of: ${scheduleValues}
- "season": null or one of "spring", "summer", "fall", "winter" (only if the task is season-specific)

Return 5–12 tasks. Include only tasks that are standard for this appliance type.`;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 1024,
        }),
      });
      if (!res.ok) throw new Error(`Groq API error ${res.status}`);
      const data = await res.json();
      const raw = data.choices[0].message.content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(raw);
      setSuggestedTasks(parsed.map(t => ({ ...t, selected: true })));
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setFetchingTasks(false);
    }
  }

  function handleAddSuggestedTasks() {
    if (!suggestedTasks || !suggestedFor) return;
    const toAdd = suggestedTasks.filter(t => t.selected);
    if (toAdd.length === 0) return;
    const customs = loadCustomData();
    const newRows = toAdd.map((t, i) => ({
      _id: `custom-${Date.now()}-${i}`,
      _isCustom: true,
      _defaultKey: null,
      category: suggestedFor.category,
      item: suggestedFor.item,
      task: t.task,
      schedule: t.schedule || "",
      season: t.season || null,
    }));
    saveCustomData([...customs, ...newRows]);
    reload();
    setSuggestedTasks(null);
    setSuggestedFor(null);
  }

  function handleCustomFieldValueChange(category, item, fieldId, value) {
    const key = `${category}|${item}`;
    const next = { ...customFieldValues, [key]: { ...(customFieldValues[key] || {}), [fieldId]: value } };
    setCustomFieldValues(next);
    saveCustomFieldValues(next);
  }

  function handleAddItemField(category, item, field) {
    const key = `${category}|${item}`;
    const next = { ...itemFieldSchemas, [key]: [...(itemFieldSchemas[key] || []), field] };
    setItemFieldSchemas(next);
    saveItemFieldSchemas(next);
  }

  function handleDeleteItemField(category, item, fieldId) {
    const key = `${category}|${item}`;
    const next = { ...itemFieldSchemas, [key]: (itemFieldSchemas[key] || []).filter(f => f.id !== fieldId) };
    setItemFieldSchemas(next);
    saveItemFieldSchemas(next);
  }


  function handleAddTodo() {
    const title = newTodoTitle.trim();
    if (!title || !selectedItem) return;
    const next = [...todos, createTodo({
      title,
      linkedCategory: selectedItem.category,
      linkedItem: selectedItem.item,
    })];
    setTodos(next);
    saveTodos(next);
    setNewTodoTitle("");
    setAddingTodo(false);
  }

  function handleDeleteTodo(todo) {
    const next = todos.filter(t => t.id !== todo.id);
    setTodos(next);
    saveTodos(next);
    setDeleteTodoPrompt(null);
  }

  function handleAddProject() {
    const name = newProjectName.trim();
    if (!name || !selectedItem) return;
    const next = [...projects, createProject({
      name,
      linkedCategory: selectedItem.category,
      linkedItem: selectedItem.item,
    })];
    setProjects(next);
    saveProjects(next);
    setNewProjectName("");
    setAddingProject(false);
  }

  function handleDeleteProject(project) {
    const next = projects.filter(p => p.id !== project.id);
    setProjects(next);
    saveProjects(next);
    setDeleteProjectPrompt(null);
  }

  function reload() {
    setRows(loadData());
  }

  // Migrate legacy itemDetails entries to customFieldValues + itemFieldSchemas
  useEffect(() => {
    const legacyDetails = loadItemDetails();
    if (!legacyDetails || Object.keys(legacyDetails).length === 0) return;
    const existingValues = loadCustomFieldValues();
    const existingSchemas = loadItemFieldSchemas();
    let valuesChanged = false;
    let schemasChanged = false;
    Object.entries(legacyDetails).forEach(([cfKey, details]) => {
      if (!details || typeof details !== "object") return;
      const migratableFields = [
        { id: "manufacturer", name: "Manufacturer", type: "text" },
        { id: "model",        name: "Model",        type: "text" },
        { id: "serial",       name: "Serial Number",type: "text" },
        { id: "purchase_date",name: "Purchase Date",type: "date" },
      ];
      const legacyMap = { manufacturer: details.manufacturer, model: details.model, serial: details.serial, purchase_date: details.purchaseDate };
      migratableFields.forEach(f => {
        const legacyVal = legacyMap[f.id];
        if (!legacyVal) return;
        if (!existingValues[cfKey]) existingValues[cfKey] = {};
        if (!existingValues[cfKey][f.id]) {
          existingValues[cfKey][f.id] = legacyVal;
          valuesChanged = true;
        }
        if (!existingSchemas[cfKey]) existingSchemas[cfKey] = [];
        if (!existingSchemas[cfKey].some(s => s.id === f.id)) {
          existingSchemas[cfKey].push(f);
          schemasChanged = true;
        }
      });
    });
    if (valuesChanged) { saveCustomFieldValues(existingValues); setCustomFieldValues(existingValues); }
    if (schemasChanged) { saveItemFieldSchemas(existingSchemas); setItemFieldSchemas(existingSchemas); }
  }, []);

  useEffect(() => {
    if (!navState?.expandAll) return;
    setCollapsed(Object.fromEntries(CATEGORIES.map(cat => [cat, false])));
    setCollapsedGroups(Object.fromEntries(GROUP_ORDER.map(g => [g, false])));
  }, []);

  useEffect(() => {
    if (!headerRef.current) return;
    const obs = new ResizeObserver(([entry]) => setHeaderHeight(entry.contentRect.height));
    obs.observe(headerRef.current);
    return () => obs.disconnect();
  }, []);

  function toggleCollapse(category) {
    setCollapsed(prev => ({ ...prev, [category]: !prev[category] }));
  }

  function toggleGroup(groupType) {
    setCollapsedGroups(prev => ({ ...prev, [groupType]: !prev[groupType] }));
  }

  const allGroupsCollapsed = GROUP_ORDER.every(g => collapsedGroups[g]);
  const allCatsCollapsed   = CATEGORIES.every(cat => collapsed[cat]);
  // 0 = fully collapsed, 1 = groups open + categories closed, 2 = fully open
  const expandLevel = (allGroupsCollapsed && allCatsCollapsed) ? 0 : allCatsCollapsed ? 1 : 2;

  function cycleExpand() {
    if (expandLevel === 0) {
      setCollapsedGroups(Object.fromEntries(GROUP_ORDER.map(g => [g, false])));
      setCollapsed(Object.fromEntries(CATEGORIES.map(cat => [cat, true])));
    } else if (expandLevel === 1) {
      setCollapsedGroups(Object.fromEntries(GROUP_ORDER.map(g => [g, false])));
      setCollapsed(Object.fromEntries(CATEGORIES.map(cat => [cat, false])));
    } else {
      setCollapsedGroups(Object.fromEntries(GROUP_ORDER.map(g => [g, true])));
      setCollapsed(Object.fromEntries(CATEGORIES.map(cat => [cat, true])));
    }
  }

  function handleItemDrop(toCategory) {
    if (!draggingItem) return;
    const { item, fromCategory } = draggingItem;
    setDraggingItem(null);
    setDragOverCategory(null);
    if (fromCategory === toCategory) return;

    const customs = loadCustomData();
    saveCustomData(customs.map(r =>
      r.category === fromCategory && r.item === item ? { ...r, category: toCategory } : r
    ));

    const overrides = loadOverrides();
    defaultData.forEach(row => {
      if (row.category === fromCategory && row.item === item) {
        const key = `${row.category}|${row.item}|${row.task}`;
        overrides[key] = { ...(overrides[key] || {}), category: toCategory };
      }
    });
    saveOverrides(overrides);

    reload();
  }

  function handleDeleteClick(category) {
    const itemCount = CATEGORY_ITEMS[category]?.length ?? 0;
    const taskCount = rows.filter(r => r.category === category && !r._isBlankCategory).length;
    const isDefault = rows.some(r => r.category === category && !r._isCustom);
    setEditingCategoryName(null);
    setDeletePrompt({ category, itemCount, taskCount, isDefault });
  }

  function handleDuplicateItemToCategory(toCategory) {
    const { item, fromCategory } = duplicateItemPopup;
    setDuplicateItemPopup(null);
    const sourceRows = rows.filter(r => r.category === fromCategory && r.item === item && !r._isBlankCategory);
    const customs = loadCustomData();
    const newRows = sourceRows.length > 0
      ? sourceRows.map((r, i) => ({
          _id: `custom-${Date.now()}-${i}`,
          _isCustom: true, _defaultKey: null,
          category: toCategory, item: r.item, task: r.task,
          schedule: r.schedule, season: r.season ?? null,
        }))
      : [{ _id: `custom-${Date.now()}`, _isCustom: true, _defaultKey: null, category: toCategory, item, task: "", schedule: "", season: null }];
    saveCustomData([...customs, ...newRows]);
    reload();
  }



  function handleItemDetailChange(category, item, field, value) {
    const key = `${category}|${item}`;
    const next = { ...itemDetails, [key]: { ...(itemDetails[key] || {}), [field]: value } };
    setItemDetails(next);
    saveItemDetails(next);
  }

  function handleDuplicateCategory(category) {
    const groupType = effectiveCategoryTypes[category];
    const newName = `Copy of ${category}`;
    const sourceRows = rows.filter(r => r.category === category && !r._isBlankCategory);
    const customs = loadCustomData();

    if (sourceRows.length === 0) {
      saveCustomData([...customs, {
        _id: `custom-${Date.now()}`,
        _isCustom: true, _defaultKey: null, _isBlankCategory: true,
        category: newName, item: "", task: "", schedule: "", season: null,
        categoryType: groupType,
      }]);
    } else {
      const newRows = sourceRows.map((r, i) => ({
        _id: `custom-${Date.now()}-${i}`,
        _isCustom: true, _defaultKey: null,
        category: newName,
        item: r.item, task: r.task,
        schedule: r.schedule, season: r.season ?? null,
        categoryType: groupType,
      }));
      saveCustomData([...customs, ...newRows]);
    }

    reload();
    setEditingCategoryName(newName);
    setCollapsedGroups(prev => ({ ...prev, [groupType]: false }));
  }

  function handleItemDeleteClick(category, item) {
    const taskCount = rows.filter(r => r.category === category && r.item === item && !r._isBlankCategory).length;
    const isDefault = rows.some(r => r.category === category && r.item === item && !r._isCustom);
    setDeletePrompt({ category, item, taskCount, isDefault });
  }

  function confirmDelete() {
    if (!deletePrompt) return;
    const { category, item, isDefault } = deletePrompt;
    setDeletePrompt(null);

    if (item) {
      if (isDefault) {
        const next = new Set([...deletedItems, `${category}|${item}`]);
        saveDeletedItems(next);
        setDeletedItems(next);
      }
      const customs = loadCustomData();
      saveCustomData(customs.filter(r => !(r.category === category && r.item === item)));
      reload();
    } else {
      if (isDefault) {
        const next = new Set([...deletedCategories, category]);
        saveDeletedCategories(next);
        setDeletedCategories(next);
      }
      // Always remove custom rows for this category — covers both the pure-custom
      // case and any user-created rows that co-exist with a same-named default.
      const customs = loadCustomData();
      saveCustomData(customs.filter(r => r.category !== category));
      reload();
    }
  }

  function handleDrop(groupType) {
    if (!dragging) return;
    if (effectiveCategoryTypes[dragging] !== groupType) {
      const next = { ...categoryTypeOverrides };
      if (defaultCategoryTypes[dragging] === groupType) {
        delete next[dragging];
      } else {
        next[dragging] = groupType;
      }
      saveCategoryTypeOverrides(next);
      setCategoryTypeOverridesState(next);
    }
    setDragging(null);
    setDragOverGroup(null);
  }

  function handleCategoryRename(oldName, newName) {
    const trimmed = newName.trim();
    setEditingCategoryName(null);
    if (!trimmed || trimmed === oldName) return;

    const customs = loadCustomData();
    saveCustomData(customs.map(r => r.category === oldName ? { ...r, category: trimmed } : r));

    const overrides = loadOverrides();
    defaultData.forEach(row => {
      if (row.category === oldName) {
        const key = `${row.category}|${row.item}|${row.task}`;
        overrides[key] = { ...(overrides[key] || {}), category: trimmed };
      }
    });
    saveOverrides(overrides);

    if (categoryTypeOverrides[oldName] !== undefined) {
      const next = { ...categoryTypeOverrides, [trimmed]: categoryTypeOverrides[oldName] };
      delete next[oldName];
      saveCategoryTypeOverrides(next);
      setCategoryTypeOverridesState(next);
    }

    reload();
  }

  function handleItemRename(category, oldName, newName) {
    const trimmed = newName.trim();
    setEditingItemName(null);
    if (!trimmed || trimmed === oldName) return;

    const customs = loadCustomData();
    saveCustomData(customs.map(r => r.category === category && r.item === oldName ? { ...r, item: trimmed } : r));

    const overrides = loadOverrides();
    defaultData.forEach(row => {
      if (row.category === category && row.item === oldName) {
        const key = `${row.category}|${row.item}|${row.task}`;
        overrides[key] = { ...(overrides[key] || {}), item: trimmed };
      }
    });
    saveOverrides(overrides);

    const oldKey = `${category}|${oldName}`;
    const newKey = `${category}|${trimmed}`;

    const details = loadItemDetails();
    if (details[oldKey] !== undefined) { details[newKey] = details[oldKey]; delete details[oldKey]; saveItemDetails(details); setItemDetails(details); }

    const cfVals = loadCustomFieldValues();
    if (cfVals[oldKey] !== undefined) { cfVals[newKey] = cfVals[oldKey]; delete cfVals[oldKey]; saveCustomFieldValues(cfVals); setCustomFieldValues(cfVals); }

    const cfSchemas = loadItemFieldSchemas();
    if (cfSchemas[oldKey] !== undefined) { cfSchemas[newKey] = cfSchemas[oldKey]; delete cfSchemas[oldKey]; saveItemFieldSchemas(cfSchemas); setItemFieldSchemas(cfSchemas); }

    const oldPrefix = `${category}|${oldName}|`;
    const newDels = new Set([...deletedRows].map(k => k.startsWith(oldPrefix) ? `${category}|${trimmed}|${k.slice(oldPrefix.length)}` : k));
    saveDeletedRows(newDels);
    setDeletedRows(newDels);

    const nextTodos = todos.map(t => t.linkedCategory === category && t.linkedItem === oldName ? { ...t, linkedItem: trimmed } : t);
    setTodos(nextTodos);
    saveTodos(nextTodos);

    if (selectedItem?.category === category && selectedItem?.item === oldName) setSelectedItem({ category, item: trimmed });

    reload();
  }

  function handleUpdateTask(originalRow) {
    if (!newTask.task.trim() || !selectedItem) return;
    const taskName = newTask.task.trim();
    if (originalRow._isCustom) {
      const oldKey = `${originalRow.category}|${originalRow.item}|${originalRow.task}`;
      const newKey = `${originalRow.category}|${originalRow.item}|${taskName}`;
      const customs = loadCustomData();
      saveCustomData(customs.map(r => r._id === originalRow._id ? { ...r, task: taskName, schedule: newTask.schedule || "", season: newTask.season || null } : r));
      if (taskName !== originalRow.task) {
        ["maintenance-dates", "maintenance-next-dates", "maintenance-notes", "maintenance-follow"].forEach(k => {
          const d = JSON.parse(localStorage.getItem(k) || "{}");
          if (d[oldKey] !== undefined) { d[newKey] = d[oldKey]; delete d[oldKey]; localStorage.setItem(k, JSON.stringify(d)); }
        });
      }
    } else {
      const key = `${originalRow.category}|${originalRow.item}|${originalRow.task}`;
      const overrides = loadOverrides();
      overrides[key] = { ...(overrides[key] || {}), schedule: newTask.schedule || "", season: newTask.season || null };
      saveOverrides(overrides);
    }
    reload();
    setEditingTask(null);
    setAddingTask(false);
    setNewTask({ task: "", schedule: "", season: null, lastCompleted: null, nextDate: null, followSchedule: false, notes: "" });
  }

  function handleAddCategory(groupType) {
    const newId = `custom-${Date.now()}`;
    const newRow = {
      _id: newId, _isCustom: true, _defaultKey: null, _isBlankCategory: true,
      category: "", item: "", task: "", schedule: "", season: null,
      categoryType: groupType,
    };
    const customs = loadCustomData();
    saveCustomData([...customs, newRow]);
    reload();
    setPendingNewCategory({ id: newId, groupType });
    setCollapsedGroups(prev => ({ ...prev, [groupType]: false }));
  }

  function handleCommitNewCategory(name, rowId) {
    const trimmed = name.trim();
    setPendingNewCategory(null);
    const customs = loadCustomData();
    if (!trimmed) {
      saveCustomData(customs.filter(r => r._id !== rowId));
    } else {
      saveCustomData(customs.map(r => r._id === rowId ? { ...r, category: trimmed } : r));
    }
    reload();
  }

  function handleCancelNewCategory(rowId) {
    const customs = loadCustomData();
    saveCustomData(customs.filter(r => r._id !== rowId));
    reload();
    setPendingNewCategory(null);
  }

  function handleSetRoomSubtype(category, subtype) {
    const next = { ...roomSubtypes };
    if (subtype) next[category] = subtype;
    else delete next[category];
    saveRoomSubtypes(next);
    setRoomSubtypes(next);
  }

  function handleAddItem(category) {
    const newId = `custom-${Date.now()}`;
    const newRow = {
      _id: newId, _isCustom: true, _defaultKey: null,
      category, item: "", task: "", schedule: "", season: null,
    };
    const customs = loadCustomData();
    saveCustomData([...customs, newRow]);
    reload();
    setNewItemIds(prev => new Set([...prev, newId]));
    setCollapsed(prev => ({ ...prev, [category]: false }));
  }

  function handleCommitItemName(rowId, name) {
    const trimmed = name.trim();
    setNewItemIds(prev => { const next = new Set(prev); next.delete(rowId); return next; });
    const customs = loadCustomData();
    if (!trimmed) {
      saveCustomData(customs.filter(r => r._id !== rowId));
    } else {
      saveCustomData(customs.map(r => r._id === rowId ? { ...r, item: trimmed } : r));
    }
    reload();
  }

  function handleCancelNewItem(rowId) {
    setNewItemIds(prev => { const next = new Set(prev); next.delete(rowId); return next; });
    const customs = loadCustomData();
    saveCustomData(customs.filter(r => r._id !== rowId));
    reload();
  }

  function renderCategory(category) {
    const items = CATEGORY_ITEMS[category];
    const isCollapsed = collapsed[category];
    const isDragging = dragging === category;
    const isEditing = editingCategoryName === category;

    const pendingItems = newItemRowsByCategory[category] || [];
    const hasContent = !isCollapsed || pendingItems.length > 0;
    const isCategoryDefault = rows.some(r => r.category === category && !r._isCustom);
    const existingItemSet = new Set(items);
    const itemSuggestions = [...new Set([
      ...getAllDefaultItems(),
      ...rows.filter(r => r.item && !r._isBlankCategory).map(r => r.item),
    ])].filter(i => !existingItemSet.has(i)).sort();
    const isItemDropTarget = !!draggingItem && dragOverCategory === category && draggingItem.fromCategory !== category;

    return (
      <div
        key={category}
        draggable={!isEditing}
        onDragStart={e => { e.stopPropagation(); setDragging(category); }}
        onDragEnd={() => { setDragging(null); setDragOverGroup(null); }}
        onDragEnter={() => { if (draggingItem && draggingItem.fromCategory !== category) setDragOverCategory(category); }}
        onDragOver={e => { if (draggingItem) e.preventDefault(); }}
        onDrop={e => { e.stopPropagation(); handleItemDrop(category); }}
        style={{
          marginBottom: "0.5rem",
          opacity: isDragging ? 0.4 : 1,
          transition: "opacity 0.15s",
        }}
      >
        <div style={{
          alignItems: "center",
          background: isItemDropTarget ? "#1a2035" : "var(--fm-bg-raised)",
          border: `1px solid ${isItemDropTarget ? "var(--fm-brass)50" : "var(--fm-hairline)"}`,
          borderRadius: isCollapsed ? "6px" : "6px 6px 0 0",
          cursor: isEditing ? "default" : "grab",
          display: "flex",
          gap: "0.75rem",
          padding: "0.8rem 1rem",
          transition: "background 0.15s, border-color 0.15s",
          userSelect: "none",
        }}>
          <span style={{ color: "var(--fm-ink-dim)", flexShrink: 0, fontSize: "0.7rem", lineHeight: 1 }}>⠿</span>
          <button
            onClick={e => { e.stopPropagation(); toggleCollapse(category); }}
            style={{
              background: "none",
              border: "none",
              color: "var(--fm-ink-dim)",
              cursor: "pointer",
              fontFamily: "var(--fm-mono)",
              fontSize: "0.65rem",
              padding: 0,
              width: 14,
            }}
          >
            {isCollapsed ? "▶" : "▼"}
          </button>

          {isEditing ? (
            <InlineInput
              initialValue={category}
              placeholder="Category name..."
              onCommit={name => handleCategoryRename(category, name)}
              onCancel={() => setEditingCategoryName(null)}
            />
          ) : (
            <Tooltip text={isCategoryDefault ? CATEGORY_TIPS[category] : undefined}>
              <span
                onClick={e => { e.stopPropagation(); setEditingCategoryName(category); }}
                title="Click to rename"
                style={{ color: "var(--fm-ink)", cursor: "text", flex: 1, fontSize: "0.95rem" }}
              >
                {category}
              </span>
            </Tooltip>
          )}

          {!isEditing && (
            <>
              {effectiveCategoryTypes[category] === "room" && !isCollapsed && (
                <select
                  value={roomSubtypes[category] ?? ""}
                  onClick={e => e.stopPropagation()}
                  onChange={e => { e.stopPropagation(); handleSetRoomSubtype(category, e.target.value || null); }}
                  style={{
                    background: "var(--fm-bg)",
                    border: `1px solid ${roomSubtypes[category] ? "#3a4055" : "var(--fm-hairline2)"}`,
                    borderRadius: "3px",
                    color: roomSubtypes[category] ? "var(--fm-brass-dim)" : "#4a5060",
                    cursor: "pointer",
                    fontFamily: "var(--fm-mono)",
                    fontSize: "0.6rem",
                    letterSpacing: "0.04em",
                    padding: "0.1rem 0.25rem",
                  }}
                >
                  <option value="">— type —</option>
                  {ROOM_SUBTYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              <span style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.68rem" }}>
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
              <button
                onClick={e => { e.stopPropagation(); handleDuplicateCategory(category); }}
                title="Duplicate category"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--fm-ink-dim)",
                  cursor: "pointer",
                  fontFamily: "var(--fm-mono)",
                  fontSize: "0.8rem",
                  padding: "0.1rem 0.3rem",
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--fm-brass)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--fm-ink-dim)"}
              >
                ⎘
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleDeleteClick(category); }}
                title="Delete category"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--fm-ink-dim)",
                  cursor: "pointer",
                  fontFamily: "var(--fm-mono)",
                  fontSize: "0.72rem",
                  padding: "0.1rem 0.3rem",
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--fm-red)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--fm-ink-dim)"}
              >
                ×
              </button>
            </>
          )}
        </div>

        {!isCollapsed && (
          <div style={{ border: "1px solid var(--fm-hairline)", borderTop: "none", borderRadius: "0 0 6px 6px", overflow: "hidden" }}>
            {items.map((item, idx) => {
              const isLast = idx === items.length - 1 && pendingItems.length === 0;
              const isItemDragging = draggingItem?.item === item && draggingItem?.fromCategory === category;
              const itemKey = `${category}|${item}`;
              const isSelected = selectedItem?.category === category && selectedItem?.item === item;
              const details = itemDetails[itemKey] || {};
              const rowBg = idx % 2 === 0 ? "var(--fm-bg-raised)" : "#161920";
              return (
                <Fragment key={item}>
                  <div
                    draggable
                    onDragStart={e => { e.stopPropagation(); setDraggingItem({ item, fromCategory: category }); }}
                    onDragEnd={e => { e.stopPropagation(); setDraggingItem(null); setDragOverCategory(null); }}
                    style={{
                      alignItems: "center",
                      background: isSelected ? "#1a2035" : rowBg,
                      borderBottom: "1px solid var(--fm-hairline)",
                      borderLeft: isSelected ? "2px solid var(--fm-brass)" : "2px solid transparent",
                      cursor: "grab",
                      display: "flex",
                      gap: "1rem",
                      opacity: isItemDragging ? 0.4 : 1,
                      padding: "0.5rem 1rem 0.5rem 1.75rem",
                      transition: "opacity 0.15s, background 0.1s",
                    }}
                  >
                    {editingItemName?.category === category && editingItemName?.item === item ? (
                      <input
                        autoFocus
                        defaultValue={item}
                        onKeyDown={e => {
                          if (e.key === "Enter") { e.preventDefault(); handleItemRename(category, item, e.currentTarget.value); }
                          if (e.key === "Escape") { e.preventDefault(); setEditingItemName(null); }
                        }}
                        onBlur={e => handleItemRename(category, item, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        style={{ background: "var(--fm-bg-panel)", border: "1px solid var(--fm-brass)", borderRadius: "2px", color: "var(--fm-ink)", flex: 1, fontFamily: "var(--fm-mono)", fontSize: "0.78rem", outline: "none", padding: "0.1rem 0.3rem" }}
                      />
                    ) : (
                      <Tooltip text={ITEM_TIPS[item]}>
                        <span
                          onClick={e => { e.stopPropagation(); setSelectedItem({ category, item }); }}
                          onDoubleClick={e => { e.stopPropagation(); setEditingItemName({ category, item }); }}
                          style={{
                            color: isSelected ? "var(--fm-brass)" : "var(--fm-ink-dim)",
                            cursor: "pointer",
                            flex: 1,
                            fontFamily: "var(--fm-mono)",
                            fontSize: "0.78rem",
                          }}
                        >
                          {item}
                        </span>
                      </Tooltip>
                    )}
                    {(() => {
                      const cov = itemCoverageMap[`${category}|${item}`];
                      if (!cov) return (
                        <span style={{ color: "#3a3548", flexShrink: 0, fontFamily: "var(--fm-mono)", fontSize: "0.6rem" }}>no tasks</span>
                      );
                      if (cov.unscheduled > 0) return (
                        <span style={{ color: "#5a4a2e", flexShrink: 0, fontFamily: "var(--fm-mono)", fontSize: "0.6rem" }}>{cov.unscheduled} unscheduled</span>
                      );
                      return null;
                    })()}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        const r = e.currentTarget.getBoundingClientRect();
                        setDuplicateItemPopup({ item, fromCategory: category, x: r.left, y: r.bottom + 4 });
                      }}
                      title="Copy item to another category"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--fm-ink-dim)",
                        cursor: "pointer",
                        flexShrink: 0,
                        fontFamily: "var(--fm-mono)",
                        fontSize: "0.8rem",
                        padding: "0.1rem 0.3rem",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--fm-brass)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--fm-ink-dim)"}
                    >
                      ⎘
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleItemDeleteClick(category, item); }}
                      title="Delete item"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--fm-ink-dim)",
                        cursor: "pointer",
                        fontFamily: "var(--fm-mono)",
                        fontSize: "0.72rem",
                        flexShrink: 0,
                        padding: "0.1rem 0.3rem",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--fm-red)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--fm-ink-dim)"}
                    >
                      ×
                    </button>
                  </div>
                </Fragment>
              );
            })}

            {pendingItems.map((row, idx) => {
              const isLast = idx === pendingItems.length - 1;
              return (
                <div
                  key={row._id}
                  style={{
                    alignItems: "center",
                    background: (items.length + idx) % 2 === 0 ? "var(--fm-bg-raised)" : "#161920",
                    borderBottom: isLast ? "none" : "1px solid var(--fm-hairline)",
                    display: "flex",
                    gap: "1rem",
                    padding: "0.4rem 1rem 0.4rem 2.75rem",
                  }}
                >
                  <InlineComboInput
                    placeholder="Item name..."
                    options={itemSuggestions}
                    onCommit={name => handleCommitItemName(row._id, name)}
                    onCancel={() => handleCancelNewItem(row._id)}
                  />
                </div>
              );
            })}

            <div style={{
              borderTop: items.length > 0 || pendingItems.length > 0 ? "1px solid var(--fm-hairline)" : "none",
              padding: "0.4rem 1rem 0.4rem 2.75rem",
            }}>
              <button
                onMouseEnter={e => { e.currentTarget.style.color = "var(--fm-brass)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--fm-brass-dim)"; }}
                onClick={() => handleAddItem(category)}
                style={addBtnStyle(false)}
              >
                + Add Item
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function buildDeleteMessage({ item, itemCount, taskCount, isDefault }) {
    if (item) {
      const scope = taskCount > 0
        ? `This will permanently remove ${taskCount} task${taskCount !== 1 ? "s" : ""} from your maintenance schedule.`
        : "This item has no tasks.";
      const recovery = isDefault
        ? " Default items can be restored by resetting to default."
        : " This action cannot be undone.";
      return scope + recovery;
    }
    const parts = [];
    if (itemCount > 0) parts.push(`${itemCount} item${itemCount !== 1 ? "s" : ""}`);
    if (taskCount > 0) parts.push(`${taskCount} task${taskCount !== 1 ? "s" : ""}`);
    const scope = parts.length > 0
      ? `This will permanently remove ${parts.join(" and ")} from your maintenance schedule.`
      : "This category has no items or tasks.";
    const recovery = isDefault
      ? " Default categories can be restored by resetting to default."
      : " This action cannot be undone.";
    return scope + recovery;
  }

  return (
    <div style={{
      height: "100vh",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      background: "var(--fm-bg)",
      color: "var(--fm-ink)",
      fontFamily: "var(--fm-sans)",
    }}>

      {duplicateItemPopup && createPortal(
        <>
          <div
            onClick={() => setDuplicateItemPopup(null)}
            style={{ bottom: 0, left: 0, position: "fixed", right: 0, top: 0, zIndex: 9998 }}
          />
          <div style={{
            background: "var(--fm-bg-panel)",
            border: "1px solid var(--fm-hairline2)",
            borderRadius: "4px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            left: duplicateItemPopup.x,
            maxHeight: 260,
            overflowY: "auto",
            position: "fixed",
            top: duplicateItemPopup.y,
            width: 220,
            zIndex: 9999,
          }}>
            <div style={{
              borderBottom: "1px solid var(--fm-hairline2)",
              color: "var(--fm-ink-dim)",
              fontFamily: "var(--fm-mono)",
              fontSize: "0.62rem",
              letterSpacing: "0.1em",
              padding: "0.45rem 0.65rem",
              textTransform: "uppercase",
            }}>
              Copy to category
            </div>
            {CATEGORIES
              .filter(cat => cat !== duplicateItemPopup.fromCategory && !CATEGORY_ITEMS[cat]?.includes(duplicateItemPopup.item))
              .map(cat => (
                <div
                  key={cat}
                  onClick={() => handleDuplicateItemToCategory(cat)}
                  style={{
                    color: "var(--fm-brass)",
                    cursor: "pointer",
                    fontFamily: "var(--fm-mono)",
                    fontSize: "0.78rem",
                    padding: "0.35rem 0.65rem",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--fm-ink-dim)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {cat}
                </div>
              ))
            }
            {CATEGORIES.filter(cat => cat !== duplicateItemPopup.fromCategory && !CATEGORY_ITEMS[cat]?.includes(duplicateItemPopup.item)).length === 0 && (
              <div style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.75rem", padding: "0.5rem 0.65rem" }}>
                No other categories
              </div>
            )}
          </div>
        </>,
        document.body
      )}

      {deletePrompt && (
        <div
          onClick={() => setDeletePrompt(null)}
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
              background: "var(--fm-bg-panel)",
              border: "1px solid var(--fm-hairline2)",
              borderRadius: "8px",
              maxWidth: 440,
              padding: "2rem",
              width: "90%",
            }}
          >
            <div style={{ color: "var(--fm-ink)", fontSize: "1.05rem", marginBottom: "0.75rem" }}>
              {deletePrompt.item
                ? `Delete "${deletePrompt.item}"?`
                : `Delete "${deletePrompt.category}"?`}
            </div>
            <p style={{
              color: "var(--fm-ink-dim)",
              fontFamily: "var(--fm-mono)",
              fontSize: "0.8rem",
              lineHeight: 1.7,
              margin: "0 0 1.75rem",
            }}>
              {buildDeleteMessage(deletePrompt)}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeletePrompt(null)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--fm-hairline2)",
                  borderRadius: "3px",
                  color: "var(--fm-brass-dim)",
                  cursor: "pointer",
                  fontFamily: "var(--fm-mono)",
                  fontSize: "0.72rem",
                  letterSpacing: "0.08em",
                  padding: "0.4rem 0.9rem",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--fm-ink-dim)"; e.currentTarget.style.color = "var(--fm-ink)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--fm-ink-dim)"; e.currentTarget.style.color = "var(--fm-brass-dim)"; }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  background: "#f8717118",
                  border: "1px solid #f8717140",
                  borderRadius: "3px",
                  color: "var(--fm-red)",
                  cursor: "pointer",
                  fontFamily: "var(--fm-mono)",
                  fontSize: "0.72rem",
                  letterSpacing: "0.08em",
                  padding: "0.4rem 0.9rem",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f8717130"; e.currentTarget.style.borderColor = "var(--fm-red)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#f8717118"; e.currentTarget.style.borderColor = "#f8717140"; }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {addingTask && selectedItem && createPortal(
        <div
          onClick={() => { setAddingTask(false); setEditingTask(null); setNewTask({ task: "", schedule: "", season: null, lastCompleted: null, nextDate: null, followSchedule: false, notes: "" }); }}
          style={{ alignItems: "center", background: "rgba(0,0,0,0.75)", bottom: 0, display: "flex", justifyContent: "center", left: 0, position: "fixed", right: 0, top: 0, zIndex: 1000 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "var(--fm-bg)", border: "1px solid var(--fm-hairline2)", borderRadius: "8px", maxWidth: "min(95vw, 1120px)", overflow: "hidden", width: "95vw" }}
          >
            <div style={{ alignItems: "center", borderBottom: "1px solid var(--fm-hairline)", display: "flex", justifyContent: "space-between", padding: "0.85rem 1.25rem" }}>
              <div>
                <span style={{ color: "var(--fm-brass)", fontFamily: "var(--fm-mono)", fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>{editingTask ? "Edit Maintenance Task" : "Add Maintenance Task"}</span>
                <span style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.65rem", marginLeft: "0.75rem" }}>{selectedItem.item} — {selectedItem.category}</span>
              </div>
              <button
                onClick={() => { setAddingTask(false); setEditingTask(null); setNewTask({ task: "", schedule: "", season: null, lastCompleted: null, nextDate: null, followSchedule: false, notes: "" }); }}
                style={{ background: "none", border: "none", color: "var(--fm-ink-dim)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "1rem", padding: "0.1rem 0.3rem", transition: "color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--fm-red)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--fm-ink-dim)"}
              >×</button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: "0.82rem", width: "100%" }}>
                <thead>
                  <tr>
                    {[
                      { label: "Category", width: "8%" },
                      { label: "Item", width: "10%" },
                      { label: "Type of Maintenance", width: "17%" },
                      { label: "Recommended Schedule", width: "12%" },
                      { label: "Season", width: "7%" },
                      { label: "Last Completed On", width: "12%" },
                      { label: "Next Maintenance Date", width: "13%" },
                      { label: "Notes", width: "9%" },
                    ].map(({ label, width }) => (
                      <th key={label} style={{ background: "var(--fm-bg-panel)", borderBottom: "2px solid var(--fm-hairline2)", color: "var(--fm-brass)", fontFamily: "var(--fm-mono)", fontSize: "0.68rem", fontWeight: "normal", letterSpacing: "0.12em", padding: "0.75rem 0.6rem", textAlign: "left", textTransform: "uppercase", whiteSpace: "nowrap", width }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: "var(--fm-bg-raised)" }}>
                    <td style={{ color: "var(--fm-brass-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>{selectedItem.category}</td>
                    <td style={{ color: "var(--fm-ink)", fontFamily: "var(--fm-mono)", fontSize: "0.75rem", padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>{selectedItem.item}</td>
                    <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                      <input
                        autoFocus
                        value={newTask.task}
                        placeholder="Task name"
                        disabled={editingTask && !editingTask._isCustom}
                        onChange={e => setNewTask(t => ({ ...t, task: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === "Enter" && newTask.task.trim()) { e.preventDefault(); editingTask ? handleUpdateTask(editingTask) : handleAddTask(); }
                          if (e.key === "Escape") { e.preventDefault(); setAddingTask(false); setEditingTask(null); setNewTask({ task: "", schedule: "", season: null, lastCompleted: null, nextDate: null, followSchedule: false, notes: "" }); }
                        }}
                        style={{ background: "var(--fm-bg-panel)", border: "1px solid var(--fm-hairline2)", borderRadius: "2px", boxSizing: "border-box", color: editingTask && !editingTask._isCustom ? "var(--fm-ink-dim)" : "var(--fm-ink)", fontFamily: "var(--fm-mono)", fontSize: "0.8rem", opacity: editingTask && !editingTask._isCustom ? 0.6 : 1, outline: "none", padding: "0.25rem 0.4rem", width: "100%" }}
                        onFocus={e => { if (!(editingTask && !editingTask._isCustom)) e.currentTarget.style.borderColor = "var(--fm-brass)"; }}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--fm-ink-dim)"}
                      />
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                      <SchedulePicker
                        value={newTask.schedule || null}
                        onChange={v => setNewTask(t => ({ ...t, schedule: v || "" }))}
                      />
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                      <select
                        value={newTask.season ?? ""}
                        onChange={e => setNewTask(t => ({ ...t, season: e.target.value || null }))}
                        style={{ appearance: "none", background: "var(--fm-bg-panel)", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a5460'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.4rem center", border: "1px solid var(--fm-hairline2)", borderRadius: "2px", boxSizing: "border-box", color: "var(--fm-ink)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.75rem", outline: "none", padding: "0.25rem 1.5rem 0.25rem 0.4rem", width: "100%" }}
                        onFocus={e => e.currentTarget.style.borderColor = "var(--fm-brass)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--fm-ink-dim)"}
                      >
                        {SEASON_OPTIONS.map(({ value, label }) => <option key={label} value={value ?? ""}>{label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                      <input
                        type="date"
                        value={newTask.lastCompleted || ""}
                        onChange={e => setNewTask(t => ({ ...t, lastCompleted: e.target.value || null }))}
                        style={{ background: "var(--fm-bg-panel)", border: "1px solid var(--fm-hairline2)", borderRadius: "2px", boxSizing: "border-box", color: newTask.lastCompleted ? "var(--fm-ink)" : "var(--fm-ink-dim)", colorScheme: "dark", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", outline: "none", padding: "0.25rem 0.4rem", width: "100%" }}
                        onFocus={e => e.currentTarget.style.borderColor = "var(--fm-brass)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--fm-ink-dim)"}
                      />
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                      <div style={{ alignItems: "center", display: "flex", gap: "0.4rem" }}>
                        <input
                          type="date"
                          value={newTask.nextDate || ""}
                          onChange={e => setNewTask(t => ({ ...t, nextDate: e.target.value || null }))}
                          style={{ background: "var(--fm-bg-panel)", border: "1px solid var(--fm-hairline2)", borderRadius: "2px", boxSizing: "border-box", color: newTask.nextDate ? "var(--fm-ink)" : "var(--fm-ink-dim)", colorScheme: "dark", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", outline: "none", padding: "0.25rem 0.4rem", width: "100%" }}
                          onFocus={e => e.currentTarget.style.borderColor = "var(--fm-brass)"}
                          onBlur={e => e.currentTarget.style.borderColor = "var(--fm-ink-dim)"}
                        />
                        <FollowButton
                          schedule={newTask.schedule}
                          checked={newTask.followSchedule}
                          onToggle={() => setNewTask(t => ({ ...t, followSchedule: !t.followSchedule }))}
                        />
                      </div>
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                      <input
                        value={newTask.notes}
                        placeholder="—"
                        onChange={e => setNewTask(t => ({ ...t, notes: e.target.value }))}
                        style={{ background: "var(--fm-bg-panel)", border: "1px solid var(--fm-hairline2)", borderRadius: "2px", boxSizing: "border-box", color: "var(--fm-ink)", fontFamily: "var(--fm-mono)", fontSize: "0.75rem", outline: "none", padding: "0.25rem 0.4rem", width: "100%" }}
                        onFocus={e => e.currentTarget.style.borderColor = "var(--fm-brass)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--fm-ink-dim)"}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: "1px solid var(--fm-hairline)", display: "flex", gap: "0.75rem", justifyContent: "flex-end", padding: "1rem 1.25rem" }}>
              <button
                onClick={() => { setAddingTask(false); setEditingTask(null); setNewTask({ task: "", schedule: "", season: null, lastCompleted: null, nextDate: null, followSchedule: false, notes: "" }); }}
                style={{ background: "transparent", border: "1px solid var(--fm-hairline2)", borderRadius: "3px", color: "var(--fm-brass-dim)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--fm-ink-dim)"; e.currentTarget.style.color = "var(--fm-ink)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--fm-ink-dim)"; e.currentTarget.style.color = "var(--fm-brass-dim)"; }}
              >Cancel</button>
              <button
                onClick={editingTask ? () => handleUpdateTask(editingTask) : handleAddTask}
                disabled={!newTask.task.trim()}
                style={{ background: newTask.task.trim() ? "var(--fm-brass)18" : "transparent", border: `1px solid ${newTask.task.trim() ? "var(--fm-brass)40" : "var(--fm-ink-dim)"}`, borderRadius: "3px", color: newTask.task.trim() ? "var(--fm-brass)" : "var(--fm-ink-dim)", cursor: newTask.task.trim() ? "pointer" : "default", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
                onMouseEnter={e => { if (newTask.task.trim()) { e.currentTarget.style.background = "var(--fm-brass)30"; e.currentTarget.style.borderColor = "var(--fm-brass)"; } }}
                onMouseLeave={e => { if (newTask.task.trim()) { e.currentTarget.style.background = "var(--fm-brass)18"; e.currentTarget.style.borderColor = "var(--fm-brass)40"; } }}
              >{editingTask ? "Save" : "Add Task"}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {addTaskModalOpen && selectedItem && (
        <AddTaskModal
          categories={[]}
          rows={[]}
          lockCategoryItem
          initialCategory={selectedItem.category}
          initialItem={selectedItem.item}
          onSave={handleAddTaskFromModal}
          onClose={() => setAddTaskModalOpen(false)}
        />
      )}

      {deleteTaskPrompt && createPortal(
        <div
          onClick={() => setDeleteTaskPrompt(null)}
          style={{ alignItems: "center", background: "rgba(0,0,0,0.7)", bottom: 0, display: "flex", justifyContent: "center", left: 0, position: "fixed", right: 0, top: 0, zIndex: 1000 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--fm-bg-panel)", border: "1px solid var(--fm-hairline2)", borderRadius: "8px", maxWidth: 440, padding: "2rem", width: "90%" }}>
            <div style={{ color: "var(--fm-ink)", fontSize: "1.05rem", marginBottom: "0.75rem" }}>
              Delete "{deleteTaskPrompt.task}"?
            </div>
            <p style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.8rem", lineHeight: 1.7, margin: "0 0 1.75rem" }}>
              {deleteTaskPrompt?._isCustom
                ? "This will permanently remove this task from the maintenance schedule. This action cannot be undone."
                : "This will remove this task from your maintenance schedule. It can be restored from the Guide page."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteTaskPrompt(null)}
                style={{ background: "transparent", border: "1px solid var(--fm-hairline2)", borderRadius: "3px", color: "var(--fm-brass-dim)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--fm-ink-dim)"; e.currentTarget.style.color = "var(--fm-ink)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--fm-ink-dim)"; e.currentTarget.style.color = "var(--fm-brass-dim)"; }}
              >Cancel</button>
              <button
                onClick={() => { handleDeleteTask(deleteTaskPrompt); setDeleteTaskPrompt(null); }}
                style={{ background: "#f8717118", border: "1px solid #f8717140", borderRadius: "3px", color: "var(--fm-red)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f8717130"; e.currentTarget.style.borderColor = "var(--fm-red)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#f8717118"; e.currentTarget.style.borderColor = "#f8717140"; }}
              >Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteProjectPrompt && createPortal(
        <div
          onClick={() => setDeleteProjectPrompt(null)}
          style={{ alignItems: "center", background: "rgba(0,0,0,0.7)", bottom: 0, display: "flex", justifyContent: "center", left: 0, position: "fixed", right: 0, top: 0, zIndex: 1000 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--fm-bg-panel)", border: "1px solid var(--fm-hairline2)", borderRadius: "8px", maxWidth: 440, padding: "2rem", width: "90%" }}>
            <div style={{ color: "var(--fm-ink)", fontSize: "1.05rem", marginBottom: "0.75rem" }}>
              Delete "{deleteProjectPrompt.name}"?
            </div>
            <p style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.8rem", lineHeight: 1.7, margin: "0 0 1.75rem" }}>
              This will permanently delete this project. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteProjectPrompt(null)}
                style={{ background: "transparent", border: "1px solid var(--fm-hairline2)", borderRadius: "3px", color: "var(--fm-brass-dim)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--fm-ink-dim)"; e.currentTarget.style.color = "var(--fm-ink)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--fm-ink-dim)"; e.currentTarget.style.color = "var(--fm-brass-dim)"; }}
              >Cancel</button>
              <button
                onClick={() => handleDeleteProject(deleteProjectPrompt)}
                style={{ background: "#f8717118", border: "1px solid #f8717140", borderRadius: "3px", color: "var(--fm-red)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f8717130"; e.currentTarget.style.borderColor = "var(--fm-red)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#f8717118"; e.currentTarget.style.borderColor = "#f8717140"; }}
              >Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteTodoPrompt && createPortal(
        <div
          onClick={() => setDeleteTodoPrompt(null)}
          style={{ alignItems: "center", background: "rgba(0,0,0,0.7)", bottom: 0, display: "flex", justifyContent: "center", left: 0, position: "fixed", right: 0, top: 0, zIndex: 1000 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--fm-bg-panel)", border: "1px solid var(--fm-hairline2)", borderRadius: "8px", maxWidth: 440, padding: "2rem", width: "90%" }}>
            <div style={{ color: "var(--fm-ink)", fontSize: "1.05rem", marginBottom: "0.75rem" }}>
              Delete "{deleteTodoPrompt.title}"?
            </div>
            <p style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.8rem", lineHeight: 1.7, margin: "0 0 1.75rem" }}>
              This will permanently delete this to do. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteTodoPrompt(null)}
                style={{ background: "transparent", border: "1px solid var(--fm-hairline2)", borderRadius: "3px", color: "var(--fm-brass-dim)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--fm-ink-dim)"; e.currentTarget.style.color = "var(--fm-ink)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--fm-ink-dim)"; e.currentTarget.style.color = "var(--fm-brass-dim)"; }}
              >Cancel</button>
              <button
                onClick={() => handleDeleteTodo(deleteTodoPrompt)}
                style={{ background: "#f8717118", border: "1px solid #f8717140", borderRadius: "3px", color: "var(--fm-red)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f8717130"; e.currentTarget.style.borderColor = "var(--fm-red)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#f8717118"; e.currentTarget.style.borderColor = "#f8717140"; }}
              >Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <FmHeader active="Inventory" tagline="Inventory" />
      <FmSubnav
        tabs={["All items", "By system", "By room"]}
        active={activeTab}
        onTabChange={setActiveTab}
        stats={[
          { value: totalItems, label: "items" },
          { value: systemCatCount, label: "systems" },
          { value: roomCatCount, color: "var(--fm-cyan)", label: "rooms" },
        ]}
      />

      <div style={{ display: "flex", flex: 1, flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", flex: 1, gap: "2rem", overflow: "hidden", padding: "2rem 2rem 0" }}>
        <div style={{ flex: "0 0 58%", minWidth: 0, overflowY: "auto", paddingBottom: "4rem", scrollbarGutter: "stable" }}>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "2rem" }}>
          <button
            onClick={cycleExpand}
            style={{
              background: "transparent",
              border: "1px solid var(--fm-hairline2)",
              borderRadius: "3px",
              color: "var(--fm-brass-dim)",
              cursor: "pointer",
              fontFamily: "var(--fm-mono)",
              fontSize: "0.65rem",
              letterSpacing: "0.08em",
              padding: "0.3rem 0.7rem",
              transition: "all 0.15s",
              width: "5.5rem",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--fm-brass)"; e.currentTarget.style.color = "var(--fm-brass)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--fm-ink-dim)"; e.currentTarget.style.color = "var(--fm-brass-dim)"; }}
          >
            {expandLevel === 2 ? "Collapse" : "Expand"}
          </button>
        </div>

        {filteredGroupOrder.map(groupType => {
          const rawCats = groupedCategories[groupType];
          const isSorted = sortedGroups.has(groupType);
          const cats = isSorted ? [...rawCats].sort((a, b) => a.localeCompare(b)) : rawCats;
          const isTarget = !!dragging && dragOverGroup === groupType && effectiveCategoryTypes[dragging] !== groupType;
          const isGroupCollapsed = collapsedGroups[groupType];
          const isPendingHere = pendingNewCategory?.groupType === groupType;
          const existingCatSet = new Set(CATEGORIES);
          const categorySuggestions = getCategoriesForGroup(groupType)
            .filter(c => !existingCatSet.has(c));

          return (
            <div
              key={groupType}
              onDragEnter={() => dragging && setDragOverGroup(groupType)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(groupType)}
              style={{
                background: isTarget ? "var(--fm-bg-panel)40" : "transparent",
                border: isTarget ? "1px dashed var(--fm-brass)50" : "1px solid transparent",
                borderRadius: "8px",
                marginBottom: "2rem",
                padding: isTarget ? "0.75rem" : "0",
                transition: "all 0.15s",
              }}
            >
              <div
                onClick={() => toggleGroup(groupType)}
                style={{
                  alignItems: "center",
                  borderBottom: `1px solid ${isTarget ? "var(--fm-brass)30" : "var(--fm-ink-dim)"}`,
                  cursor: "pointer",
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: isGroupCollapsed ? "0" : "0.75rem",
                  paddingBottom: "0.4rem",
                  userSelect: "none",
                }}
              >
                <span style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.6rem" }}>
                  {isGroupCollapsed ? "▶" : "▼"}
                </span>
                <span style={{
                  color: "var(--fm-brass)",
                  fontFamily: "var(--fm-mono)",
                  fontSize: "0.65rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}>
                  {GROUP_LABELS[groupType]}
                </span>
                <span style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.62rem" }}>
                  · {cats.length}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); setSortedGroups(prev => { const next = new Set(prev); isSorted ? next.delete(groupType) : next.add(groupType); return next; }); }}
                  style={{
                    background: "transparent",
                    border: `1px solid ${isSorted ? "var(--fm-brass)" : "#3a3548"}`,
                    borderRadius: "3px",
                    color: isSorted ? "var(--fm-brass)" : "#5a5468",
                    cursor: "pointer",
                    fontFamily: "var(--fm-mono)",
                    fontSize: "0.55rem",
                    letterSpacing: "0.08em",
                    marginLeft: "auto",
                    padding: "0.15rem 0.4rem",
                    transition: "all 0.15s",
                  }}
                >
                  A→Z
                </button>
              </div>

              {!isGroupCollapsed && (
                <>
                  {groupType === "room" ? (() => {
                    // Group by subtype, sorted alphabetically; untyped rooms rendered last with no label
                    const bySubtype = {};
                    cats.forEach(cat => {
                      const sub = roomSubtypes[cat] || null;
                      const sortKey = sub ?? "\xff";
                      if (!bySubtype[sortKey]) bySubtype[sortKey] = { label: sub, cats: [] };
                      bySubtype[sortKey].cats.push(cat);
                    });
                    return Object.keys(bySubtype)
                      .sort((a, b) => a.localeCompare(b))
                      .map(key => {
                        const { label, cats: groupCats } = bySubtype[key];
                        const sortedCats = [...groupCats].sort((a, b) => a.localeCompare(b));
                        return (
                          <div key={key}>
                            {label && (
                              <div style={{ color: "#4a5060", fontFamily: "var(--fm-mono)", fontSize: "0.56rem", letterSpacing: "0.14em", margin: "0.6rem 0 0.3rem 0.25rem", textTransform: "uppercase" }}>
                                {label}
                              </div>
                            )}
                            {sortedCats.map(category => renderCategory(category))}
                          </div>
                        );
                      });
                  })() : cats.map(category => renderCategory(category))}

                  {isPendingHere && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      <div style={{
                        alignItems: "center",
                        background: "var(--fm-bg-raised)",
                        border: "1px solid var(--fm-hairline)",
                        borderRadius: "6px",
                        display: "flex",
                        gap: "0.75rem",
                        padding: "0.8rem 1rem",
                      }}>
                        <span style={{ color: "var(--fm-ink-dim)", flexShrink: 0, fontSize: "0.7rem" }}>⠿</span>
                        <span style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.65rem", width: 14 }}>▶</span>
                        <InlineComboInput
                          placeholder="Category name..."
                          options={categorySuggestions}
                          onCommit={name => handleCommitNewCategory(name, pendingNewCategory.id)}
                          onCancel={() => handleCancelNewCategory(pendingNewCategory.id)}
                        />
                      </div>
                    </div>
                  )}

                  {cats.length === 0 && !isPendingHere && (
                    <div style={{
                      border: `1px dashed ${isTarget ? "var(--fm-brass)50" : "var(--fm-ink-dim)"}`,
                      borderRadius: "6px",
                      color: isTarget ? "var(--fm-brass)80" : "var(--fm-ink-dim)",
                      fontFamily: "var(--fm-mono)",
                      fontSize: "0.72rem",
                      marginBottom: "0.5rem",
                      padding: "1.5rem",
                      textAlign: "center",
                      transition: "all 0.15s",
                    }}>
                      {isTarget ? "drop here" : "empty"}
                    </div>
                  )}

                  <div style={{ paddingTop: "0.25rem" }}>
                    <button
                      onMouseEnter={e => { e.currentTarget.style.color = "var(--fm-brass)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "var(--fm-brass-dim)"; }}
                      onClick={() => handleAddCategory(groupType)}
                      style={addBtnStyle(false)}
                    >
                      + Add Category
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        </div>

        <div style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          gap: "2rem",
          minWidth: 0,
          overflowY: "auto",
          paddingBottom: "4rem",
        }}>
          <div style={{ background: "var(--fm-bg-raised)", border: "1px solid var(--fm-hairline)", borderRadius: "8px" }}>
          {/* Panel header */}
          <div style={{ borderBottom: "1px solid var(--fm-hairline)", padding: "0.75rem 1rem 0.6rem" }}>
            {selectedItem ? (
              <>
                <div style={{ color: "var(--fm-brass)", fontFamily: "var(--fm-mono)", fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>Item</div>
                <div style={{ color: "var(--fm-ink)", fontFamily: "var(--fm-mono)", fontSize: "0.82rem", marginTop: "0.35rem" }}>
                  {selectedItem.item}
                  <span style={{ color: "var(--fm-ink-dim)", fontSize: "0.65rem", marginLeft: "0.5rem" }}>— {selectedItem.category}</span>
                </div>
              </>
            ) : (
              <div style={{ color: "var(--fm-brass)", fontFamily: "var(--fm-mono)", fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>Item Details</div>
            )}
          </div>

          {!selectedItem ? (
            <div style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", padding: "2.5rem 1rem", textAlign: "center" }}>
              Select an item to view details
            </div>
          ) : (
            <div style={{ padding: "0.75rem 1rem 0.85rem" }}>
              {(() => {
                const cfKey = `${selectedItem.category}|${selectedItem.item}`;
                const itmFields = itemFieldSchemas[cfKey] || [];
                const vals = customFieldValues[cfKey] || {};
                const addedIds = new Set(itmFields.map(f => f.id));
                const svgArrow = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a5460'/%3E%3C/svg%3E")`;
                const fieldStyle = { background: "var(--fm-bg)", border: "1px solid var(--fm-hairline2)", borderRadius: "3px", boxSizing: "border-box", color: "var(--fm-ink)", fontFamily: "var(--fm-mono)", fontSize: "0.75rem", outline: "none", padding: "0.3rem 0.5rem", width: "100%" };
                const labelStyle = { color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase" };
                const chipBtn = { background: "var(--fm-bg-raised)", border: "1px solid var(--fm-hairline)", borderRadius: "3px", color: "var(--fm-ink-dim)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.65rem", letterSpacing: "0.04em", padding: "0.2rem 0.55rem", transition: "all 0.12s" };

                function renderFieldInput(field) {
                  const val = vals[field.id] ?? "";
                  const onChange = v => handleCustomFieldValueChange(selectedItem.category, selectedItem.item, field.id, v);

                  if (field.id === "manufacturer") {
                    const mfrs = getManufacturers(selectedItem.item);
                    return <ModelComboField value={val} models={mfrs} fieldStyle={fieldStyle} onChange={onChange} />;
                  }
                  if (field.id === "model") {
                    const mfr = vals.manufacturer || "";
                    const models = getModels(mfr, selectedItem.item);
                    return <ModelComboField value={val} models={models} fieldStyle={fieldStyle} onChange={onChange} />;
                  }
                  if (field.type === "receipt") {
                    const receipt = vals[field.id];
                    return receipt ? (
                      <div style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}>
                        <img src={receipt} alt="Receipt" onClick={() => window.open(receipt, "_blank")} style={{ border: "1px solid var(--fm-hairline2)", borderRadius: "3px", cursor: "pointer", height: 44, objectFit: "cover", width: 66 }} />
                        <button onClick={() => onChange(null)} style={{ background: "none", border: "none", color: "var(--fm-ink-dim)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", padding: "0.1rem 0.3rem", transition: "color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--fm-red)"} onMouseLeave={e => e.currentTarget.style.color = "var(--fm-ink-dim)"}>×</button>
                      </div>
                    ) : (
                      <label style={{ cursor: "pointer", lineHeight: 1 }}>
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => { const file = e.target.files[0]; if (!file) return; const dataUrl = await compressImage(file); onChange(dataUrl); e.target.value = ""; }} />
                        <span style={{ border: "1px dashed var(--fm-ink-dim)", borderRadius: "3px", color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.7rem", letterSpacing: "0.08em", padding: "0.25rem 0.65rem", transition: "color 0.15s, border-color 0.15s" }} onMouseEnter={e => { e.currentTarget.style.color = "var(--fm-brass)"; e.currentTarget.style.borderColor = "var(--fm-brass)"; }} onMouseLeave={e => { e.currentTarget.style.color = "var(--fm-ink-dim)"; e.currentTarget.style.borderColor = "var(--fm-ink-dim)"; }}>+ Upload Receipt</span>
                      </label>
                    );
                  }
                  if (field.type === "list" && field.options?.length > 0) return (
                    <select value={val} onChange={e => onChange(e.target.value)} style={{ ...fieldStyle, appearance: "none", backgroundImage: svgArrow, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", cursor: "pointer", paddingRight: "1.5rem" }} onFocus={e => e.currentTarget.style.borderColor = "var(--fm-brass)"} onBlur={e => e.currentTarget.style.borderColor = "var(--fm-ink-dim)"}>
                      <option value="">—</option>
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  );
                  return (
                    <input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={val} onChange={e => onChange(e.target.value)} placeholder="—" style={fieldStyle} onFocus={e => e.currentTarget.style.borderColor = "var(--fm-brass)"} onBlur={e => e.currentTarget.style.borderColor = "var(--fm-ink-dim)"} />
                  );
                }

                const universalAvail = UNIVERSAL_FIELDS.filter(f => !addedIds.has(f.id));
                const itemLibAvail   = (ITEM_FIELDS[selectedItem.item] || []).filter(f => !addedIds.has(f.id));

                return (
                  <>
                    {itmFields.length === 0 && !showFieldPicker && (
                      <div style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", marginBottom: "0.5rem", paddingTop: "0.25rem" }}>No fields yet</div>
                    )}
                    {itmFields.map(field => (
                      <div key={field.id} style={{ marginBottom: "0.45rem" }}>
                        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                          <span style={labelStyle}>{field.name}</span>
                          <button onClick={() => handleDeleteItemField(selectedItem.category, selectedItem.item, field.id)} style={{ background: "none", border: "none", color: "var(--fm-ink-dim)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.85rem", lineHeight: 1, padding: "0 0.1rem", transition: "color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--fm-red)"} onMouseLeave={e => e.currentTarget.style.color = "var(--fm-ink-dim)"}>×</button>
                        </div>
                        {renderFieldInput(field)}
                      </div>
                    ))}

                    {showFieldPicker && (
                      <div style={{ background: "var(--fm-bg)", border: "1px solid var(--fm-hairline)", borderRadius: "4px", marginBottom: "0.5rem", marginTop: itmFields.length > 0 ? "0.5rem" : 0, padding: "0.6rem 0.75rem" }}>
                        {universalAvail.length > 0 && (
                          <>
                            <div style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.58rem", letterSpacing: "0.12em", marginBottom: "0.4rem", textTransform: "uppercase" }}>Common</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.6rem" }}>
                              {universalAvail.map(f => (
                                <button key={f.id} onClick={() => handleAddItemField(selectedItem.category, selectedItem.item, f)} style={chipBtn} onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--fm-brass)"; e.currentTarget.style.color = "var(--fm-brass)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--fm-hairline)"; e.currentTarget.style.color = "var(--fm-ink-dim)"; }}>{f.name}</button>
                              ))}
                            </div>
                          </>
                        )}
                        {itemLibAvail.length > 0 && (
                          <>
                            <div style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.58rem", letterSpacing: "0.12em", marginBottom: "0.4rem", textTransform: "uppercase" }}>For {selectedItem.item}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.6rem" }}>
                              {itemLibAvail.map(f => (
                                <button key={f.id} onClick={() => handleAddItemField(selectedItem.category, selectedItem.item, f)} style={chipBtn} onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--fm-brass)"; e.currentTarget.style.color = "var(--fm-brass)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--fm-hairline)"; e.currentTarget.style.color = "var(--fm-ink-dim)"; }}>{f.name}</button>
                              ))}
                            </div>
                          </>
                        )}
                        {universalAvail.length === 0 && itemLibAvail.length === 0 && (
                          <div style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.65rem", marginBottom: "0.5rem" }}>All library fields added</div>
                        )}
                        <div style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.58rem", letterSpacing: "0.12em", marginBottom: "0.4rem", textTransform: "uppercase" }}>Custom</div>
                        <div style={{ display: "flex", gap: "0.5rem", marginBottom: newField.type === "list" ? "0.4rem" : "0.5rem" }}>
                          <input autoFocus placeholder="Field name" value={newField.name} onChange={e => setNewField(f => ({ ...f, name: e.target.value }))} style={{ ...fieldStyle, flex: 1 }} onFocus={e => e.currentTarget.style.borderColor = "var(--fm-brass)"} onBlur={e => e.currentTarget.style.borderColor = "var(--fm-ink-dim)"} onKeyDown={e => { if (e.key === "Escape") { setShowFieldPicker(false); setNewField({ name: "", type: "text", options: "" }); } }} />
                          <select value={newField.type} onChange={e => setNewField(f => ({ ...f, type: e.target.value }))} style={{ ...fieldStyle, appearance: "none", backgroundImage: svgArrow, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.4rem center", cursor: "pointer", flex: "0 0 76px", paddingRight: "1.25rem" }} onFocus={e => e.currentTarget.style.borderColor = "var(--fm-brass)"} onBlur={e => e.currentTarget.style.borderColor = "var(--fm-ink-dim)"}>
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="list">List</option>
                          </select>
                        </div>
                        {newField.type === "list" && (
                          <input placeholder="Options, comma-separated" value={newField.options} onChange={e => setNewField(f => ({ ...f, options: e.target.value }))} style={{ ...fieldStyle, marginBottom: "0.5rem" }} onFocus={e => e.currentTarget.style.borderColor = "var(--fm-brass)"} onBlur={e => e.currentTarget.style.borderColor = "var(--fm-ink-dim)"} />
                        )}
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between" }}>
                          <button onClick={() => { setShowFieldPicker(false); setNewField({ name: "", type: "text", options: "" }); }} style={{ background: "transparent", border: "none", color: "var(--fm-ink-dim)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.65rem", padding: "0.25rem 0" }}>Close</button>
                          <button onClick={() => { if (!newField.name.trim()) return; handleAddItemField(selectedItem.category, selectedItem.item, { id: crypto.randomUUID(), name: newField.name.trim(), type: newField.type, options: newField.type === "list" ? newField.options.split(",").map(s => s.trim()).filter(Boolean) : [] }); setNewField({ name: "", type: "text", options: "" }); }} disabled={!newField.name.trim()} style={{ background: newField.name.trim() ? "var(--fm-brass)18" : "transparent", border: `1px solid ${newField.name.trim() ? "var(--fm-brass)40" : "var(--fm-ink-dim)"}`, borderRadius: "3px", color: newField.name.trim() ? "var(--fm-brass)" : "var(--fm-ink-dim)", cursor: newField.name.trim() ? "pointer" : "default", fontFamily: "var(--fm-mono)", fontSize: "0.65rem", padding: "0.25rem 0.65rem" }}>+ Add custom</button>
                        </div>
                      </div>
                    )}

                    {!showFieldPicker && (
                      <button onClick={() => setShowFieldPicker(true)} style={{ background: "none", border: "none", color: "var(--fm-ink-dim)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.7rem", letterSpacing: "0.05em", marginTop: itmFields.length > 0 ? "0.4rem" : 0, padding: "0.2rem 0", transition: "color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--fm-brass)"} onMouseLeave={e => e.currentTarget.style.color = "var(--fm-ink-dim)"}>+ Add Field</button>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          </div>

          <div style={{ background: "var(--fm-bg-raised)", border: "1px solid var(--fm-hairline)", borderRadius: "8px" }}>
            {/* ─── Maintenance section ──────────────────────────────────────── */}
            <div style={{ alignItems: "center", borderBottom: "1px solid var(--fm-hairline)", display: "flex", justifyContent: "space-between", padding: "0.5rem 1rem 0.4rem" }}>
              <div style={{ color: "var(--fm-brass)", fontFamily: "var(--fm-mono)", fontSize: "0.58rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>Maintenance</div>
              {selectedItem && (() => {
                const cov = itemCoverageMap[`${selectedItem.category}|${selectedItem.item}`];
                if (cov && cov.unscheduled > 0) return (
                  <span style={{ color: "#5a4a2e", fontFamily: "var(--fm-mono)", fontSize: "0.58rem" }}>{cov.unscheduled} not scheduled</span>
                );
                return null;
              })()}
            </div>
            {!selectedItem ? (
              <div style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", padding: "1.5rem 1rem", textAlign: "center" }}>Select an item to view maintenance</div>
            ) : (
            <>
              {itemTasks.length === 0 ? (
                <div style={{
                  color: "var(--fm-ink-dim)",
                  fontFamily: "var(--fm-mono)",
                  fontSize: "0.72rem",
                  padding: "2rem 1rem 0.5rem",
                  textAlign: "center",
                }}>
                  No tasks for this item
                </div>
              ) : (
                <div>
                  {itemTasks.map((row, idx) => (
                    <div
                      key={row._id || `${row.task}-${idx}`}
                      style={{
                        alignItems: "flex-start",
                        background: idx % 2 === 0 ? "var(--fm-bg-raised)" : "#161920",
                        borderBottom: idx < itemTasks.length - 1 ? "1px solid var(--fm-hairline)" : "none",
                        display: "flex",
                        gap: "0.5rem",
                        padding: "0.65rem 1rem",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          color: "var(--fm-ink)",
                          fontFamily: "var(--fm-mono)",
                          fontSize: "0.78rem",
                          marginBottom: "0.2rem",
                        }}>
                          {row.task}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                          {row.schedule && (
                            <span style={{ color: "var(--fm-brass-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.65rem" }}>
                              {row.schedule}
                            </span>
                          )}
                          {row.season && (
                            <span style={{ color: "var(--fm-brass-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.65rem" }}>
                              {row.season}
                            </span>
                          )}
                          {!row.schedule && !nextDatesMap[`${row.category}|${row.item}|${row.task}`] && (
                            <span style={{ background: "#16141c", border: "1px solid #2a2535", borderRadius: "3px", color: "#4a4458", fontFamily: "var(--fm-mono)", fontSize: "0.58rem", letterSpacing: "0.04em", padding: "0.1rem 0.35rem" }}>
                              no schedule
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                          onClick={() => {
                            const key = `${row.category}|${row.item}|${row.task}`;
                            const dates = JSON.parse(localStorage.getItem("maintenance-dates") || "{}");
                            const nextDates = JSON.parse(localStorage.getItem("maintenance-next-dates") || "{}");
                            const notes = JSON.parse(localStorage.getItem("maintenance-notes") || "{}");
                            const follow = JSON.parse(localStorage.getItem("maintenance-follow") || "{}");
                            const d = dates[key];
                            setNewTask({ task: row.task, schedule: row.schedule || "", season: row.season || null, lastCompleted: d ? new Date(d).toISOString().slice(0, 10) : null, nextDate: nextDates[key] ? new Date(nextDates[key]).toISOString().slice(0, 10) : null, notes: notes[key] || "", followSchedule: !!follow[key] });
                            setEditingTask(row);
                            setAddingTask(true);
                          }}
                          title="Edit task"
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--fm-ink-dim)",
                            cursor: "pointer",
                            flexShrink: 0,
                            fontFamily: "var(--fm-mono)",
                            fontSize: "0.68rem",
                            padding: "0.1rem 0.3rem",
                            transition: "color 0.15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = "var(--fm-brass)"}
                          onMouseLeave={e => e.currentTarget.style.color = "var(--fm-ink-dim)"}
                        >✎</button>
                      <button
                          onClick={() => setDeleteTaskPrompt(row)}
                          title="Delete task"
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--fm-ink-dim)",
                            cursor: "pointer",
                            flexShrink: 0,
                            fontFamily: "var(--fm-mono)",
                            fontSize: "0.72rem",
                            padding: "0.1rem 0.3rem",
                            transition: "color 0.15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = "var(--fm-red)"}
                          onMouseLeave={e => e.currentTarget.style.color = "var(--fm-ink-dim)"}
                        >×</button>
                    </div>
                  ))}
                </div>
              )}
              {/* Groq suggested tasks */}
              {fetchingTasks && suggestedFor?.category === selectedItem?.category && suggestedFor?.item === selectedItem?.item && (
                <div style={{ borderTop: "1px solid var(--fm-hairline)", padding: "1.25rem 1rem", textAlign: "center" }}>
                  <span style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Fetching tasks…</span>
                </div>
              )}
              {fetchError && suggestedFor?.category === selectedItem?.category && suggestedFor?.item === selectedItem?.item && (
                <div style={{ borderTop: "1px solid var(--fm-hairline)", padding: "0.75rem 1rem" }}>
                  <span style={{ color: "var(--fm-red)", fontFamily: "var(--fm-mono)", fontSize: "0.68rem" }}>{fetchError}</span>
                </div>
              )}
              {suggestedTasks && suggestedFor?.category === selectedItem?.category && suggestedFor?.item === selectedItem?.item && (
                <div style={{ borderTop: "1px solid var(--fm-hairline)" }}>
                  <div style={{ alignItems: "center", borderBottom: "1px solid var(--fm-hairline)", display: "flex", justifyContent: "space-between", padding: "0.5rem 1rem 0.4rem" }}>
                    <span style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Suggested by AI
                    </span>
                    <button
                      onClick={() => { setSuggestedTasks(null); setSuggestedFor(null); setFetchError(null); }}
                      style={{ background: "none", border: "none", color: "var(--fm-ink-dim)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", padding: "0.1rem 0.3rem", transition: "color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--fm-red)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--fm-ink-dim)"}
                    >×</button>
                  </div>
                  {suggestedTasks.map((t, idx) => (
                    <label
                      key={idx}
                      style={{ alignItems: "flex-start", background: idx % 2 === 0 ? "var(--fm-bg-raised)" : "#161920", borderBottom: "1px solid var(--fm-hairline)", cursor: "pointer", display: "flex", gap: "0.6rem", padding: "0.55rem 1rem" }}
                    >
                      <input
                        type="checkbox"
                        checked={t.selected}
                        onChange={() => setSuggestedTasks(prev => prev.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s))}
                        style={{ accentColor: "var(--fm-brass)", cursor: "pointer", flexShrink: 0, marginTop: "0.15rem" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: t.selected ? "var(--fm-ink)" : "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.75rem", transition: "color 0.15s" }}>
                          {t.task}
                        </div>
                        {t.schedule && (
                          <div style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.63rem", marginTop: "0.1rem" }}>
                            {t.schedule}{t.season ? ` · ${t.season}` : ""}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                  <div style={{ padding: "0.6rem 1rem" }}>
                    <button
                      onClick={handleAddSuggestedTasks}
                      disabled={!suggestedTasks.some(t => t.selected)}
                      style={{
                        background: suggestedTasks.some(t => t.selected) ? "var(--fm-brass)18" : "transparent",
                        border: `1px solid ${suggestedTasks.some(t => t.selected) ? "var(--fm-brass)40" : "var(--fm-ink-dim)"}`,
                        borderRadius: "3px",
                        color: suggestedTasks.some(t => t.selected) ? "var(--fm-brass)" : "var(--fm-ink-dim)",
                        cursor: suggestedTasks.some(t => t.selected) ? "pointer" : "default",
                        fontFamily: "var(--fm-mono)",
                        fontSize: "0.68rem",
                        letterSpacing: "0.06em",
                        padding: "0.35rem 0.75rem",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { if (suggestedTasks.some(t => t.selected)) { e.currentTarget.style.background = "var(--fm-brass)30"; e.currentTarget.style.borderColor = "var(--fm-brass)"; } }}
                      onMouseLeave={e => { if (suggestedTasks.some(t => t.selected)) { e.currentTarget.style.background = "var(--fm-brass)18"; e.currentTarget.style.borderColor = "var(--fm-brass)40"; } }}
                    >
                      Add {suggestedTasks.filter(t => t.selected).length} to Schedule
                    </button>
                  </div>
                </div>
              )}

              <div style={{ alignItems: "center", borderTop: itemTasks.length > 0 || suggestedTasks ? "1px solid var(--fm-hairline)" : "none", display: "flex", padding: "0.5rem 1rem" }}>
                <button
                  onClick={() => setAddTaskModalOpen(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--fm-ink-dim)",
                    cursor: "pointer",
                    fontFamily: "var(--fm-mono)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                    padding: "0.2rem 0",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--fm-brass)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--fm-ink-dim)"}
                >+ Add Task</button>
                {(() => {
                  const cfKey = `${selectedItem.category}|${selectedItem.item}`;
                  const cfVals = customFieldValues[cfKey] || {};
                  const det = itemDetails[cfKey] || {};
                  const manufacturer = cfVals.manufacturer || det.manufacturer || "";
                  const model = cfVals.model || det.model || "";
                  return manufacturer && manufacturer !== "Other" ? (
                    <button
                      onClick={() => handleFetchTasks(manufacturer, model, selectedItem.item, selectedItem.category)}
                      style={{ background: "none", border: "none", color: "var(--fm-ink-dim)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.7rem", letterSpacing: "0.05em", marginLeft: "auto", padding: "0.2rem 0", transition: "color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--fm-brass)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--fm-ink-dim)"}
                    >
                      {fetchingTasks && suggestedFor?.category === selectedItem?.category && suggestedFor?.item === selectedItem?.item ? "Fetching…" : "Fetch Tasks →"}
                    </button>
                  ) : null;
                })()}
              </div>
            </>
          )}
          </div>

          <div style={{ background: "var(--fm-bg-raised)", border: "1px solid var(--fm-hairline)", borderRadius: "8px" }}>
            <div style={{ borderBottom: "1px solid var(--fm-hairline)", padding: "0.75rem 1rem 0.6rem" }}>
              <div style={{ color: "var(--fm-brass)", fontFamily: "var(--fm-mono)", fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Projects
              </div>
            </div>

            {!selectedItem ? (
              <div style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", padding: "1.5rem 1rem", textAlign: "center" }}>
                Select an item to view projects
              </div>
            ) : (
              <>
                {selectedProjects.length === 0 && !addingProject && (
                  <div style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", padding: "1.25rem 1rem 0.5rem", textAlign: "center" }}>
                    No projects
                  </div>
                )}
                {selectedProjects.map((proj, idx) => {
                  const isHovered = hoveredProjectId === proj.id;
                  return (
                    <div
                      key={proj.id}
                      onMouseEnter={() => setHoveredProjectId(proj.id)}
                      onMouseLeave={() => setHoveredProjectId(null)}
                      style={{
                        alignItems: "center",
                        background: idx % 2 === 0 ? "var(--fm-bg-raised)" : "#161920",
                        borderBottom: "1px solid var(--fm-hairline)",
                        display: "flex",
                        gap: "0.5rem",
                        padding: "0.5rem 0.75rem",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: proj.status === "done" ? "var(--fm-ink-dim)" : "var(--fm-ink)",
                          fontFamily: "var(--fm-mono)",
                          fontSize: "0.75rem",
                          overflow: "hidden",
                          textDecoration: proj.status === "done" ? "line-through" : "none",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {proj.name}
                        </div>
                        {proj.dueDate && (
                          <div style={{ color: proj.status !== "done" && new Date(proj.dueDate) < new Date() ? "var(--fm-red)" : "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.62rem" }}>
                            {new Date(proj.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        )}
                      </div>
                      <span style={{
                        background: proj.status === "done" ? "#4ade8018" : proj.status === "in-progress" ? "var(--fm-brass)18" : "var(--fm-ink-dim)",
                        border: `1px solid ${proj.status === "done" ? "#4ade8040" : proj.status === "in-progress" ? "var(--fm-brass)40" : "var(--fm-ink-dim)"}`,
                        borderRadius: "2px",
                        color: proj.status === "done" ? "var(--fm-green)" : proj.status === "in-progress" ? "var(--fm-brass)" : "var(--fm-ink-dim)",
                        flexShrink: 0,
                        fontFamily: "var(--fm-mono)",
                        fontSize: "0.58rem",
                        letterSpacing: "0.06em",
                        padding: "0.1rem 0.35rem",
                        textTransform: "uppercase",
                      }}>
                        {proj.status === "not-started" ? "To Do" : proj.status === "in-progress" ? "In Progress" : "Done"}
                      </span>
                      <button
                        onClick={() => setDeleteProjectPrompt(proj)}
                        style={{ background: "none", border: "none", color: "var(--fm-ink-dim)", cursor: "pointer", flexShrink: 0, fontFamily: "var(--fm-mono)", fontSize: "0.85rem", lineHeight: 1, opacity: isHovered ? 1 : 0, padding: "0 0.1rem", transition: "color 0.15s, opacity 0.1s" }}
                        onMouseEnter={e => { e.currentTarget.style.color = "var(--fm-red)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "var(--fm-ink-dim)"; }}
                      >×</button>
                    </div>
                  );
                })}

                {addingProject ? (
                  <div style={{ padding: "0.5rem 0.75rem" }}>
                    <input
                      autoFocus
                      value={newProjectName}
                      onChange={e => setNewProjectName(e.target.value)}
                      placeholder="Project name..."
                      onKeyDown={e => {
                        if (e.key === "Enter") { e.preventDefault(); handleAddProject(); }
                        if (e.key === "Escape") { e.preventDefault(); setAddingProject(false); setNewProjectName(""); }
                      }}
                      onBlur={handleAddProject}
                      style={{
                        background: "var(--fm-bg-raised)",
                        border: "1px solid var(--fm-hairline2)",
                        borderRadius: "3px",
                        boxSizing: "border-box",
                        color: "var(--fm-ink)",
                        fontFamily: "var(--fm-mono)",
                        fontSize: "0.75rem",
                        outline: "none",
                        padding: "0.3rem 0.5rem",
                        width: "100%",
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ padding: "0.5rem 0.75rem" }}>
                    <button
                      onClick={() => setAddingProject(true)}
                      style={{ background: "none", border: "none", color: "var(--fm-ink-dim)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.7rem", letterSpacing: "0.05em", padding: "0.2rem 0", transition: "color 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "var(--fm-brass)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "var(--fm-ink-dim)"; }}
                    >
                      + Add Project
                    </button>
                  </div>
                )}

                <div style={{ borderTop: "1px solid var(--fm-hairline)", padding: "0.4rem 0.75rem", textAlign: "right" }}>
                  <button
                    onClick={() => navigate("projects")}
                    style={{ background: "none", border: "none", color: "var(--fm-ink-dim)", cursor: "pointer", fontFamily: "var(--fm-mono)", fontSize: "0.62rem", letterSpacing: "0.08em", padding: "0.1rem 0", transition: "color 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--fm-brass)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--fm-ink-dim)"; }}
                  >
                    View all on Projects →
                  </button>
                </div>
              </>
            )}
          </div>

          <div style={{ background: "var(--fm-bg-raised)", border: "1px solid var(--fm-hairline)", borderRadius: "8px" }}>
            <div style={{ borderBottom: "1px solid var(--fm-hairline)", padding: "0.75rem 1rem 0.6rem" }}>
              <div style={{
                color: "var(--fm-brass)",
                fontFamily: "var(--fm-mono)",
                fontSize: "0.62rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}>
                To Dos
              </div>
            </div>

            {!selectedItem ? (
              <div style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", padding: "1.5rem 1rem", textAlign: "center" }}>
                Select an item to view to dos
              </div>
            ) : (
              <>
                {selectedTodos.length === 0 && !addingTodo && (
                  <div style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.72rem", padding: "1.25rem 1rem 0.5rem", textAlign: "center" }}>
                    No to dos
                  </div>
                )}
                {selectedTodos.map((todo, idx) => {
                  const isOverdue = todo.dueDate && todo.status !== "done" && new Date(todo.dueDate) < new Date();
                  const isHovered = hoveredTodoId === todo.id;
                  return (
                    <div
                      key={todo.id}
                      onMouseEnter={() => setHoveredTodoId(todo.id)}
                      onMouseLeave={() => setHoveredTodoId(null)}
                      style={{
                        alignItems: "center",
                        background: idx % 2 === 0 ? "var(--fm-bg-raised)" : "#161920",
                        borderBottom: "1px solid var(--fm-hairline)",
                        borderLeft: `3px solid ${PRIORITY_COLORS[todo.priority] || "var(--fm-brass)"}`,
                        display: "flex",
                        gap: "0.5rem",
                        padding: "0.5rem 0.75rem",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: todo.status === "done" ? "var(--fm-ink-dim)" : "var(--fm-ink)",
                          fontFamily: "var(--fm-mono)",
                          fontSize: "0.75rem",
                          overflow: "hidden",
                          textDecoration: todo.status === "done" ? "line-through" : "none",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {todo.title}
                        </div>
                        {todo.dueDate && (
                          <div style={{ color: isOverdue ? "var(--fm-red)" : "var(--fm-ink-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.62rem" }}>
                            {new Date(todo.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        )}
                      </div>
                      <span style={{
                        background: todo.status === "done" ? "#4ade8018" : todo.status === "in-progress" ? "var(--fm-brass)18" : "var(--fm-ink-dim)",
                        border: `1px solid ${todo.status === "done" ? "#4ade8040" : todo.status === "in-progress" ? "var(--fm-brass)40" : "var(--fm-ink-dim)"}`,
                        borderRadius: "2px",
                        color: todo.status === "done" ? "var(--fm-green)" : todo.status === "in-progress" ? "var(--fm-brass)" : "var(--fm-ink-dim)",
                        flexShrink: 0,
                        fontFamily: "var(--fm-mono)",
                        fontSize: "0.58rem",
                        letterSpacing: "0.06em",
                        padding: "0.1rem 0.35rem",
                        textTransform: "uppercase",
                      }}>
                        {todo.status === "not-started" ? "To Do" : todo.status === "in-progress" ? "In Progress" : "Done"}
                      </span>
                      <button
                        onClick={() => setDeleteTodoPrompt(todo)}
                        style={{ background: "none", border: "none", color: "var(--fm-ink-dim)", cursor: "pointer", flexShrink: 0, fontFamily: "var(--fm-mono)", fontSize: "0.85rem", lineHeight: 1, opacity: isHovered ? 1 : 0, padding: "0 0.1rem", transition: "color 0.15s, opacity 0.1s" }}
                        onMouseEnter={e => { e.currentTarget.style.color = "var(--fm-red)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "var(--fm-ink-dim)"; }}
                      >×</button>
                    </div>
                  );
                })}

                {addingTodo ? (
                  <div style={{ padding: "0.5rem 0.75rem" }}>
                    <input
                      autoFocus
                      value={newTodoTitle}
                      onChange={e => setNewTodoTitle(e.target.value)}
                      placeholder="To do title..."
                      onKeyDown={e => {
                        if (e.key === "Enter") { e.preventDefault(); handleAddTodo(); }
                        if (e.key === "Escape") { e.preventDefault(); setAddingTodo(false); setNewTodoTitle(""); }
                      }}
                      onBlur={handleAddTodo}
                      style={{
                        background: "var(--fm-bg-raised)",
                        border: "1px solid var(--fm-hairline2)",
                        borderRadius: "3px",
                        boxSizing: "border-box",
                        color: "var(--fm-ink)",
                        fontFamily: "var(--fm-mono)",
                        fontSize: "0.75rem",
                        outline: "none",
                        padding: "0.3rem 0.5rem",
                        width: "100%",
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ padding: "0.5rem 0.75rem" }}>
                    <button
                      onClick={() => setAddingTodo(true)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--fm-ink-dim)",
                        cursor: "pointer",
                        fontFamily: "var(--fm-mono)",
                        fontSize: "0.7rem",
                        letterSpacing: "0.05em",
                        padding: "0.2rem 0",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = "var(--fm-brass)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "var(--fm-ink-dim)"; }}
                    >
                      + Add To Do
                    </button>
                  </div>
                )}

                <div style={{ borderTop: "1px solid var(--fm-hairline)", padding: "0.4rem 0.75rem", textAlign: "right" }}>
                  <button
                    onClick={() => navigate("board")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--fm-ink-dim)",
                      cursor: "pointer",
                      fontFamily: "var(--fm-mono)",
                      fontSize: "0.62rem",
                      letterSpacing: "0.08em",
                      padding: "0.1rem 0",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--fm-brass)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--fm-ink-dim)"; }}
                  >
                    View all on To Dos →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
