import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import ScheduleBadge from "./ScheduleBadge.jsx";

function parseValue(val) {
  if (!val) return { mode: "interval", count: 1, unit: "months" };
  const s = val.toLowerCase();
  if (s === "as needed") return { mode: "special", special: "as needed" };
  if (s === "every load") return { mode: "special", special: "every load" };
  const days   = s.match(/every\s+(\d+)\s*days?/);   if (days)   return { mode: "interval", count: +days[1],   unit: "days" };
  const weeks  = s.match(/every\s+(\d+)\s*weeks?/);  if (weeks)  return { mode: "interval", count: +weeks[1],  unit: "weeks" };
  const months = s.match(/every\s+(\d+)\s*months?/); if (months) return { mode: "interval", count: +months[1], unit: "months" };
  const years  = s.match(/every\s+(\d+)\s*years?/);  if (years)  return { mode: "interval", count: +years[1],  unit: "years" };
  if (s === "monthly")      return { mode: "interval", count: 1, unit: "months" };
  if (s.includes("annual")) return { mode: "interval", count: 1, unit: "years" };
  return null;
}

function formatValue(mode, count, unit, special) {
  if (mode === "special") return special;
  const singular = unit.replace(/s$/, "");
  return `every ${count} ${count === 1 ? singular : unit}`;
}

const INPUT_STYLE = {
  background: "#1a1f2e",
  border: "1px solid #a8a29c",
  borderRadius: "2px",
  color: "#e8e4dd",
  fontFamily: "monospace",
  fontSize: "0.78rem",
  outline: "none",
  padding: "0.25rem 0.4rem",
};

export default function SchedulePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const parsed = parseValue(value);
  const [mode, setMode]       = useState(parsed?.mode    ?? "interval");
  const [count, setCount]     = useState(parsed?.count   ?? 1);
  const [unit, setUnit]       = useState(parsed?.unit    ?? "months");
  const [special, setSpecial] = useState(parsed?.special ?? "as needed");
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Re-sync picker state to current value when opening
    const p = parseValue(value);
    if (p) {
      setMode(p.mode);
      if (p.mode === "interval") { setCount(p.count); setUnit(p.unit); }
      if (p.mode === "special")  { setSpecial(p.special); }
    } else {
      setMode("interval"); setCount(1); setUnit("months");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inPopover = popoverRef.current?.contains(e.target);
      if (!inTrigger && !inPopover) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleOpen() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - 240);
      setPopoverPos({ top: rect.bottom + 4, left });
    }
    setOpen(o => !o);
  }

  function handleDone() {
    onChange(formatValue(mode, count, unit, special));
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setOpen(false);
  }

  function handleSpecialClick(s) {
    setMode("special");
    setSpecial(s);
  }

  const popover = (
    <div
      ref={popoverRef}
      style={{
        background: "#1a1f2e",
        border: "1px solid #a8a29c",
        borderRadius: "3px",
        left: popoverPos.left,
        padding: "0.75rem",
        position: "fixed",
        top: popoverPos.top,
        width: 220,
        zIndex: 9999,
      }}
    >
      {/* Interval row */}
      <div
        onClick={() => setMode("interval")}
        style={{
          alignItems: "center",
          background: mode === "interval" ? "#a8a29c" : "transparent",
          borderRadius: "2px",
          cursor: "pointer",
          display: "flex",
          gap: "0.4rem",
          marginBottom: "0.6rem",
          padding: "0.25rem 0.3rem",
        }}
      >
        <span style={{ color: "#8b7d6b", flexShrink: 0, fontFamily: "monospace", fontSize: "0.72rem" }}>Every</span>
        <input
          type="number"
          min={1}
          value={count}
          onChange={e => { setMode("interval"); setCount(Math.max(1, parseInt(e.target.value) || 1)); }}
          onClick={e => e.stopPropagation()}
          style={{ ...INPUT_STYLE, textAlign: "center", width: 44 }}
        />
        <select
          value={unit}
          onChange={e => { setMode("interval"); setUnit(e.target.value); }}
          onClick={e => e.stopPropagation()}
          style={{ ...INPUT_STYLE, cursor: "pointer", flex: 1 }}
        >
          <option value="days">Days</option>
          <option value="weeks">Weeks</option>
          <option value="months">Months</option>
          <option value="years">Years</option>
        </select>
      </div>

      {/* Special toggles */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem" }}>
        {["as needed", "every load"].map(s => {
          const active = mode === "special" && special === s;
          return (
            <button
              key={s}
              onMouseDown={e => { e.preventDefault(); handleSpecialClick(s); }}
              style={{
                background: active ? "#c9a96e18" : "transparent",
                border: `1px solid ${active ? "#c9a96e" : "#a8a29c"}`,
                borderRadius: "2px",
                color: active ? "#c9a96e" : "#8b7d6b",
                cursor: "pointer",
                flex: 1,
                fontFamily: "monospace",
                fontSize: "0.68rem",
                padding: "0.25rem 0.3rem",
              }}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onMouseDown={e => { e.preventDefault(); handleClear(); }}
          style={{
            background: "transparent",
            border: "1px solid #a8a29c",
            borderRadius: "2px",
            color: "#a8a29c",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: "0.72rem",
            padding: "0.25rem 0.6rem",
          }}
        >
          Clear
        </button>
        <button
          onMouseDown={e => { e.preventDefault(); handleDone(); }}
          style={{
            background: "#c9a96e18",
            border: "1px solid #c9a96e",
            borderRadius: "2px",
            color: "#c9a96e",
            cursor: "pointer",
            flex: 1,
            fontFamily: "monospace",
            fontSize: "0.72rem",
            padding: "0.25rem 0.6rem",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div ref={triggerRef} style={{ position: "relative" }}>
      <div onClick={handleOpen} style={{ cursor: "pointer", minHeight: "1.2em" }}>
        {value
          ? <ScheduleBadge schedule={value} />
          : <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem" }}>Schedule</span>
        }
      </div>
      {open && createPortal(popover, document.body)}
    </div>
  );
}
