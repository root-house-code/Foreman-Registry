import { useState } from "react";

// TODO: "Dashboard" tab is cosmetic — revisit functionality in a future version (likely a hub/landing page, see navigation plan Option C)
// TODO: "+" button is cosmetic — revisit functionality in a future version (likely quick-add or new view)

const TABS = [
  { key: "dashboard",   label: "Dashboard"   },
  { key: "calendar",    label: "Calendar"    },
  { key: "inventory",   label: "Inventory"   },
  { key: "maintenance", label: "Maintenance" },
  { key: "chores",      label: "Chores"      },
  { key: "board",       label: "To Dos"      },
  { key: "projects",    label: "Projects"    },
  { key: "guide",       label: "Guide"       },
  { key: "preferences", label: "Preferences" },
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
              border: `1px solid ${isActive ? "#c9a96e50" : isHovered && !isCosmetic ? "#6b6560" : "#1e2330"}`,
              borderRadius: "4px",
              color: isActive ? "#c9a96e" : isCosmetic ? "#6b6560" : isHovered ? "#8b7d6b" : "#a8a29c",
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
          color: "#6b6560",
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
