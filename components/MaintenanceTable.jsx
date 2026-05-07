import { useState } from "react";
import { createPortal } from "react-dom";
import ScheduleBadge from "./ScheduleBadge.jsx";
import DateCell from "./DateCell.jsx";
import FollowButton from "./FollowButton.jsx";
import ReminderButton from "./ReminderButton.jsx";
import NoteCell from "./NoteCell.jsx";
import ComboCell from "./ComboCell.jsx";
import SelectCell from "./SelectCell.jsx";
import SchedulePicker from "./SchedulePicker.jsx";
import Tooltip from "./Tooltip.jsx";
import { SEASON_OPTIONS } from "../lib/scheduleOptions.js";
import { CATEGORY_TIPS, ITEM_TIPS, TASK_TIPS } from "../lib/tooltips.js";

const COLUMNS = [
  { label: "Category",              width: "8%",  sortKey: "category"      },
  { label: "Item",                  width: "10%", sortKey: "item"          },
  { label: "Type of Maintenance",   width: "17%", sortKey: "task"          },
  { label: "Recommended Schedule",  width: "12%", sortKey: "schedule"      },
  { label: "Season",                width: "7%",  sortKey: "season"        },
  { label: "Last Completed On",     width: "12%", sortKey: "lastCompleted" },
  { label: "Next Maintenance Date", width: "13%", sortKey: "nextDate"      },
  { label: "Notes",                 width: "9%",  sortKey: "notes"         },
  { label: "",                      width: "4%",  sortKey: null            },
];

function rowKey(row) {
  return `${row.category}|${row.item}|${row.task}`;
}

function TaskCell({ value, onChange, tooltip }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function startEdit() {
    setDraft(value || "");
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    onChange(draft);
  }

  if (!editing) {
    return (
      <Tooltip text={tooltip}>
        <span
          onClick={startEdit}
          style={{
            color: value ? "#a89e8e" : "#3a3440",
            cursor: "text",
            display: "block",
            fontFamily: "inherit",
            fontSize: "inherit",
            minHeight: "1.2em",
          }}
        >
          {value || "Task"}
        </span>
      </Tooltip>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") setEditing(false);
      }}
      style={{
        background: "#1a1f2e",
        border: "1px solid #2e3448",
        borderRadius: "2px",
        color: "#e8e0d0",
        fontFamily: "inherit",
        fontSize: "inherit",
        outline: "none",
        padding: "0.2rem 0.4rem",
        width: "100%",
        boxSizing: "border-box",
      }}
    />
  );
}

