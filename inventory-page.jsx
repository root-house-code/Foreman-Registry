import { useState, useMemo, useEffect, useRef, Fragment, forwardRef } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
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
import { loadItemDetails, saveItemDetails } from "./lib/itemDetails.js";
import {
  getCategoryState,
  getOwnItemState,
  getEffectiveRowState,
  setCategoryState,
  setItemState,
} from "./lib/inventory.js";
import {
  loadCategoryTypeOverrides,
  saveCategoryTypeOverrides,
  GROUP_ORDER,
  GROUP_LABELS,
} from "./lib/categoryTypes.js";

const PRIORITY_COLORS = {
  low:    "#4ade80",
  medium: "#c9a96e",
  high:   "#f59e0b",
  urgent: "#f87171",
};

const STATE_OPTIONS = [
  { value: "included", label: "Show", color: "#4ade80" },
  { value: "muted",    label: "Mute", color: "#f59e0b" },
  { value: "excluded", label: "Hide", color: "#f87171" },
];

function StateToggle({ state, onChange, disabled }) {
  return (
    <div style={{ display: "flex", gap: "0.2rem", flexShrink: 0 }}>
      {STATE_OPTIONS.map(({ value, label, color }) => {
        const active = state === value;
        return (
          <button
            key={value}
            onClick={() => !disabled && onChange(value)}
            style={{
              background: active ? `${color}18` : "transparent",
              border: `1px solid ${active ? `${color}40` : "#2e3448"}`,
              borderRadius: "3px",
              color: active ? color : "#5a5460",
              cursor: disabled ? "default" : "pointer",
              fontFamily: "monospace",
              fontSize: "0.65rem",
              letterSpacing: "0.05em",
              opacity: disabled ? 0.4 : 1,
              padding: "0.2rem 0.5rem",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

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
      border: "1px solid #2a2f3e",
      borderRadius: "3px",
      boxSizing: "border-box",
      color: value ? "#d4c9b8" : "#5a5460",
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
        border: "1px solid #2e3448",
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
          border: "1px solid #2e3448",
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
            border: "1px solid #2e3448",
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
              onMouseEnter={e => { e.currentTarget.style.background = "#2a2f3e"; }}
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

export default function InventoryPage({ inventory, onInventoryChange, navigate }) {
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

  const itemTasks = useMemo(() => {
    if (!selectedItem) return [];
    return rows.filter(r =>
      r.category === selectedItem.category &&
      r.item === selectedItem.item &&
      !r._isBlankCategory &&
      r.task
    );
  }, [rows, selectedItem]);

  const selectedTodos = useMemo(() => {
    if (!selectedItem) return [];
    return todos.filter(t =>
      t.linkedCategory === selectedItem.category &&
      (t.linkedItem === selectedItem.item || t.linkedItem === null)
    );
  }, [todos, selectedItem]);

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

  function handleCategoryChange(category, state) {
    onInventoryChange(setCategoryState(inventory, category, state));
  }

  function handleItemChange(category, item, state) {
    onInventoryChange(setItemState(inventory, category, item, state));
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

  const allPairs = CATEGORIES.flatMap(cat =>
    CATEGORY_ITEMS[cat].map(item => ({ category: cat, item }))
  );
  const counts = allPairs.reduce((acc, { category, item }) => {
    const state = getEffectiveRowState(inventory, { category, item });
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});

  function renderCategory(category) {
    const catState = getCategoryState(inventory, category);
    const items = CATEGORY_ITEMS[category];
    const isCollapsed = collapsed[category];
    const parentOverrides = catState !== "included";
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
          <span style={{ color: "#2e3448", flexShrink: 0, fontSize: "0.7rem", lineHeight: 1 }}>⠿</span>
          <button
            onClick={e => { e.stopPropagation(); toggleCollapse(category); }}
            style={{
              background: "none",
              border: "none",
              color: "#5a5460",
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
                style={{ color: "#d4c9b8", cursor: "text", flex: 1, fontSize: "0.95rem" }}
              >
                {category}
              </span>
            </Tooltip>
          )}

          {!isEditing && (
            <>
              <span style={{ color: "#5a5460", fontFamily: "monospace", fontSize: "0.68rem" }}>
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
              <StateToggle
                state={catState}
                onChange={state => handleCategoryChange(category, state)}
              />
              <button
                onClick={e => { e.stopPropagation(); handleDuplicateCategory(category); }}
                title="Duplicate category"
                style={{
                  background: "none",
                  border: "none",
                  color: "#3a3440",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  padding: "0.1rem 0.3rem",
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#c9a96e"}
                onMouseLeave={e => e.currentTarget.style.color = "#3a3440"}
              >
                ⎘
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleDeleteClick(category); }}
                title="Delete category"
                style={{
                  background: "none",
                  border: "none",
                  color: "#3a3440",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: "0.72rem",
                  padding: "0.1rem 0.3rem",
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                onMouseLeave={e => e.currentTarget.style.color = "#3a3440"}
              >
                ×
              </button>
            </>
          )}
        </div>

        {!isCollapsed && (
          <div style={{ border: "1px solid #1e2330", borderTop: "none", borderRadius: "0 0 6px 6px", overflow: "hidden" }}>
            {items.map((item, idx) => {
              const ownState = getOwnItemState(inventory, category, item);
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
                        color: "#5a5460",
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
                          color: isSelected ? "#c9a96e" : (parentOverrides ? "#3a3440" : "#a89e8e"),
                          cursor: "pointer",
                          flex: 1,
                          fontFamily: "monospace",
                          fontSize: "0.78rem",
                        }}
                      >
                        {item}
                      </span>
                    </Tooltip>
                    {parentOverrides && (
                      <span style={{ color: "#3a3440", fontFamily: "monospace", fontSize: "0.65rem", fontStyle: "italic", whiteSpace: "nowrap" }}>
                        ↑ {catState === "muted" ? "muted" : "hidden"} by category
                      </span>
                    )}
                    <StateToggle
                      state={ownState}
                      onChange={state => handleItemChange(category, item, state)}
                      disabled={parentOverrides}
                    />
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
                        color: "#3a3440",
                        cursor: "pointer",
                        flexShrink: 0,
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        padding: "0.1rem 0.3rem",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "#c9a96e"}
                      onMouseLeave={e => e.currentTarget.style.color = "#3a3440"}
                    >
                      ⎘
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleItemDeleteClick(category, item); }}
                      title="Delete item"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#3a3440",
                        cursor: "pointer",
                        fontFamily: "monospace",
                        fontSize: "0.72rem",
                        flexShrink: 0,
                        padding: "0.1rem 0.3rem",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                      onMouseLeave={e => e.currentTarget.style.color = "#3a3440"}
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
                        {[
                          { field: "make",   label: "Make" },
                          { field: "model",  label: "Model" },
                          { field: "serial", label: "Serial No." },
                        ].map(({ field, label }) => (
                          <div key={field} style={{ display: "flex", flexDirection: "column", flex: 1, gap: "0.3rem", minWidth: 0 }}>
                            <span style={{
                              color: "#5a5460",
                              fontFamily: "monospace",
                              fontSize: "0.6rem",
                              letterSpacing: "0.12em",
                              textTransform: "uppercase",
                            }}>
                              {label}
                            </span>
                            <input
                              value={details[field] || ""}
                              onChange={e => handleItemDetailChange(category, item, field, e.target.value)}
                              placeholder="—"
                              style={{
                                background: "#13161f",
                                border: "1px solid #2a2f3e",
                                borderRadius: "3px",
                                boxSizing: "border-box",
                                color: "#d4c9b8",
                                fontFamily: "monospace",
                                fontSize: "0.75rem",
                                outline: "none",
                                padding: "0.3rem 0.5rem",
                                width: "100%",
                              }}
                              onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; }}
                              onBlur={e => { e.currentTarget.style.borderColor = "#2a2f3e"; }}
                            />
                          </div>
                        ))}
                        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "0.3rem", minWidth: 0 }}>
                          <span style={{
                            color: "#5a5460",
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
                                border: "1px solid #2a2f3e",
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
                                color: "#5a5460",
                                cursor: "pointer",
                                fontFamily: "monospace",
                                fontSize: "0.72rem",
                                padding: "0.1rem 0.3rem",
                                transition: "color 0.15s",
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                              onMouseLeave={e => e.currentTarget.style.color = "#5a5460"}
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
                                border: "1px dashed #2a2f3e",
                                borderRadius: "3px",
                                color: "#5a5460",
                                fontFamily: "monospace",
                                fontSize: "0.7rem",
                                letterSpacing: "0.08em",
                                padding: "0.25rem 0.65rem",
                                transition: "color 0.15s, border-color 0.15s",
                              }}
                              onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; e.currentTarget.style.borderColor = "#c9a96e"; }}
                              onMouseLeave={e => { e.currentTarget.style.color = "#5a5460"; e.currentTarget.style.borderColor = "#2a2f3e"; }}
                            >
                              + Upload Receipt
                            </span>
                          </label>
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
        ? `This will permanently remove ${taskCount} task${taskCount !== 1 ? "s" : ""} from your registry.`
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
      ? `This will permanently remove ${parts.join(" and ")} from your registry.`
      : "This category has no items or tasks.";
    const recovery = isDefault
      ? " Default categories can be restored by resetting to default."
      : " This action cannot be undone.";
    return scope + recovery;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f1117",
      color: "#e8e0d0",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      padding: "0",
    }}>

      {duplicateItemPopup && createPortal(
        <>
          <div
            onClick={() => setDuplicateItemPopup(null)}
            style={{ bottom: 0, left: 0, position: "fixed", right: 0, top: 0, zIndex: 9998 }}
          />
          <div style={{
            background: "#1a1f2e",
            border: "1px solid #2e3448",
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
              borderBottom: "1px solid #2e3448",
              color: "#5a5460",
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
                  onMouseEnter={e => e.currentTarget.style.background = "#2a2f3e"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {cat}
                </div>
              ))
            }
            {CATEGORIES.filter(cat => cat !== duplicateItemPopup.fromCategory && !CATEGORY_ITEMS[cat]?.includes(duplicateItemPopup.item)).length === 0 && (
              <div style={{ color: "#5a5460", fontFamily: "monospace", fontSize: "0.75rem", padding: "0.5rem 0.65rem" }}>
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
              border: "1px solid #2e3448",
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

      <div ref={headerRef} style={{
        background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 60%)",
        borderBottom: "1px solid #2a2f3e",
        padding: "2rem 2rem 2rem",
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
                MANAGE YOUR
              </span>
              <span style={{ color: "#c9a96e", fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: "clamp(0.95rem, 2vw, 1.15rem)", letterSpacing: "0.01em" }}>
                Maintenance Scope
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <button
              onClick={() => navigate("board")}
              onMouseEnter={() => setNavHovered("board")}
              onMouseLeave={() => setNavHovered(null)}
              style={navBtnStyle(navHovered === "board")}
            >
              Board
            </button>
            <button
              onClick={() => navigate("registry")}
              onMouseEnter={() => setNavHovered("registry")}
              onMouseLeave={() => setNavHovered(null)}
              style={navBtnStyle(navHovered === "registry")}
            >
              Registry
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "2rem 2rem 4rem" }}>
        <div style={{ alignItems: "flex-start", display: "flex", gap: "2rem" }}>
        <div style={{ flex: "0 0 58%", minWidth: 0 }}>

        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div style={{ display: "flex", gap: "1.5rem", fontFamily: "monospace", fontSize: "0.72rem" }}>
            <span style={{ color: "#4ade80" }}>{counts.included ?? 0} shown</span>
            <span style={{ color: "#f59e0b" }}>{counts.muted ?? 0} muted</span>
            <span style={{ color: "#f87171" }}>{counts.excluded ?? 0} hidden</span>
            <span style={{ color: "#5a5460" }}>of {allPairs.length} items</span>
          </div>
          <button
            onClick={toggleAll}
            style={{
              background: "transparent",
              border: "1px solid #2e3448",
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
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2e3448"; e.currentTarget.style.color = "#8b7d6b"; }}
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
                  borderBottom: `1px solid ${isTarget ? "#c9a96e30" : "#2a2f3e"}`,
                  cursor: "pointer",
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: isGroupCollapsed ? "0" : "0.75rem",
                  paddingBottom: "0.4rem",
                  userSelect: "none",
                }}
              >
                <span style={{ color: "#3a3440", fontFamily: "monospace", fontSize: "0.6rem" }}>
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
                <span style={{ color: "#3a3440", fontFamily: "monospace", fontSize: "0.62rem" }}>
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
                        <span style={{ color: "#2e3448", flexShrink: 0, fontSize: "0.7rem" }}>⠿</span>
                        <span style={{ color: "#3a3440", fontFamily: "monospace", fontSize: "0.65rem", width: 14 }}>▶</span>
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
                      border: `1px dashed ${isTarget ? "#c9a96e50" : "#2a2f3e"}`,
                      borderRadius: "6px",
                      color: isTarget ? "#c9a96e80" : "#2e3448",
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
          top: headerHeight + 24,
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
              <div style={{ color: "#d4c9b8", fontFamily: "monospace", fontSize: "0.82rem", marginTop: "0.35rem" }}>
                {selectedItem.item}
                <span style={{ color: "#5a5460", fontSize: "0.65rem", marginLeft: "0.5rem" }}>
                  — {selectedItem.category}
                </span>
              </div>
            )}
          </div>
          {!selectedItem ? (
            <div style={{
              color: "#3a3440",
              fontFamily: "monospace",
              fontSize: "0.72rem",
              padding: "2.5rem 1rem",
              textAlign: "center",
            }}>
              Select an item to view its tasks
            </div>
          ) : itemTasks.length === 0 ? (
            <div style={{
              color: "#3a3440",
              fontFamily: "monospace",
              fontSize: "0.72rem",
              padding: "2.5rem 1rem",
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
                    background: idx % 2 === 0 ? "#13161f" : "#161920",
                    borderBottom: idx < itemTasks.length - 1 ? "1px solid #1e2330" : "none",
                    padding: "0.65rem 1rem",
                  }}
                >
                  <div style={{
                    color: "#d4c9b8",
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
              ))}
            </div>
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
              <div style={{ color: "#3a3440", fontFamily: "monospace", fontSize: "0.72rem", padding: "1.5rem 1rem", textAlign: "center" }}>
                Select an item to view to dos
              </div>
            ) : (
              <>
                {selectedTodos.length === 0 && !addingTodo && (
                  <div style={{ color: "#3a3440", fontFamily: "monospace", fontSize: "0.72rem", padding: "1.25rem 1rem 0.5rem", textAlign: "center" }}>
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
                          color: todo.status === "done" ? "#5a5460" : "#d4c9b8",
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
                          <div style={{ color: isOverdue ? "#f87171" : "#5a5460", fontFamily: "monospace", fontSize: "0.62rem" }}>
                            {new Date(todo.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        )}
                      </div>
                      <span style={{
                        background: todo.status === "done" ? "#4ade8018" : todo.status === "in-progress" ? "#c9a96e18" : "#2a2f3e",
                        border: `1px solid ${todo.status === "done" ? "#4ade8040" : todo.status === "in-progress" ? "#c9a96e40" : "#2e3448"}`,
                        borderRadius: "2px",
                        color: todo.status === "done" ? "#4ade80" : todo.status === "in-progress" ? "#c9a96e" : "#5a5460",
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
                        border: "1px solid #2a2f3e",
                        borderRadius: "3px",
                        boxSizing: "border-box",
                        color: "#d4c9b8",
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
                        color: "#3a3440",
                        cursor: "pointer",
                        fontFamily: "monospace",
                        fontSize: "0.7rem",
                        letterSpacing: "0.05em",
                        padding: "0.2rem 0",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#3a3440"; }}
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
                      color: "#3a3440",
                      cursor: "pointer",
                      fontFamily: "monospace",
                      fontSize: "0.62rem",
                      letterSpacing: "0.08em",
                      padding: "0.1rem 0",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#3a3440"; }}
                  >
                    View all on Board →
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
