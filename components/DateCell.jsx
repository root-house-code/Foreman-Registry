import { forwardRef } from "react";
import DatePicker from "react-datepicker";

const Trigger = forwardRef(({ value, onClick }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    style={{
      background: "transparent",
      border: value ? "1px solid #6b6560" : "1px dashed #6b6560",
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
    <DatePicker
      selected={date}
      onChange={onChange}
      dateFormat="MMM d, yyyy"
      customInput={<Trigger />}
      popperPlacement="bottom-start"
    />
  );
}
