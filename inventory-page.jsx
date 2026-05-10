import { useState, useMemo, useEffect, useRef, Fragment, forwardRef } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import PageNav from "./components/PageNav.jsx";
import Tooltip from "./components/Tooltip.jsx";
import { loadTodos, saveTodos, createTodo } from "./lib/todos.js";
import { CATEGORY_TIPS, ITEM_TIPS } from "./lib/tooltips.js";
import {
  loadData, defaultData,
  loadCustomData, saveCustomData,
  loadOverrides, saveOverrides,
} from "./lib/data.js";
import { loadDeletedCategories, saveDeletedCategories } from "./lib/deletedCategories.js";
import { loadDeletedItems, saveDeletedItems } from "./lib/deletedItems.js";
import { loadDeletedRows, saveDeletedRows } from "./lib/deletedRows.js";
import { loadItemDetails, saveItemDetails } from "./lib/itemDetails.js";
import {
  loadCategoryTypeOverrides,
  saveCategoryTypeOverrides,
  GROUP_ORDER,
  GROUP_LABELS,
} from "./lib/categoryTypes.js";
import { getManufacturers } from "./lib/manufacturers.js";
import { getModels } from "./lib/models.js";
import { SEASON_OPTIONS } from "./lib/scheduleOptions.js";
import FollowButton from "./components/FollowButton.jsx";
import SchedulePicker from "./components/SchedulePicker.jsx";

