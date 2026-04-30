import { forwardRef } from "react";
import DatePicker from "react-datepicker";

const Trigger = forwardRef(({ value, onClick }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    style={{
      background: "transparent",
      border: value ? "1px solid #2e3448" : "1px dashed #2e3448",
      borderRadius: "3px",
      color: value ? "#d4c9b8" : "#3a3440",
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
    <DatePicker
      selected={date}
      onChange={onChange}
      dateFormat="MMM d, yyyy"
      customInput={<Trigger />}
      popperPlacement="bottom-start"
    />
  );
}
