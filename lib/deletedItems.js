const KEY = "foreman-deleted-items";

export function loadDeletedItems() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); }
  catch { return new Set(); }
}

export function saveDeletedItems(items) {
  localStorage.setItem(KEY, JSON.stringify([...items]));
}
