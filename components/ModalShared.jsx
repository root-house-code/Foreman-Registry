import { forwardRef } from "react";

export const PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };

export const STATUS_COLUMNS = [
  { key: "not-started", label: "Not Started" },
  { key: "in-progress", label: "In Progress" },
  { key: "done",        label: "Done" },
];

export const fieldLabel = {
  color: "#a8a29c",
  display: "block",
  fontFamily: "monospace",
  fontSize: "0.6rem",
  letterSpacing: "0.12em",
  marginBottom: "0.3rem",
  textTransform: "uppercase",
};

export const fieldInput = {
  background: "#13161f",
  border: "1px solid #a8a29c",
  borderRadius: "3px",
  boxSizing: "border-box",
  color: "#e8e4dd",
  fontFamily: "monospace",
  fontSize: "0.78rem",
  outline: "none",
  padding: "0.35rem 0.5rem",
  width: "100%",
};

export const fieldSelect = { ...fieldInput, cursor: "pointer" };

export const DueDateBtn = forwardRef(({ value, onClick }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    style={{ ...fieldInput, cursor: "pointer", color: value ? "#e8e4dd" : "#a8a29c", textAlign: "left" }}
  >
    {value || "No date"}
  </button>
));
