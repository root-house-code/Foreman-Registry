const HIDDEN_KEY = "foreman-hidden-rows";

export function loadHiddenRows() {
  try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]")); }
  catch { return new Set(); }
}

export function saveHiddenRows(hidden) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
}
