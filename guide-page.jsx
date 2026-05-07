import { useState, useMemo, useRef, useEffect } from "react";
import PageNav from "./components/PageNav.jsx";
import ScheduleBadge from "./components/ScheduleBadge.jsx";
import { defaultData } from "./lib/data.js";
import { loadDeletedRows, saveDeletedRows } from "./lib/deletedRows.js";
import { CATEGORY_TIPS, ITEM_TIPS, TASK_TIPS } from "./lib/tooltips.js";
import { MANUFACTURERS_BY_ITEM } from "./lib/manufacturers.js";
import { getModels } from "./lib/models.js";

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

  useEffect(() => {
    const raw = localStorage.getItem("foreman-deleted-rows");
    console.log("[Guide] foreman-deleted-rows raw:", raw);
    console.log("[Guide] deletedRows set size:", deletedRows.size);
    console.log("[Guide] deleted keys:", [...deletedRows]);
  }, []);

  function scrollTo(category) {
    sectionRefs.current[category]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const coverageItems = useMemo(() =>
    Object.keys(MANUFACTURERS_BY_ITEM).sort(),
    []
  );

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

  return (
    <div style={{ background: "#0f1117", color: "#d4c9b8", display: "flex", flexDirection: "column", fontFamily: "monospace", height: "100vh", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 60%)", borderBottom: "1px solid #2a2f3e", flexShrink: 0, padding: "2rem", zIndex: 50 }}>
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
          <span style={{ color: "#f87171", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.1em" }}>{deletedCount} removed from schedule</span>
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
                Model Coverage
              </button>
            );
          })()}
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
                      <div key={key}>
                        <div style={{ opacity: isDeleted ? 0.4 : 1, transition: "opacity 0.2s" }}>
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
                          </div>
                          {tip && (
                            <p style={{ color: "#2e3040", fontSize: "0.67rem", lineHeight: 1.7, margin: 0, maxWidth: "720px" }}>
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
            ))}
          </div>
        ))}

        {/* Model Coverage */}
        <div ref={el => sectionRefs.current["__coverage__"] = el} style={{ marginBottom: "4rem" }}>
          <h2 style={{ color: "#c9a96e", fontSize: "1rem", fontWeight: 400, letterSpacing: "0.08em", margin: "0 0 0.35rem" }}>
            Model Coverage
          </h2>
          <p style={{ color: "#4a4458", fontSize: "0.7rem", lineHeight: 1.7, margin: "0 0 1.75rem", maxWidth: "780px" }}>
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
                        <span style={{ color: "#5a5460", fontSize: "0.7rem" }}>{mfr}</span>
                        {models.length > 0 && (
                          <div style={{ color: "#2e3040", fontSize: "0.62rem", letterSpacing: "0.02em", lineHeight: 1.6, marginTop: "0.05rem" }}>
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
