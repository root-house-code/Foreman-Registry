import { useState } from "react";

// TODO: "Dashboard" tab is cosmetic — revisit functionality in a future version (likely a hub/landing page, see navigation plan Option C)
// TODO: "+" button is cosmetic — revisit functionality in a future version (likely quick-add or new view)

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "inventory", label: "Inventory" },
  { key: "maintenance", label: "Maintenance" },
  { key: "chores", label: "Chores" },
  { key: "board", label: "To Dos" },
  { key: "projects", label: "Projects" },
  { key: "guide", label: "Guide" },
];

export default function PageNav({ currentPage, navigate }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ alignItems: "center", display: "flex", gap: "0.25rem" }}>
      {TABS.map(tab => {
        const isActive = currentPage === tab.key;
        const isHovered = hovered === tab.key;
        const isCosmetic = tab.cosmetic;

        return (
          <button
            key={tab.key}
            onClick={() => { if (!isActive && !isCosmetic) navigate(tab.key); }}
            onMouseEnter={() => setHovered(tab.key)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: isActive ? "#c9a96e18" : isHovered && !isCosmetic ? "#ffffff06" : "transparent",
              border: `1px solid ${isActive ? "#c9a96e50" : isHovered && !isCosmetic ? "#2e3448" : "#1e2330"}`,
              borderRadius: "4px",
              color: isActive ? "#c9a96e" : isCosmetic ? "#2a2f3e" : isHovered ? "#8b7d6b" : "#4a4458",
              cursor: isActive || isCosmetic ? "default" : "pointer",
              fontFamily: "monospace",
              fontSize: "0.7rem",
              letterSpacing: "0.08em",
              padding: "0.3rem 0.7rem",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        );
      })}

      {/* TODO: cosmetic placeholder — revisit "+" functionality in a future version */}
      <button
        style={{
          background: "transparent",
          border: "1px solid #1e2330",
          borderRadius: "4px",
          color: "#2a2f3e",
          cursor: "default",
          fontFamily: "monospace",
          fontSize: "0.7rem",
          padding: "0.3rem 0.55rem",
        }}
      >
        +
      </button>
    </div>
  );
}
