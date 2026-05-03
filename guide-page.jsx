import { useState, useMemo, useRef } from "react";
import PageNav from "./components/PageNav.jsx";
import ScheduleBadge from "./components/ScheduleBadge.jsx";
import { defaultData } from "./lib/data.js";
import { loadDeletedRows, saveDeletedRows } from "./lib/deletedRows.js";
import { CATEGORY_TIPS, ITEM_TIPS, TASK_TIPS } from "./lib/tooltips.js";

const SEASON_LABELS = { spring: "Spring", summer: "Summer", fall: "Fall", winter: "Winter" };

export default function GuidePage({ navigate }) {
  const [deletedRows, setDeletedRows] = useState(() => loadDeletedRows());

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
  const contentRef = useRef(null);
  const sectionRefs = useRef({});

  const deletedCount = useMemo(() =>
    defaultData.filter(row => deletedRows.has(`${row.category}|${row.item}|${row.task}`)).length,
    [deletedRows]
  );

  function scrollTo(category) {
    sectionRefs.current[category]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleScroll() {
    const container = contentRef.current;
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top;
    let current = grouped[0]?.category ?? null;
    for (const { category } of grouped) {
      const el = sectionRefs.current[category];
      if (el && el.getBoundingClientRect().top - containerTop <= 40) current = category;
    }
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

  return (
    <div style={{ background: "#0f1117", color: "#d4c9b8", display: "flex", flexDirection: "column", fontFamily: "monospace", height: "100vh", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #0a0c12 0%, #0d0f16 100%)",
        borderBottom: "1px solid #1a1d26",
        flexShrink: 0,
        padding: "1.5rem 2rem 1rem",
      }}>
        <div style={{ alignItems: "flex-end", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#3a3548", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.15em", marginBottom: "0.2rem", textTransform: "uppercase" }}>
              YOUR HOME, EXPLAINED
            </div>
            <div style={{ alignItems: "baseline", display: "flex", gap: "1rem" }}>
              <h1 style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 400, letterSpacing: "0.1em", margin: 0 }}>
                Guide
              </h1>
              {deletedCount > 0 && (
                <span style={{ color: "#f87171", fontSize: "0.6rem", letterSpacing: "0.1em" }}>
                  {deletedCount} removed from schedule
                </span>
              )}
            </div>
          </div>
          <PageNav currentPage="guide" navigate={navigate} />
        </div>
      </div>

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
                  color: isActive ? "#c9a96e" : "#3a3548",
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
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "#6a6478"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "#3a3548"; }}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div ref={contentRef} onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", padding: "2rem 2.5rem 4rem" }}>
        {grouped.map(({ category, items }) => (
          <div key={category} ref={el => sectionRefs.current[category] = el} style={{ marginBottom: "4rem" }}>
            {/* Category header */}
            <h2 style={{ color: "#c9a96e", fontSize: "1rem", fontWeight: 400, letterSpacing: "0.08em", margin: "0 0 0.35rem" }}>
              {category}
            </h2>
            {CATEGORY_TIPS[category] && (
              <p style={{ color: "#4a4458", fontSize: "0.7rem", lineHeight: 1.7, margin: "0 0 1.75rem", maxWidth: "780px" }}>
                {CATEGORY_TIPS[category]}
              </p>
            )}

            {/* Items */}
            {items.map(({ item, tasks }) => (
              <div key={item} style={{ marginBottom: "1.75rem", paddingLeft: "1.25rem" }}>
                <h3 style={{ color: "#c9a96e", fontSize: "0.78rem", fontWeight: 400, letterSpacing: "0.05em", margin: "0 0 0.25rem" }}>
                  {item}
                </h3>
                {ITEM_TIPS[item] && (
                  <p style={{ color: "#3a3548", fontSize: "0.67rem", lineHeight: 1.7, margin: "0 0 0.75rem", maxWidth: "720px" }}>
                    {ITEM_TIPS[item]}
                  </p>
                )}

                {/* Tasks */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", paddingLeft: "1rem" }}>
                  {tasks.map(row => {
                    const key = `${row.category}|${row.item}|${row.task}`;
                    const isDeleted = deletedRows.has(key);
                    const tip = TASK_TIPS[key];

                    return (
                      <div key={key} style={{ opacity: isDeleted ? 0.4 : 1, transition: "opacity 0.2s" }}>
                        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: tip ? "0.3rem" : 0 }}>
                          <span style={{ color: isDeleted ? "#4a4458" : "#8b7d6b", fontSize: "0.75rem", textDecoration: isDeleted ? "line-through" : "none" }}>
                            {row.task}
                          </span>
                          {row.schedule && <ScheduleBadge schedule={row.schedule} />}
                          {row.season && (
                            <span style={{ background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: "3px", color: "#5a5460", fontSize: "0.6rem", letterSpacing: "0.08em", padding: "0.15rem 0.4rem" }}>
                              {SEASON_LABELS[row.season] ?? row.season}
                            </span>
                          )}
                          {isDeleted && <span style={{ color: "#f87171", fontSize: "0.6rem", letterSpacing: "0.08em" }}>removed</span>}
                          {isDeleted && <RestoreButton onRestore={() => handleRestore(key)} />}
                        </div>
                        {tip && (
                          <p style={{ color: "#2e3040", fontSize: "0.67rem", lineHeight: 1.7, margin: 0, maxWidth: "720px" }}>
                            {tip}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
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
        border: `1px solid ${hovered ? "#c9a96e" : "#2e3448"}`,
        borderRadius: "3px",
        color: hovered ? "#c9a96e" : "#4a4458",
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
