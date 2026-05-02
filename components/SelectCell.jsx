import { useState, useRef, useEffect } from "react";

export default function SelectCell({ value, options, placeholder, onChange, renderDisplay }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selectedOption = options.find(o => o.value === value);

  function handleSelect(optValue) {
    onChange(optValue);
    setOpen(false);
  }

  function renderValue() {
    if (renderDisplay) return renderDisplay(value);
    if (selectedOption) return (
      <span style={{ color: "#d4c9b8", fontFamily: "monospace", fontSize: "0.78rem" }}>
        {selectedOption.label}
      </span>
    );
    return (
      <span style={{ color: "#3a3440", fontFamily: "monospace", fontSize: "0.78rem" }}>
        {placeholder}
      </span>
    );
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ cursor: "pointer", minHeight: "1.2em" }}
      >
        {renderValue()}
      </div>
      {open && (
        <div style={{
          background: "#1a1f2e",
          border: "1px solid #2e3448",
          borderRadius: "2px",
          left: 0,
          maxHeight: 200,
          overflowY: "auto",
          position: "absolute",
          top: "100%",
          width: "max-content",
          minWidth: "100%",
          zIndex: 200,
        }}>
          {options.map(opt => (
            <div
              key={String(opt.value)}
              onMouseDown={() => handleSelect(opt.value)}
              style={{
                color: opt.value === value ? "#c9a96e" : "#d4c9b8",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: "0.78rem",
                padding: "0.3rem 0.6rem",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#2a2f3e"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
