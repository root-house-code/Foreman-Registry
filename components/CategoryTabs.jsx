export default function CategoryTabs({ categories, active, onSelect }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1.5rem" }}>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          style={{
            background: active === cat ? "#c9a96e" : "transparent",
            border: `1px solid ${active === cat ? "#c9a96e" : "#2e3448"}`,
            borderRadius: "3px",
            color: active === cat ? "#0f1117" : "#8b7d6b",
            cursor: "pointer",
            fontSize: "0.7rem",
            fontFamily: "monospace",
            fontWeight: active === cat ? "bold" : "normal",
            letterSpacing: "0.05em",
            padding: "0.3rem 0.65rem",
            transition: "all 0.15s",
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
