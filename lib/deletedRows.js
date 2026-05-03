const KEY = "foreman-deleted-rows";

export function loadDeletedRows() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); }
  catch { return new Set(); }
}

export function saveDeletedRows(rows) {
  localStorage.setItem(KEY, JSON.stringify([...rows]));
}
