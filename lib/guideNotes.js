const KEY = "foreman-guide-notes";

export function loadGuideNotes() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}

export function saveGuideNotes(notes) {
  localStorage.setItem(KEY, JSON.stringify(notes));
}
