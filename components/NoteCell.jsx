export default function NoteCell({ value, onChange }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Add note…"
      style={{
        background: "transparent",
        border: "1px solid transparent",
        borderRadius: "3px",
        boxSizing: "border-box",
        color: "#a89e8e",
        fontFamily: "monospace",
        fontSize: "0.72rem",
        outline: "none",
        padding: "0.2rem 0.4rem",
        width: "100%",
      }}
      onFocus={e => e.target.style.borderColor = "#6b6560"}
      onBlur={e => e.target.style.borderColor = "transparent"}
    />
  );
}
