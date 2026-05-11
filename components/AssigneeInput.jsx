import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

const MEMBERS_KEY = "foreman-household-members";

function loadMembers() {
  try { return JSON.parse(localStorage.getItem(MEMBERS_KEY) || "[]"); }
  catch { return []; }
}

export default function AssigneeInput({ value, onChange, onBlurCommit, placeholder = "Assign to…", style = {} }) {
  const [members, setMembers] = useState([]);
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);

  useEffect(() => { setMembers(loadMembers()); }, []);

  const filtered = members.filter(m =>
    !value || m.name.toLowerCase().includes(value.toLowerCase())
  );

  const openDrop = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropPos({ top: rect.bottom + window.scrollY + 2, left: rect.left + window.scrollX, width: rect.width });
    setOpen(true);
  }, []);

  const select = useCallback((name) => {
    onChange(name);
    setOpen(false);
  }, [onChange]);

  const baseInput = {
    width: "100%",
    background: "#1a1625",
    border: "1px solid #a8a29c",
    borderRadius: "3px",
    color: "#e8e0d5",
    fontFamily: "monospace",
    fontSize: "0.82rem",
    padding: "0.45rem 0.6rem",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
    ...style,
  };

  const dropdown = open && filtered.length > 0 && createPortal(
    <div
      onMouseDown={e => e.preventDefault()}
      style={{
        position: "absolute",
        top: dropPos.top,
        left: dropPos.left,
        width: dropPos.width,
        background: "#1a1625",
        border: "1px solid #3a3548",
        borderRadius: "3px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {filtered.map(m => (
        <div
          key={m.id}
          onMouseDown={() => select(m.name)}
          style={{
            padding: "0.4rem 0.6rem",
            color: "#e8e0d5",
            fontFamily: "monospace",
            fontSize: "0.82rem",
            cursor: "pointer",
            transition: "background 0.1s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#2a2438"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          {m.name}
        </div>
      ))}
    </div>,
    document.body
  );

  return (
    <>
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={baseInput}
        onFocus={e => { e.currentTarget.style.borderColor = "#c9a96e"; openDrop(); }}
        onBlur={e => { e.currentTarget.style.borderColor = "#a8a29c"; setOpen(false); onBlurCommit?.(); }}
      />
      {dropdown}
    </>
  );
}

// Click-to-edit wrapper for table cells — shows plain text, click switches to AssigneeInput
export function AssigneeCellInput({ value, placeholder = "—", onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit(v) {
    onChange(v);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div
        onClick={() => { setDraft(value); setEditing(true); }}
        style={{
          color: value ? "#e8e0d5" : "#6b6481",
          fontFamily: "monospace",
          fontSize: "0.82rem",
          cursor: "text",
          minHeight: "1.2em",
          padding: "0.1rem 0",
          userSelect: "none",
        }}
      >
        {value || placeholder}
      </div>
    );
  }

  return (
    <AssigneeInput
      value={draft}
      onChange={v => setDraft(v)}
      onBlurCommit={() => commit(draft)}
      placeholder={placeholder}
      style={{ fontSize: "0.8rem", padding: "0.2rem 0.4rem" }}
    />
  );
}
