import { useState } from "react";
import data from "./data/maintenance.json";
import {
  getCategoryState,
  getOwnItemState,
  getEffectiveRowState,
  setCategoryState,
  setItemState,
} from "./lib/inventory.js";

// Build ordered category → unique items map from the data
const CATEGORY_ITEMS = (() => {
  const map = {};
  data.forEach(row => {
    if (!map[row.category]) map[row.category] = [];
    if (!map[row.category].includes(row.item)) map[row.category].push(row.item);
  });
  return map;
})();

const CATEGORIES = Object.keys(CATEGORY_ITEMS);

const STATE_OPTIONS = [
  { value: "included", label: "Show", color: "#4ade80" },
  { value: "muted",    label: "Dim",  color: "#f59e0b" },
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

export default function InventoryPage({ inventory, onInventoryChange, onNavigate }) {
  const [collapsed, setCollapsed] = useState({});
  const [navHovered, setNavHovered] = useState(false);

  function toggleCollapse(category) {
    setCollapsed(prev => ({ ...prev, [category]: !prev[category] }));
  }

  function handleCategoryChange(category, state) {
    onInventoryChange(setCategoryState(inventory, category, state));
  }

  function handleItemChange(category, item, state) {
    onInventoryChange(setItemState(inventory, category, item, state));
  }

  // Summary counts across all unique category+item pairs
  const allPairs = CATEGORIES.flatMap(cat =>
    CATEGORY_ITEMS[cat].map(item => ({ category: cat, item }))
  );
  const counts = allPairs.reduce((acc, { category, item }) => {
    const state = getEffectiveRowState(inventory, { category, item });
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f1117",
      color: "#e8e0d0",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
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
          <button
            onClick={onNavigate}
            onMouseEnter={() => setNavHovered(true)}
            onMouseLeave={() => setNavHovered(false)}
            style={navBtnStyle(navHovered)}
          >
            Registry →
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 2rem 4rem" }}>

        {/* Summary bar */}
        <div style={{ display: "flex", gap: "1.5rem", marginBottom: "2rem", fontFamily: "monospace", fontSize: "0.72rem" }}>
          <span style={{ color: "#4ade80" }}>
            {counts.included ?? 0} shown
          </span>
          <span style={{ color: "#f59e0b" }}>
            {counts.muted ?? 0} dimmed
          </span>
          <span style={{ color: "#f87171" }}>
            {counts.excluded ?? 0} hidden
          </span>
          <span style={{ color: "#5a5460" }}>
            of {allPairs.length} items
          </span>
        </div>

        {/* Category list */}
        {CATEGORIES.map(category => {
          const catState = getCategoryState(inventory, category);
          const items = CATEGORY_ITEMS[category];
          const isCollapsed = collapsed[category];
          const parentOverrides = catState !== "included";

          return (
            <div key={category} style={{ marginBottom: "0.5rem" }}>

              {/* Category row */}
              <div style={{
                alignItems: "center",
                background: "#13161f",
                border: "1px solid #1e2330",
                borderRadius: isCollapsed ? "6px" : "6px 6px 0 0",
                display: "flex",
                gap: "1rem",
                padding: "0.8rem 1rem",
              }}>
                <button
                  onClick={() => toggleCollapse(category)}
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
                <span
                  onClick={() => toggleCollapse(category)}
                  style={{ color: "#d4c9b8", cursor: "pointer", flex: 1, fontSize: "0.95rem" }}
                >
                  {category}
                </span>
                <span style={{ color: "#5a5460", fontFamily: "monospace", fontSize: "0.68rem" }}>
                  {items.length} {items.length === 1 ? "item" : "items"}
                </span>
                <StateToggle
                  state={catState}
                  onChange={state => handleCategoryChange(category, state)}
                />
              </div>

              {/* Item rows */}
              {!isCollapsed && (
                <div style={{ border: "1px solid #1e2330", borderTop: "none", borderRadius: "0 0 6px 6px", overflow: "hidden" }}>
                  {items.map((item, idx) => {
                    const ownState = getOwnItemState(inventory, category, item);
                    const isLast = idx === items.length - 1;

                    return (
                      <div
                        key={item}
                        style={{
                          alignItems: "center",
                          background: idx % 2 === 0 ? "#13161f" : "#161920",
                          borderBottom: isLast ? "none" : "1px solid #1e2330",
                          display: "flex",
                          gap: "1rem",
                          padding: "0.5rem 1rem 0.5rem 2.75rem",
                        }}
                      >
                        <span style={{
                          color: parentOverrides ? "#3a3440" : "#a89e8e",
                          flex: 1,
                          fontFamily: "monospace",
                          fontSize: "0.78rem",
                        }}>
                          {item}
                        </span>

                        {parentOverrides && (
                          <span style={{ color: "#3a3440", fontFamily: "monospace", fontSize: "0.65rem", fontStyle: "italic", whiteSpace: "nowrap" }}>
                            ↑ {catState === "muted" ? "dimmed" : "hidden"} by category
                          </span>
                        )}

                        <StateToggle
                          state={ownState}
                          onChange={state => handleItemChange(category, item, state)}
                          disabled={parentOverrides}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}
