import { forwardRef } from "react";
import DatePicker from "react-datepicker";

const Trigger = forwardRef(({ value, onClick }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    style={{
      background: "transparent",
      border: value ? "1px solid #a8a29c" : "1px dashed #a8a29c",
      borderRadius: "3px",
      color: value ? "#e8e4dd" : "#a8a29c",
      cursor: "pointer",
      fontFamily: "monospace",
      fontSize: "0.72rem",
      padding: "0.2rem 0.55rem",
      whiteSpace: "nowrap",
    }}
  >
    {value || "— set date —"}
  </button>
));

export default function DateCell({ date, onChange }) {
  return (
    <div style={{ alignItems: "center", display: "flex", gap: "0.25rem" }}>
      <DatePicker
        selected={date}
        onChange={onChange}
        dateFormat="MMM d, yyyy"
        customInput={<Trigger />}
        popperPlacement="bottom-start"
      />
      {date && (
        <button
          onClick={() => onChange(null)}
          title="Clear date"
          style={{
            background: "none",
            border: "none",
            color: "#a8a29c",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: "0.72rem",
            lineHeight: 1,
            padding: "0.1rem 0.2rem",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
          onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
        >×</button>
      )}
    </div>
  );
}
