const KEY = "foreman-item-details";

export function loadItemDetails() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}

export function saveItemDetails(details) {
  localStorage.setItem(KEY, JSON.stringify(details));
}