const PRIORITY_COLORS = {
  low:    "#4ade80",
  medium: "#c9a96e",
  high:   "#f59e0b",
  urgent: "#f87171",
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

function addBtnStyle(hovered) {
  return {
    background: "transparent",
    border: "none",
    color: hovered ? "#c9a96e" : "#8b7d6b",
    cursor: "pointer",
    fontFamily: "monospace",
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
      background: "#13161f",
      border: "1px solid #6b6560",
      borderRadius: "3px",
      boxSizing: "border-box",
      color: value ? "#e8e4dd" : "#a8a29c",
      cursor: "pointer",
      fontFamily: "monospace",
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
        background: "#1a1f2e",
        border: "1px solid #6b6560",
        borderRadius: "2px",
        boxSizing: "border-box",
        color: "#e8e0d0",
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
          background: "#1a1f2e",
          border: "1px solid #6b6560",
          borderRadius: "2px",
          boxSizing: "border-box",
          color: "#e8e0d0",
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
            background: "#1a1f2e",
            border: "1px solid #6b6560",
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
                color: "#c9a96e",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: "0.78rem",
                padding: "0.3rem 0.4rem",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#6b6560"; }}
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

export default function InventoryPage({ navigate }) {
  const [rows, setRows] = useState(() => loadData());
  const [deletedCategories, setDeletedCategories] = useState(() => loadDeletedCategories());
  const [deletedItems, setDeletedItems] = useState(() => loadDeletedItems());
  const [deletePrompt, setDeletePrompt] = useState(null); // { category, itemCount, taskCount, isDefault } | { category, item, taskCount, isDefault }
  const [newItemIds, setNewItemIds] = useState(() => new Set());
  const [editingCategoryName, setEditingCategoryName] = useState(null);
  const [pendingNewCategory, setPendingNewCategory] = useState(null); // { id, groupType }

  const CATEGORY_ITEMS = useMemo(() => {
    const map = {};
    rows.forEach(row => {
      if (deletedCategories.has(row.category)) return;
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
      if (row.category && row.categoryType && !map[row.category]) {
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
  const [navHovered, setNavHovered] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOverGroup, setDragOverGroup] = useState(null);
  const [draggingItem, setDraggingItem] = useState(null); // { item, fromCategory }
  const [dragOverCategory, setDragOverCategory] = useState(null);
  const [expandedItems, setExpandedItems] = useState(() => new Set());
  const [duplicateItemPopup, setDuplicateItemPopup] = useState(null); // { item, fromCategory, x, y }
  const [itemDetails, setItemDetails] = useState(() => loadItemDetails());
  const [selectedItem, setSelectedItem] = useState(null); // { category, item }
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [todos, setTodos] = useState(() => loadTodos());
  const [addingTodo, setAddingTodo] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ task: "", schedule: "", season: null, lastCompleted: null, nextDate: null, followSchedule: false, notes: "" });
  const [deleteTaskPrompt, setDeleteTaskPrompt] = useState(null);
  const [deletedRows, setDeletedRows] = useState(() => loadDeletedRows());
  const [suggestedTasks, setSuggestedTasks] = useState(null); // null | Array<{task,schedule,season,selected}>
  const [suggestedFor, setSuggestedFor] = useState(null); // { category, item }
  const [fetchingTasks, setFetchingTasks] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const itemTasks = useMemo(() => {
    if (!selectedItem) return [];
    return rows.filter(r =>
      r.category === selectedItem.category &&
      r.item === selectedItem.item &&
      !r._isBlankCategory &&
      r.task &&
      !deletedRows.has(`${r.category}|${r.item}|${r.task}`)
    );
  }, [rows, selectedItem, deletedRows]);

  const selectedTodos = useMemo(() => {
    if (!selectedItem) return [];
    return todos.filter(t =>
      t.linkedCategory === selectedItem.category &&
      (t.linkedItem === selectedItem.item || t.linkedItem === null)
    );
  }, [todos, selectedItem]);

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

  function reload() {
    setRows(loadData());
  }

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

  const allCollapsed = CATEGORIES.every(cat => collapsed[cat]) && GROUP_ORDER.every(g => collapsedGroups[g]);

  function toggleAll() {
    const next = allCollapsed ? false : true;
    setCollapsed(Object.fromEntries(CATEGORIES.map(cat => [cat, next])));
    setCollapsedGroups(Object.fromEntries(GROUP_ORDER.map(g => [g, next])));
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

  function toggleItemExpand(itemKey) {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(itemKey) ? next.delete(itemKey) : next.add(itemKey);
      return next;
    });
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
      } else {
        const customs = loadCustomData();
        saveCustomData(customs.filter(r => r.category !== category));
        reload();
      }
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
    const itemSuggestions = [...new Set(
      rows
        .filter(r => r.item && !r._isBlankCategory && !deletedCategories.has(r.category) && !deletedItems.has(`${r.category}|${r.item}`))
        .map(r => r.item)
    )].filter(i => !existingItemSet.has(i)).sort();
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
          background: isItemDropTarget ? "#1a2035" : "#13161f",
          border: `1px solid ${isItemDropTarget ? "#c9a96e50" : "#1e2330"}`,
          borderRadius: isCollapsed ? "6px" : "6px 6px 0 0",
          cursor: isEditing ? "default" : "grab",
          display: "flex",
          gap: "0.75rem",
          padding: "0.8rem 1rem",
          transition: "background 0.15s, border-color 0.15s",
          userSelect: "none",
        }}>
          <span style={{ color: "#6b6560", flexShrink: 0, fontSize: "0.7rem", lineHeight: 1 }}>⠿</span>
          <button
            onClick={e => { e.stopPropagation(); toggleCollapse(category); }}
            style={{
              background: "none",
              border: "none",
              color: "#a8a29c",
              cursor: "pointer",
              fontFamily: "monospace",
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
                style={{ color: "#e8e4dd", cursor: "text", flex: 1, fontSize: "0.95rem" }}
              >
                {category}
              </span>
            </Tooltip>
          )}

          {!isEditing && (
            <>
              <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.68rem" }}>
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
              <button
                onClick={e => { e.stopPropagation(); handleDuplicateCategory(category); }}
                title="Duplicate category"
                style={{
                  background: "none",
                  border: "none",
                  color: "#a8a29c",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  padding: "0.1rem 0.3rem",
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#c9a96e"}
                onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
              >
                ⎘
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleDeleteClick(category); }}
                title="Delete category"
                style={{
                  background: "none",
                  border: "none",
                  color: "#a8a29c",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: "0.72rem",
                  padding: "0.1rem 0.3rem",
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
              >
                ×
              </button>
            </>
          )}
        </div>

        {!isCollapsed && (
          <div style={{ border: "1px solid #1e2330", borderTop: "none", borderRadius: "0 0 6px 6px", overflow: "hidden" }}>
            {items.map((item, idx) => {
              const isLast = idx === items.length - 1 && pendingItems.length === 0;
              const isItemDragging = draggingItem?.item === item && draggingItem?.fromCategory === category;
              const itemKey = `${category}|${item}`;
              const isSelected = selectedItem?.category === category && selectedItem?.item === item;
              const isExpanded = expandedItems.has(itemKey);
              const details = itemDetails[itemKey] || {};
              const rowBg = idx % 2 === 0 ? "#13161f" : "#161920";
              return (
                <Fragment key={item}>
                  <div
                    draggable
                    onDragStart={e => { e.stopPropagation(); setDraggingItem({ item, fromCategory: category }); }}
                    onDragEnd={e => { e.stopPropagation(); setDraggingItem(null); setDragOverCategory(null); }}
                    style={{
                      alignItems: "center",
                      background: isSelected ? "#1a2035" : rowBg,
                      borderBottom: "1px solid #1e2330",
                      borderLeft: isSelected ? "2px solid #c9a96e" : "2px solid transparent",
                      cursor: "grab",
                      display: "flex",
                      gap: "1rem",
                      opacity: isItemDragging ? 0.4 : 1,
                      padding: "0.5rem 1rem 0.5rem 1.75rem",
                      transition: "opacity 0.15s, background 0.1s",
                    }}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); toggleItemExpand(itemKey); }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#a8a29c",
                        cursor: "pointer",
                        flexShrink: 0,
                        fontFamily: "monospace",
                        fontSize: "0.6rem",
                        padding: 0,
                        width: 12,
                      }}
                    >
                      {isExpanded ? "▼" : "▶"}
                    </button>
                    <Tooltip text={ITEM_TIPS[item]}>
                      <span
                        onClick={e => { e.stopPropagation(); setSelectedItem({ category, item }); }}
                        style={{
                          color: isSelected ? "#c9a96e" : "#a89e8e",
                          cursor: "pointer",
                          flex: 1,
                          fontFamily: "monospace",
                          fontSize: "0.78rem",
                        }}
                      >
                        {item}
                      </span>
                    </Tooltip>
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
                        color: "#a8a29c",
                        cursor: "pointer",
                        flexShrink: 0,
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        padding: "0.1rem 0.3rem",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "#c9a96e"}
                      onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
                    >
                      ⎘
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleItemDeleteClick(category, item); }}
                      title="Delete item"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#a8a29c",
                        cursor: "pointer",
                        fontFamily: "monospace",
                        fontSize: "0.72rem",
                        flexShrink: 0,
                        padding: "0.1rem 0.3rem",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                      onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
                    >
                      ×
                    </button>
                  </div>
                  {isExpanded && (
                    <div style={{
                      background: rowBg,
                      borderBottom: isLast ? "none" : "1px solid #1e2330",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0",
                      padding: "0.75rem 1.5rem 0.9rem 3rem",
                    }}>
                      <div style={{ display: "flex", gap: "1.25rem" }}>
                        {/* Manufacturer — dropdown when options exist, plain input otherwise */}
                        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "0.3rem", minWidth: 0 }}>
                          <span style={{
                            color: "#a8a29c",
                            fontFamily: "monospace",
                            fontSize: "0.6rem",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                          }}>
                            Manufacturer
                          </span>
                          {(() => {
                            const mfrs = getManufacturers(item);
                            const fieldStyle = {
                              background: "#13161f",
                              border: "1px solid #6b6560",
                              borderRadius: "3px",
                              boxSizing: "border-box",
                              color: "#e8e4dd",
                              fontFamily: "monospace",
                              fontSize: "0.75rem",
                              outline: "none",
                              padding: "0.3rem 0.5rem",
                              width: "100%",
                            };
                            if (mfrs.length > 0) {
                              return (
                                <select
                                  value={details.manufacturer || details.make || ""}
                                  onChange={e => {
                                    const key = `${category}|${item}`;
                                    const next = {
                                      ...itemDetails,
                                      [key]: { ...(itemDetails[key] || {}), manufacturer: e.target.value, model: "" },
                                    };
                                    setItemDetails(next);
                                    saveItemDetails(next);
                                  }}
                                  style={{
                                    ...fieldStyle,
                                    appearance: "none",
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a5460'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: "no-repeat",
                                    backgroundPosition: "right 0.5rem center",
                                    cursor: "pointer",
                                    paddingRight: "1.5rem",
                                  }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "#6b6560"; }}
                                >
                                  <option value="">—</option>
                                  {mfrs.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                  <option value="Other">Other</option>
                                </select>
                              );
                            }
                            return (
                              <input
                                value={details.manufacturer || ""}
                                onChange={e => handleItemDetailChange(category, item, "manufacturer", e.target.value)}
                                placeholder="—"
                                style={fieldStyle}
                                onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
                                onBlur={e => { e.currentTarget.style.borderColor = "#6b6560"; }}
                              />
                            );
                          })()}
                        </div>

                        {/* Model — dropdown when manufacturer+item has a list, locked if no manufacturer selected */}
                        {(() => {
                          const selectedMfr = details.manufacturer || details.make || "";
                          const models = getModels(selectedMfr, item);
                          const fieldStyle = {
                            background: "#13161f",
                            border: "1px solid #6b6560",
                            borderRadius: "3px",
                            boxSizing: "border-box",
                            color: "#e8e4dd",
                            fontFamily: "monospace",
                            fontSize: "0.75rem",
                            outline: "none",
                            padding: "0.3rem 0.5rem",
                            width: "100%",
                          };
                          const noMfr = !selectedMfr;
                          return (
                            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "0.3rem", minWidth: 0 }}>
                              <span style={{
                                color: noMfr ? "#a8a29c" : "#a8a29c",
                                fontFamily: "monospace",
                                fontSize: "0.6rem",
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                              }}>
                                Model
                              </span>
                              {models.length > 0 ? (
                                <select
                                  value={details.model || ""}
                                  onChange={e => handleItemDetailChange(category, item, "model", e.target.value)}
                                  style={{
                                    ...fieldStyle,
                                    appearance: "none",
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a5460'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: "no-repeat",
                                    backgroundPosition: "right 0.5rem center",
                                    cursor: "pointer",
                                    paddingRight: "1.5rem",
                                  }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "#6b6560"; }}
                                >
                                  <option value="">—</option>
                                  {models.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  value={details.model || ""}
                                  onChange={e => handleItemDetailChange(category, item, "model", e.target.value)}
                                  placeholder={noMfr ? "Select manufacturer" : "—"}
                                  disabled={noMfr}
                                  style={{
                                    ...fieldStyle,
                                    color: noMfr ? "#a8a29c" : "#e8e4dd",
                                    cursor: noMfr ? "default" : "text",
                                    opacity: noMfr ? 0.5 : 1,
                                  }}
                                  onFocus={e => { if (!noMfr) e.currentTarget.style.borderColor = "#c9a96e"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "#6b6560"; }}
                                />
                              )}
                            </div>
                          );
                        })()}

                        {/* Serial No. — always plain text */}
                        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "0.3rem", minWidth: 0 }}>
                          <span style={{
                            color: "#a8a29c",
                            fontFamily: "monospace",
                            fontSize: "0.6rem",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                          }}>
                            Serial No.
                          </span>
                          <input
                            value={details.serial || ""}
                            onChange={e => handleItemDetailChange(category, item, "serial", e.target.value)}
                            placeholder="—"
                            style={{
                              background: "#13161f",
                              border: "1px solid #6b6560",
                              borderRadius: "3px",
                              boxSizing: "border-box",
                              color: "#e8e4dd",
                              fontFamily: "monospace",
                              fontSize: "0.75rem",
                              outline: "none",
                              padding: "0.3rem 0.5rem",
                              width: "100%",
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
                            onBlur={e => { e.currentTarget.style.borderColor = "#6b6560"; }}
                          />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "0.3rem", minWidth: 0 }}>
                          <span style={{
                            color: "#a8a29c",
                            fontFamily: "monospace",
                            fontSize: "0.6rem",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                          }}>
                            Purchase Date
                          </span>
                          <DatePicker
                            selected={details.purchaseDate ? new Date(details.purchaseDate) : null}
                            onChange={date => handleItemDetailChange(category, item, "purchaseDate", date ? date.toISOString() : null)}
                            dateFormat="MMM d, yyyy"
                            customInput={<PurchaseDateTrigger />}
                            popperPlacement="bottom-start"
                          />
                        </div>
                      </div>

                      <div style={{
                        alignItems: "center",
                        borderTop: "1px solid #1e2330",
                        display: "flex",
                        gap: "0.85rem",
                        marginTop: "0.65rem",
                        paddingTop: "0.65rem",
                      }}>
                        {details.receipt ? (
                          <div style={{ alignItems: "center", display: "flex", gap: "0.6rem" }}>
                            <img
                              src={details.receipt}
                              alt="Receipt"
                              onClick={() => window.open(details.receipt, "_blank")}
                              style={{
                                border: "1px solid #6b6560",
                                borderRadius: "3px",
                                cursor: "pointer",
                                height: 48,
                                objectFit: "cover",
                                width: 72,
                              }}
                            />
                            <button
                              onClick={() => handleItemDetailChange(category, item, "receipt", null)}
                              title="Remove receipt"
                              style={{
                                background: "none",
                                border: "none",
                                color: "#a8a29c",
                                cursor: "pointer",
                                fontFamily: "monospace",
                                fontSize: "0.72rem",
                                padding: "0.1rem 0.3rem",
                                transition: "color 0.15s",
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                              onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <label style={{ cursor: "pointer", lineHeight: 1 }}>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={async e => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const dataUrl = await compressImage(file);
                                handleItemDetailChange(category, item, "receipt", dataUrl);
                                e.target.value = "";
                              }}
                            />
                            <span
                              style={{
                                border: "1px dashed #6b6560",
                                borderRadius: "3px",
                                color: "#a8a29c",
                                fontFamily: "monospace",
                                fontSize: "0.7rem",
                                letterSpacing: "0.08em",
                                padding: "0.25rem 0.65rem",
                                transition: "color 0.15s, border-color 0.15s",
                              }}
                              onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; e.currentTarget.style.borderColor = "#c9a96e"; }}
                              onMouseLeave={e => { e.currentTarget.style.color = "#a8a29c"; e.currentTarget.style.borderColor = "#6b6560"; }}
                            >
                              + Upload Receipt
                            </span>
                          </label>
                        )}
                        {details.manufacturer && details.manufacturer !== "Other" && (
                          <button
                            onClick={() => handleFetchTasks(details.manufacturer, details.model || "", item, category)}
                            disabled={fetchingTasks && suggestedFor?.category === category && suggestedFor?.item === item}
                            style={{
                              background: "none",
                              border: "none",
                              color: fetchingTasks && suggestedFor?.category === category && suggestedFor?.item === item ? "#a8a29c" : "#a8a29c",
                              cursor: "pointer",
                              fontFamily: "monospace",
                              fontSize: "0.7rem",
                              letterSpacing: "0.05em",
                              marginLeft: "auto",
                              padding: 0,
                              transition: "color 0.15s",
                            }}
                            onMouseEnter={e => { if (!fetchingTasks) e.currentTarget.style.color = "#c9a96e"; }}
                            onMouseLeave={e => { if (!fetchingTasks) e.currentTarget.style.color = "#a8a29c"; }}
                          >
                            {fetchingTasks && suggestedFor?.category === category && suggestedFor?.item === item
                              ? "Fetching…"
                              : "Fetch Maintenance Tasks →"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
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
                    background: (items.length + idx) % 2 === 0 ? "#13161f" : "#161920",
                    borderBottom: isLast ? "none" : "1px solid #1e2330",
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
              borderTop: items.length > 0 || pendingItems.length > 0 ? "1px solid #1e2330" : "none",
              padding: "0.4rem 1rem 0.4rem 2.75rem",
            }}>
              <button
                onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#8b7d6b"; }}
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
      background: "#0f1117",
      color: "#e8e0d0",
      fontFamily: "'Georgia', 'Times New Roman', serif",
    }}>

      {duplicateItemPopup && createPortal(
        <>
          <div
            onClick={() => setDuplicateItemPopup(null)}
            style={{ bottom: 0, left: 0, position: "fixed", right: 0, top: 0, zIndex: 9998 }}
          />
          <div style={{
            background: "#1a1f2e",
            border: "1px solid #6b6560",
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
              borderBottom: "1px solid #6b6560",
              color: "#a8a29c",
              fontFamily: "monospace",
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
                    color: "#c9a96e",
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontSize: "0.78rem",
                    padding: "0.35rem 0.65rem",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#6b6560"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {cat}
                </div>
              ))
            }
            {CATEGORIES.filter(cat => cat !== duplicateItemPopup.fromCategory && !CATEGORY_ITEMS[cat]?.includes(duplicateItemPopup.item)).length === 0 && (
              <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.75rem", padding: "0.5rem 0.65rem" }}>
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
              background: "#1a1f2e",
              border: "1px solid #6b6560",
              borderRadius: "8px",
              maxWidth: 440,
              padding: "2rem",
              width: "90%",
            }}
          >
            <div style={{ color: "#f0e6d3", fontSize: "1.05rem", marginBottom: "0.75rem" }}>
              {deletePrompt.item
                ? `Delete "${deletePrompt.item}"?`
                : `Delete "${deletePrompt.category}"?`}
            </div>
            <p style={{
              color: "#a89e8e",
              fontFamily: "monospace",
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
                  border: "1px solid #6b6560",
                  borderRadius: "3px",
                  color: "#8b7d6b",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: "0.72rem",
                  letterSpacing: "0.08em",
                  padding: "0.4rem 0.9rem",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#e8e4dd"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#6b6560"; e.currentTarget.style.color = "#8b7d6b"; }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  background: "#f8717118",
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
                onMouseEnter={e => { e.currentTarget.style.background = "#f8717130"; e.currentTarget.style.borderColor = "#f87171"; }}
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
          onClick={() => { setAddingTask(false); setNewTask({ task: "", schedule: "", season: null, lastCompleted: null, nextDate: null, followSchedule: false, notes: "" }); }}
          style={{ alignItems: "center", background: "rgba(0,0,0,0.75)", bottom: 0, display: "flex", justifyContent: "center", left: 0, position: "fixed", right: 0, top: 0, zIndex: 1000 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#0f1117", border: "1px solid #6b6560", borderRadius: "8px", maxWidth: "min(95vw, 1120px)", overflow: "hidden", width: "95vw" }}
          >
            <div style={{ alignItems: "center", borderBottom: "1px solid #1e2330", display: "flex", justifyContent: "space-between", padding: "0.85rem 1.25rem" }}>
              <div>
                <span style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>Add Maintenance Task</span>
                <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.65rem", marginLeft: "0.75rem" }}>{selectedItem.item} — {selectedItem.category}</span>
              </div>
              <button
                onClick={() => { setAddingTask(false); setNewTask({ task: "", schedule: "", season: null, lastCompleted: null, nextDate: null, followSchedule: false, notes: "" }); }}
                style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "1rem", padding: "0.1rem 0.3rem", transition: "color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
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
                      <th key={label} style={{ background: "#1a1f2e", borderBottom: "2px solid #6b6560", color: "#c9a96e", fontFamily: "monospace", fontSize: "0.68rem", fontWeight: "normal", letterSpacing: "0.12em", padding: "0.75rem 0.6rem", textAlign: "left", textTransform: "uppercase", whiteSpace: "nowrap", width }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: "#13161f" }}>
                    <td style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.72rem", padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>{selectedItem.category}</td>
                    <td style={{ color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.75rem", padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>{selectedItem.item}</td>
                    <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                      <input
                        autoFocus
                        value={newTask.task}
                        placeholder="Task name"
                        onChange={e => setNewTask(t => ({ ...t, task: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === "Enter" && newTask.task.trim()) { e.preventDefault(); handleAddTask(); }
                          if (e.key === "Escape") { e.preventDefault(); setAddingTask(false); setNewTask({ task: "", schedule: "", season: null, lastCompleted: null, nextDate: null, followSchedule: false, notes: "" }); }
                        }}
                        style={{ background: "#1a1f2e", border: "1px solid #6b6560", borderRadius: "2px", boxSizing: "border-box", color: "#e8e0d0", fontFamily: "monospace", fontSize: "0.8rem", outline: "none", padding: "0.25rem 0.4rem", width: "100%" }}
                        onFocus={e => e.currentTarget.style.borderColor = "#c9a96e"}
                        onBlur={e => e.currentTarget.style.borderColor = "#6b6560"}
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
                        style={{ appearance: "none", background: "#1a1f2e", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a5460'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.4rem center", border: "1px solid #6b6560", borderRadius: "2px", boxSizing: "border-box", color: "#e8e0d0", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem", outline: "none", padding: "0.25rem 1.5rem 0.25rem 0.4rem", width: "100%" }}
                        onFocus={e => e.currentTarget.style.borderColor = "#c9a96e"}
                        onBlur={e => e.currentTarget.style.borderColor = "#6b6560"}
                      >
                        {SEASON_OPTIONS.map(({ value, label }) => <option key={label} value={value ?? ""}>{label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                      <input
                        type="date"
                        value={newTask.lastCompleted || ""}
                        onChange={e => setNewTask(t => ({ ...t, lastCompleted: e.target.value || null }))}
                        style={{ background: "#1a1f2e", border: "1px solid #6b6560", borderRadius: "2px", boxSizing: "border-box", color: newTask.lastCompleted ? "#e8e0d0" : "#a8a29c", colorScheme: "dark", fontFamily: "monospace", fontSize: "0.72rem", outline: "none", padding: "0.25rem 0.4rem", width: "100%" }}
                        onFocus={e => e.currentTarget.style.borderColor = "#c9a96e"}
                        onBlur={e => e.currentTarget.style.borderColor = "#6b6560"}
                      />
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                      <div style={{ alignItems: "center", display: "flex", gap: "0.4rem" }}>
                        <input
                          type="date"
                          value={newTask.nextDate || ""}
                          onChange={e => setNewTask(t => ({ ...t, nextDate: e.target.value || null }))}
                          style={{ background: "#1a1f2e", border: "1px solid #6b6560", borderRadius: "2px", boxSizing: "border-box", color: newTask.nextDate ? "#e8e0d0" : "#a8a29c", colorScheme: "dark", fontFamily: "monospace", fontSize: "0.72rem", outline: "none", padding: "0.25rem 0.4rem", width: "100%" }}
                          onFocus={e => e.currentTarget.style.borderColor = "#c9a96e"}
                          onBlur={e => e.currentTarget.style.borderColor = "#6b6560"}
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
                        style={{ background: "#1a1f2e", border: "1px solid #6b6560", borderRadius: "2px", boxSizing: "border-box", color: "#e8e0d0", fontFamily: "monospace", fontSize: "0.75rem", outline: "none", padding: "0.25rem 0.4rem", width: "100%" }}
                        onFocus={e => e.currentTarget.style.borderColor = "#c9a96e"}
                        onBlur={e => e.currentTarget.style.borderColor = "#6b6560"}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: "1px solid #1e2330", display: "flex", gap: "0.75rem", justifyContent: "flex-end", padding: "1rem 1.25rem" }}>
              <button
                onClick={() => { setAddingTask(false); setNewTask({ task: "", schedule: "", season: null, lastCompleted: null, nextDate: null, followSchedule: false, notes: "" }); }}
                style={{ background: "transparent", border: "1px solid #6b6560", borderRadius: "3px", color: "#8b7d6b", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#e8e4dd"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#6b6560"; e.currentTarget.style.color = "#8b7d6b"; }}
              >Cancel</button>
              <button
                onClick={handleAddTask}
                disabled={!newTask.task.trim()}
                style={{ background: newTask.task.trim() ? "#c9a96e18" : "transparent", border: `1px solid ${newTask.task.trim() ? "#c9a96e40" : "#6b6560"}`, borderRadius: "3px", color: newTask.task.trim() ? "#c9a96e" : "#a8a29c", cursor: newTask.task.trim() ? "pointer" : "default", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
                onMouseEnter={e => { if (newTask.task.trim()) { e.currentTarget.style.background = "#c9a96e30"; e.currentTarget.style.borderColor = "#c9a96e"; } }}
                onMouseLeave={e => { if (newTask.task.trim()) { e.currentTarget.style.background = "#c9a96e18"; e.currentTarget.style.borderColor = "#c9a96e40"; } }}
              >Add Task</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteTaskPrompt && createPortal(
        <div
          onClick={() => setDeleteTaskPrompt(null)}
          style={{ alignItems: "center", background: "rgba(0,0,0,0.7)", bottom: 0, display: "flex", justifyContent: "center", left: 0, position: "fixed", right: 0, top: 0, zIndex: 1000 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: "#1a1f2e", border: "1px solid #6b6560", borderRadius: "8px", maxWidth: 440, padding: "2rem", width: "90%" }}>
            <div style={{ color: "#f0e6d3", fontSize: "1.05rem", marginBottom: "0.75rem" }}>
              Delete "{deleteTaskPrompt.task}"?
            </div>
            <p style={{ color: "#a89e8e", fontFamily: "monospace", fontSize: "0.8rem", lineHeight: 1.7, margin: "0 0 1.75rem" }}>
              {deleteTaskPrompt?._isCustom
                ? "This will permanently remove this task from the maintenance schedule. This action cannot be undone."
                : "This will remove this task from your maintenance schedule. It can be restored from the Guide page."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteTaskPrompt(null)}
                style={{ background: "transparent", border: "1px solid #6b6560", borderRadius: "3px", color: "#8b7d6b", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#e8e4dd"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#6b6560"; e.currentTarget.style.color = "#8b7d6b"; }}
              >Cancel</button>
              <button
                onClick={() => { handleDeleteTask(deleteTaskPrompt); setDeleteTaskPrompt(null); }}
                style={{ background: "#f8717118", border: "1px solid #f8717140", borderRadius: "3px", color: "#f87171", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.08em", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f8717130"; e.currentTarget.style.borderColor = "#f87171"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#f8717118"; e.currentTarget.style.borderColor = "#f8717140"; }}
              >Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div ref={headerRef} style={{
        background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 60%)",
        borderBottom: "1px solid #6b6560",
        flexShrink: 0,
        padding: "2rem",
        zIndex: 50,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
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
                Maintenance Scope
              </span>
            </div>
          </div>
          <PageNav currentPage="inventory" navigate={navigate} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "2rem 2rem 4rem" }}>
        <div style={{ alignItems: "flex-start", display: "flex", gap: "2rem" }}>
        <div style={{ flex: "0 0 58%", minWidth: 0 }}>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "2rem" }}>
          <button
            onClick={toggleAll}
            style={{
              background: "transparent",
              border: "1px solid #6b6560",
              borderRadius: "3px",
              color: "#8b7d6b",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: "0.65rem",
              letterSpacing: "0.08em",
              padding: "0.3rem 0.7rem",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#c9a96e"; e.currentTarget.style.color = "#c9a96e"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#6b6560"; e.currentTarget.style.color = "#8b7d6b"; }}
          >
            {allCollapsed ? "Expand All" : "Collapse All"}
          </button>
        </div>

        {GROUP_ORDER.map(groupType => {
          const cats = groupedCategories[groupType];
          const isTarget = !!dragging && dragOverGroup === groupType && effectiveCategoryTypes[dragging] !== groupType;
          const isGroupCollapsed = collapsedGroups[groupType];
          const isPendingHere = pendingNewCategory?.groupType === groupType;

          return (
            <div
              key={groupType}
              onDragEnter={() => dragging && setDragOverGroup(groupType)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(groupType)}
              style={{
                background: isTarget ? "#1a1f2e40" : "transparent",
                border: isTarget ? "1px dashed #c9a96e50" : "1px solid transparent",
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
                  borderBottom: `1px solid ${isTarget ? "#c9a96e30" : "#6b6560"}`,
                  cursor: "pointer",
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: isGroupCollapsed ? "0" : "0.75rem",
                  paddingBottom: "0.4rem",
                  userSelect: "none",
                }}
              >
                <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.6rem" }}>
                  {isGroupCollapsed ? "▶" : "▼"}
                </span>
                <span style={{
                  color: "#c9a96e",
                  fontFamily: "monospace",
                  fontSize: "0.65rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}>
                  {GROUP_LABELS[groupType]}
                </span>
                <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem" }}>
                  · {cats.length}
                </span>
              </div>

              {!isGroupCollapsed && (
                <>
                  {cats.map(category => renderCategory(category))}

                  {isPendingHere && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      <div style={{
                        alignItems: "center",
                        background: "#13161f",
                        border: "1px solid #1e2330",
                        borderRadius: "6px",
                        display: "flex",
                        gap: "0.75rem",
                        padding: "0.8rem 1rem",
                      }}>
                        <span style={{ color: "#6b6560", flexShrink: 0, fontSize: "0.7rem" }}>⠿</span>
                        <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.65rem", width: 14 }}>▶</span>
                        <InlineInput
                          placeholder="Category name..."
                          onCommit={name => handleCommitNewCategory(name, pendingNewCategory.id)}
                          onCancel={() => handleCancelNewCategory(pendingNewCategory.id)}
                        />
                      </div>
                    </div>
                  )}

                  {cats.length === 0 && !isPendingHere && (
                    <div style={{
                      border: `1px dashed ${isTarget ? "#c9a96e50" : "#6b6560"}`,
                      borderRadius: "6px",
                      color: isTarget ? "#c9a96e80" : "#6b6560",
                      fontFamily: "monospace",
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
                      onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#8b7d6b"; }}
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
          alignSelf: "flex-start",
          background: "#13161f",
          border: "1px solid #1e2330",
          borderRadius: "8px",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          position: "sticky",
          top: 24,
        }}>
          <div style={{
            borderBottom: "1px solid #1e2330",
            padding: "0.75rem 1rem 0.6rem",
          }}>
            <div style={{
              color: "#c9a96e",
              fontFamily: "monospace",
              fontSize: "0.62rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}>
              Maintenance
            </div>
            {selectedItem && (
              <div style={{ color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.82rem", marginTop: "0.35rem" }}>
                {selectedItem.item}
                <span style={{ color: "#a8a29c", fontSize: "0.65rem", marginLeft: "0.5rem" }}>
                  — {selectedItem.category}
                </span>
              </div>
            )}
          </div>
          {!selectedItem ? (
            <div style={{
              color: "#a8a29c",
              fontFamily: "monospace",
              fontSize: "0.72rem",
              padding: "2.5rem 1rem",
              textAlign: "center",
            }}>
              Select an item to view its tasks
            </div>
          ) : (
            <>
              {itemTasks.length === 0 ? (
                <div style={{
                  color: "#a8a29c",
                  fontFamily: "monospace",
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
                        background: idx % 2 === 0 ? "#13161f" : "#161920",
                        borderBottom: idx < itemTasks.length - 1 ? "1px solid #1e2330" : "none",
                        display: "flex",
                        gap: "0.5rem",
                        padding: "0.65rem 1rem",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          color: "#e8e4dd",
                          fontFamily: "monospace",
                          fontSize: "0.78rem",
                          marginBottom: "0.2rem",
                        }}>
                          {row.task}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                          {row.schedule && (
                            <span style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.65rem" }}>
                              {row.schedule}
                            </span>
                          )}
                          {row.season && (
                            <span style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.65rem" }}>
                              {row.season}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                          onClick={() => setDeleteTaskPrompt(row)}
                          title="Delete task"
                          style={{
                            background: "none",
                            border: "none",
                            color: "#a8a29c",
                            cursor: "pointer",
                            flexShrink: 0,
                            fontFamily: "monospace",
                            fontSize: "0.72rem",
                            padding: "0.1rem 0.3rem",
                            transition: "color 0.15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                          onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
                        >×</button>
                    </div>
                  ))}
                </div>
              )}
              {/* Groq suggested tasks */}
              {fetchingTasks && suggestedFor?.category === selectedItem?.category && suggestedFor?.item === selectedItem?.item && (
                <div style={{ borderTop: "1px solid #1e2330", padding: "1.25rem 1rem", textAlign: "center" }}>
                  <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Fetching tasks…</span>
                </div>
              )}
              {fetchError && suggestedFor?.category === selectedItem?.category && suggestedFor?.item === selectedItem?.item && (
                <div style={{ borderTop: "1px solid #1e2330", padding: "0.75rem 1rem" }}>
                  <span style={{ color: "#f87171", fontFamily: "monospace", fontSize: "0.68rem" }}>{fetchError}</span>
                </div>
              )}
              {suggestedTasks && suggestedFor?.category === selectedItem?.category && suggestedFor?.item === selectedItem?.item && (
                <div style={{ borderTop: "1px solid #1e2330" }}>
                  <div style={{ alignItems: "center", borderBottom: "1px solid #1e2330", display: "flex", justifyContent: "space-between", padding: "0.5rem 1rem 0.4rem" }}>
                    <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Suggested by AI
                    </span>
                    <button
                      onClick={() => { setSuggestedTasks(null); setSuggestedFor(null); setFetchError(null); }}
                      style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", padding: "0.1rem 0.3rem", transition: "color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                      onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
                    >×</button>
                  </div>
                  {suggestedTasks.map((t, idx) => (
                    <label
                      key={idx}
                      style={{ alignItems: "flex-start", background: idx % 2 === 0 ? "#13161f" : "#161920", borderBottom: "1px solid #1e2330", cursor: "pointer", display: "flex", gap: "0.6rem", padding: "0.55rem 1rem" }}
                    >
                      <input
                        type="checkbox"
                        checked={t.selected}
                        onChange={() => setSuggestedTasks(prev => prev.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s))}
                        style={{ accentColor: "#c9a96e", cursor: "pointer", flexShrink: 0, marginTop: "0.15rem" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: t.selected ? "#e8e4dd" : "#a8a29c", fontFamily: "monospace", fontSize: "0.75rem", transition: "color 0.15s" }}>
                          {t.task}
                        </div>
                        {t.schedule && (
                          <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.63rem", marginTop: "0.1rem" }}>
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
                        background: suggestedTasks.some(t => t.selected) ? "#c9a96e18" : "transparent",
                        border: `1px solid ${suggestedTasks.some(t => t.selected) ? "#c9a96e40" : "#6b6560"}`,
                        borderRadius: "3px",
                        color: suggestedTasks.some(t => t.selected) ? "#c9a96e" : "#a8a29c",
                        cursor: suggestedTasks.some(t => t.selected) ? "pointer" : "default",
                        fontFamily: "monospace",
                        fontSize: "0.68rem",
                        letterSpacing: "0.06em",
                        padding: "0.35rem 0.75rem",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { if (suggestedTasks.some(t => t.selected)) { e.currentTarget.style.background = "#c9a96e30"; e.currentTarget.style.borderColor = "#c9a96e"; } }}
                      onMouseLeave={e => { if (suggestedTasks.some(t => t.selected)) { e.currentTarget.style.background = "#c9a96e18"; e.currentTarget.style.borderColor = "#c9a96e40"; } }}
                    >
                      Add {suggestedTasks.filter(t => t.selected).length} to Schedule
                    </button>
                  </div>
                </div>
              )}

              <div style={{ borderTop: itemTasks.length > 0 || suggestedTasks ? "1px solid #1e2330" : "none", padding: "0.5rem 1rem" }}>
                <button
                  onClick={() => { setNewTask({ task: "", schedule: "", season: null, lastCompleted: null, nextDate: null, followSchedule: false, notes: "" }); setAddingTask(true); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#a8a29c",
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                    padding: "0.2rem 0",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "#c9a96e"}
                  onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
                >+ Add Task</button>
              </div>
            </>
          )}

          <div style={{ borderTop: "1px solid #1e2330" }}>
            <div style={{ borderBottom: "1px solid #1e2330", padding: "0.75rem 1rem 0.6rem" }}>
              <div style={{
                color: "#c9a96e",
                fontFamily: "monospace",
                fontSize: "0.62rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}>
                To Dos
              </div>
            </div>

            {!selectedItem ? (
              <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem", padding: "1.5rem 1rem", textAlign: "center" }}>
                Select an item to view to dos
              </div>
            ) : (
              <>
                {selectedTodos.length === 0 && !addingTodo && (
                  <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem", padding: "1.25rem 1rem 0.5rem", textAlign: "center" }}>
                    No to dos
                  </div>
                )}
                {selectedTodos.map((todo, idx) => {
                  const isOverdue = todo.dueDate && todo.status !== "done" && new Date(todo.dueDate) < new Date();
                  return (
                    <div
                      key={todo.id}
                      style={{
                        alignItems: "center",
                        background: idx % 2 === 0 ? "#13161f" : "#161920",
                        borderBottom: "1px solid #1e2330",
                        borderLeft: `3px solid ${PRIORITY_COLORS[todo.priority] || "#c9a96e"}`,
                        display: "flex",
                        gap: "0.5rem",
                        padding: "0.5rem 0.75rem",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: todo.status === "done" ? "#a8a29c" : "#e8e4dd",
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          overflow: "hidden",
                          textDecoration: todo.status === "done" ? "line-through" : "none",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {todo.title}
                        </div>
                        {todo.dueDate && (
                          <div style={{ color: isOverdue ? "#f87171" : "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem" }}>
                            {new Date(todo.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        )}
                      </div>
                      <span style={{
                        background: todo.status === "done" ? "#4ade8018" : todo.status === "in-progress" ? "#c9a96e18" : "#6b6560",
                        border: `1px solid ${todo.status === "done" ? "#4ade8040" : todo.status === "in-progress" ? "#c9a96e40" : "#6b6560"}`,
                        borderRadius: "2px",
                        color: todo.status === "done" ? "#4ade80" : todo.status === "in-progress" ? "#c9a96e" : "#a8a29c",
                        flexShrink: 0,
                        fontFamily: "monospace",
                        fontSize: "0.58rem",
                        letterSpacing: "0.06em",
                        padding: "0.1rem 0.35rem",
                        textTransform: "uppercase",
                      }}>
                        {todo.status === "not-started" ? "To Do" : todo.status === "in-progress" ? "In Progress" : "Done"}
                      </span>
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
                        background: "#13161f",
                        border: "1px solid #6b6560",
                        borderRadius: "3px",
                        boxSizing: "border-box",
                        color: "#e8e4dd",
                        fontFamily: "monospace",
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
                        color: "#a8a29c",
                        cursor: "pointer",
                        fontFamily: "monospace",
                        fontSize: "0.7rem",
                        letterSpacing: "0.05em",
                        padding: "0.2rem 0",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#a8a29c"; }}
                    >
                      + Add To Do
                    </button>
                  </div>
                )}

                <div style={{ borderTop: "1px solid #1e2330", padding: "0.4rem 0.75rem", textAlign: "right" }}>
                  <button
                    onClick={() => navigate("board")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#a8a29c",
                      cursor: "pointer",
                      fontFamily: "monospace",
                      fontSize: "0.62rem",
                      letterSpacing: "0.08em",
                      padding: "0.1rem 0",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#a8a29c"; }}
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
