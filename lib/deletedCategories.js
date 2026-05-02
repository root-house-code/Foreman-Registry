const KEY = "foreman-deleted-categories";

export function loadDeletedCategories() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); }
  catch { return new Set(); }
}

export function saveDeletedCategories(cats) {
  localStorage.setItem(KEY, JSON.stringify([...cats]));
}
