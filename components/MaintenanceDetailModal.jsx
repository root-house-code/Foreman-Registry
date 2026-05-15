import { createPortal } from "react-dom";

export default function MaintenanceDetailModal({ row, note, onNoteChange, onClose }) {
  return createPortal(
    <div
      onClick={onClose}
      style={{
        alignItems: "center",
        background: "rgba(0,0,0,0.65)",
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        left: 0,
        position: "fixed",
        right: 0,
        top: 0,
        zIndex: 1100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--fm-bg-panel)",
          border: "var(--fm-border)",
          borderRadius: "var(--fm-radius-lg)",
          display: "flex",
          flexDirection: "column",
          maxWidth: "480px",
          padding: "1.5rem 1.75rem",
          width: "90%",
        }}
      >
        {/* Header */}
        <div style={{ alignItems: "flex-start", display: "flex", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ color: "var(--fm-brass-dim)", fontFamily: "var(--fm-mono)", fontSize: "0.6rem", letterSpacing: "0.14em", marginBottom: "0.3rem", textTransform: "uppercase" }}>
              {row.category}
            </div>
            <div style={{ color: "var(--fm-ink)", fontFamily: "var(--fm-serif)", fontSize: "1rem" }}>
              {row.item}
            </div>
            <div style={{ color: "var(--fm-ink-dim)", fontFamily: "var(--fm-sans)", fontSize: "0.8rem", marginTop: "0.2rem" }}>
              {row.task}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--fm-ink-dim)",
              cursor: "pointer",
              fontSize: "1.1rem",
              lineHeight: 1,
              marginLeft: "1rem",
              padding: "0.1rem 0.3rem",
              transition: "color 0.12s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--fm-ink)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--fm-ink-dim)"}
          >
            ×
          </button>
        </div>

        {/* Notes field */}
        <div>
          <label style={{ color: "var(--fm-brass-dim)", display: "block", fontFamily: "var(--fm-mono)", fontSize: "0.6rem", letterSpacing: "0.14em", marginBottom: "0.5rem", textTransform: "uppercase" }}>
            Notes
          </label>
          <textarea
            value={note}
            onChange={e => onNoteChange(e.target.value)}
            placeholder="Add notes about this maintenance task…"
            rows={5}
            style={{
              background: "var(--fm-bg-sunk)",
              border: "1px solid var(--fm-hairline2)",
              borderRadius: "var(--fm-radius)",
              boxSizing: "border-box",
              color: "var(--fm-ink)",
              fontFamily: "var(--fm-sans)",
              fontSize: "0.82rem",
              lineHeight: 1.6,
              outline: "none",
              padding: "0.6rem 0.75rem",
              resize: "vertical",
              transition: "border-color 0.12s",
              width: "100%",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--fm-brass)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--fm-hairline2)"}
          />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "var(--fm-border-2)",
              borderRadius: "var(--fm-radius)",
              color: "var(--fm-ink-dim)",
              cursor: "pointer",
              fontFamily: "var(--fm-mono)",
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              padding: "0.4rem 1.1rem",
              transition: "all 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--fm-brass)"; e.currentTarget.style.color = "var(--fm-brass)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--fm-hairline2)"; e.currentTarget.style.color = "var(--fm-ink-dim)"; }}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