export default function MaintenanceTable({
  rows,
  allRows,
  completedDates, onDateChange,
  nextDates, onNextDateChange,
  followSchedule, onToggleFollow,
  reminderModes, onCycleReminderMode,
  notes, onNoteChange,
  onRowEdit,
  onDeleteRow,
  sortCols, onHeaderClick,
  stickyTop,
}) {
  const [confirmRow, setConfirmRow] = useState(null);

  return (
    <div style={{
      background: "#13161f",
      border: "1px solid #1e2330",
      borderRadius: "6px",
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
        <thead>
          <tr>
            {COLUMNS.map(({ label, width, sortKey }) => {
              const sortIdx = (sortCols || []).findIndex(s => s.col === sortKey);
              const sortEntry = sortIdx !== -1 ? sortCols[sortIdx] : null;
              const isPrimary = sortIdx === 0;
              return (
                <th
                  key={label}
                  onClick={e => onHeaderClick?.(sortKey, e.shiftKey)}
                  style={{
                    background: "#1a1f2e",
                    borderBottom: "2px solid #2a2f3e",
                    color: "#c9a96e",
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontSize: "0.68rem",
                    fontWeight: "normal",
                    letterSpacing: "0.12em",
                    padding: "0.75rem 0.6rem",
                    position: "sticky",
                    textAlign: "left",
                    textTransform: "uppercase",
                    top: stickyTop ?? 0,
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    width,
                    zIndex: 10,
                  }}
                >
                  {label}
                  {sortEntry && (
                    <span style={{ color: isPrimary ? "#c9a96e" : "#5a5460", marginLeft: "0.3rem" }}>
                      {sortEntry.dir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isEven = idx % 2 === 0;
            const baseBg = isEven ? "#13161f" : "#161920";
            const key = rowKey(row);

            const categoryOptions = [...new Set((allRows || []).map(r => r.category).filter(Boolean))];
            const itemOptions = [...new Set((allRows || []).filter(r => r.category === row.category).map(r => r.item).filter(Boolean))];

            return (
              <tr
                key={row._id || key}
                style={{ background: baseBg, borderBottom: "1px solid #1e2330", transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#1e2430"}
                onMouseLeave={e => e.currentTarget.style.background = baseBg}
              >
                <td style={{ padding: "0.5rem 0.6rem", color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.03em", verticalAlign: "middle" }}>
                  <ComboCell
                    value={row.category}
                    options={categoryOptions}
                    placeholder="Category"
                    onChange={v => onRowEdit(row._id, "category", v)}
                    tooltip={!row._isCustom ? CATEGORY_TIPS[row.category] : undefined}
                  />
                </td>
                <td style={{ padding: "0.5rem 0.6rem", color: "#d4c9b8", verticalAlign: "middle" }}>
                  <ComboCell
                    value={row.item}
                    options={itemOptions}
                    placeholder="Item"
                    onChange={v => onRowEdit(row._id, "item", v)}
                    tooltip={!row._isCustom ? ITEM_TIPS[row.item] : undefined}
                  />
                </td>
                <td style={{ padding: "0.5rem 0.6rem", color: "#a89e8e", verticalAlign: "middle" }}>
                  <TaskCell
                    value={row.task}
                    onChange={v => onRowEdit(row._id, "task", v)}
                    tooltip={!row._isCustom ? TASK_TIPS[`${row.category}|${row.item}|${row.task}`] : undefined}
                  />
                </td>
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <SchedulePicker
                    value={row.schedule || null}
                    onChange={v => onRowEdit(row._id, "schedule", v)}
                  />
                </td>
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <SelectCell
                    value={row.season ?? null}
                    options={SEASON_OPTIONS}
                    placeholder="—"
                    onChange={v => onRowEdit(row._id, "season", v)}
                  />
                </td>
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <DateCell
                    date={completedDates[key] ?? null}
                    onChange={(date) => onDateChange(key, date)}
                  />
                </td>
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <div style={{ alignItems: "center", display: "flex", gap: "0.4rem" }}>
                    <DateCell
                      date={nextDates[key] ?? null}
                      onChange={(date) => onNextDateChange(key, date)}
                    />
                    <FollowButton
                      schedule={row.schedule}
                      checked={followSchedule[key] ?? false}
                      onToggle={() => onToggleFollow(key, row.schedule)}
                    />
                    <ReminderButton
                      schedule={row.schedule}
                      mode={reminderModes?.[key] ?? "off"}
                      onCycle={() => onCycleReminderMode?.(key)}
                    />
                  </div>
                </td>
                <td style={{ padding: "0.5rem 0.6rem", verticalAlign: "middle" }}>
                  <NoteCell
                    value={notes[key] ?? ""}
                    onChange={(text) => onNoteChange(key, text)}
                  />
                </td>
                <td style={{ padding: "0.5rem 0.4rem", textAlign: "center", verticalAlign: "middle" }}>
                  <button
                    onClick={() => setConfirmRow(row)}
                    title="Delete row"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#3a3440",
                      cursor: "pointer",
                      fontFamily: "monospace",
                      fontSize: "0.72rem",
                      padding: "0.1rem 0.3rem",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                    onMouseLeave={e => e.currentTarget.style.color = "#3a3440"}
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div style={{ color: "#5a5460", fontFamily: "monospace", fontSize: "0.82rem", padding: "3rem", textAlign: "center" }}>
          No results found.
        </div>
      )}

      {confirmRow && createPortal(
        <DeleteConfirmModal
          row={confirmRow}
          onConfirm={() => { onDeleteRow(confirmRow); setConfirmRow(null); }}
          onCancel={() => setConfirmRow(null)}
        />,
        document.body
      )}
    </div>
  );
}

function DeleteConfirmModal({ row, onConfirm, onCancel }) {
  const isCustom = row._isCustom;
  return (
    <div
      onClick={onCancel}
      style={{
        alignItems: "center",
        background: "rgba(0,0,0,0.6)",
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        left: 0,
        position: "fixed",
        right: 0,
        top: 0,
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0f1117",
          border: "1px solid #2e3448",
          borderRadius: "6px",
          maxWidth: "420px",
          padding: "1.75rem 2rem",
          width: "90%",
        }}
      >
        <div style={{ color: "#f87171", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.15em", marginBottom: "0.75rem", textTransform: "uppercase" }}>
          {isCustom ? "Permanently Delete Task" : "Remove from Schedule"}
        </div>
        <p style={{ color: "#a89e8e", fontFamily: "monospace", fontSize: "0.78rem", lineHeight: 1.6, margin: "0 0 0.5rem" }}>
          <strong style={{ color: "#d4c9b8" }}>{row.task}</strong>
        </p>
        <p style={{ color: "#5a5460", fontFamily: "monospace", fontSize: "0.72rem", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
          {isCustom
            ? "This will permanently delete this task. This cannot be undone."
            : "This will remove this task from your maintenance schedule. You can restore it anytime from the Guide page."}
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "1px solid #2e3448",
              borderRadius: "4px",
              color: "#5a5460",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: "0.72rem",
              padding: "0.4rem 1rem",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a4458"; e.currentTarget.style.color = "#8b7d6b"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2e3448"; e.currentTarget.style.color = "#5a5460"; }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: "#f8717118",
              border: "1px solid #f87171",
              borderRadius: "4px",
              color: "#f87171",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: "0.72rem",
              padding: "0.4rem 1rem",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f8717130"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#f8717118"; }}
          >
            {isCustom ? "Delete" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}
