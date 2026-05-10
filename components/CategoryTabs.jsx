function TabButton({ cat, active, onSelect }) {
  return (
    <button
      onClick={() => onSelect(cat)}
      style={{
        background: active === cat ? "#c9a96e" : "transparent",
        border: `1px solid ${active === cat ? "#c9a96e" : "#6b6560"}`,
        borderRadius: "3px",
        color: active === cat ? "#0f1117" : "#8b7d6b",
        cursor: "pointer",
        fontFamily: "monospace",
        fontSize: "0.7rem",
        fontWeight: active === cat ? "bold" : "normal",
        letterSpacing: "0.05em",
        padding: "0.3rem 0.65rem",
        transition: "all 0.15s",
      }}
    >
      {cat}
    </button>
  );
}

export default function CategoryTabs({ categories = [], special = [], groups = [], active, onSelect }) {
  if (groups.length > 0) {
    return (
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.75rem" }}>
          {special.map(cat => <TabButton key={cat} cat={cat} active={active} onSelect={onSelect} />)}
        </div>
        {groups.filter(g => g.tabs.length > 0).map(({ type, label, tabs }) => (
          <div key={type} style={{ alignItems: "flex-start", display: "flex", gap: "0.75rem", marginBottom: "0.4rem" }}>
            <span style={{
              color: "#c9a96e",
              fontFamily: "monospace",
              fontSize: "0.58rem",
              letterSpacing: "0.15em",
              lineHeight: 1,
              minWidth: "5.5rem",
              paddingTop: "0.35rem",
              textTransform: "uppercase",
            }}>
              {label}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {tabs.map(cat => <TabButton key={cat} cat={cat} active={active} onSelect={onSelect} />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1.5rem" }}>
      {categories.map(cat => <TabButton key={cat} cat={cat} active={active} onSelect={onSelect} />)}
    </div>
  );
}
