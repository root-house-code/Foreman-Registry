export function loadMaintenanceStartDates() {
  return JSON.parse(localStorage.getItem("maintenance-start-dates") || "{}");
}
export function saveMaintenanceStartDates(obj) {
  localStorage.setItem("maintenance-start-dates", JSON.stringify(obj));
}
export function maintenanceKey(row) {
  return `${row.category}|${row.item}|${row.task}`;
}
