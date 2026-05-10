import { useState, useRef } from "react";
import Tooltip from "./Tooltip.jsx";

export default function ComboCell({ value, options, placeholder, onChange, tooltip }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  function startEdit() {
    setDraft(value || "");
    setEditing(true);
  }

  function commit(val) {
    setEditing(false);
    onChange(val);
  }

  function handleBlur() {
    commit(draft);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") { e.preventDefault(); commit(draft); }
    if (e.key === "Escape") { setEditing(false); }
  }

  const filtered = draft === ""
    ? options
    : options.filter(o => o.toLowerCase().includes(draft.toLowerCase()));

  if (!editing) {
    return (
      <Tooltip text={tooltip}>
        <span
          onClick={startEdit}
          style={{
            color: value ? "#e8e4dd" : "#a8a29c",
            cursor: "text",
            display: "block",
            fontFamily: "monospace",
            fontSize: "0.78rem",
            minHeight: "1.2em",
          }}
        >
          {value || placeholder}
        </span>
      </Tooltip>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          background: "#1a1f2e",
          border: "1px solid #a8a29c",
          borderRadius: "2px",
          color: "#e8e4dd",
          fontFamily: "monospace",
          fontSize: "0.78rem",
          outline: "none",
          padding: "0.2rem 0.4rem",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      {filtered.length > 0 && (
        <div
          onMouseDown={e => e.preventDefault()}
          style={{
            background: "#1a1f2e",
            border: "1px solid #a8a29c",
            borderRadius: "2px",
            left: 0,
            maxHeight: 200,
            overflowY: "auto",
            position: "absolute",
            top: "100%",
            width: "100%",
            zIndex: 200,
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
              onMouseEnter={e => { e.currentTarget.style.background = "#a8a29c"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
