import { useState, useRef } from "react";
import { createPortal } from "react-dom";

export default function Tooltip({ children, text }) {
  const [pos, setPos] = useState(null);
  const wrapperRef = useRef(null);

  if (!text) return children;

  function handleMouseEnter() {
    const el = wrapperRef.current?.firstElementChild;
    if (el) {
      const r = el.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top, bottom: r.bottom });
    }
  }

  const showBelow = pos && pos.y < 60;

  return (
    <>
      <span ref={wrapperRef} style={{ display: "contents" }} onMouseEnter={handleMouseEnter} onMouseLeave={() => setPos(null)}>
        {children}
      </span>
      {pos && createPortal(
        <div style={{
          background: "#13161f",
          border: "1px solid #6b6560",
          borderRadius: "4px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          color: "#a89e8e",
          fontFamily: "monospace",
          fontSize: "0.71rem",
          left: pos.x,
          lineHeight: 1.6,
          maxWidth: 280,
          padding: "0.45rem 0.65rem",
          pointerEvents: "none",
          position: "fixed",
          top: showBelow ? pos.bottom + 8 : pos.y - 8,
          transform: showBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)",
          whiteSpace: "normal",
          width: "max-content",
          zIndex: 9999,
        }}>
          {text}
        </div>,
        document.body
      )}
    </>
  );
}
