const KEY = "foreman-chore-done-dates";

// Key format: "choreId:YYYY-MM-DD"
export function choreOccurrenceKey(choreId, date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${choreId}:${y}-${m}-${day}`;
}

export function loadChoreCompletions() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}

export function saveChoreCompletions(completions) {
  localStorage.setItem(KEY, JSON.stringify(completions));
}

export function isChoreCompleted(completions, choreId, date) {
  return !!completions[choreOccurrenceKey(choreId, date)];
}

export function toggleChoreCompletion(completions, choreId, date) {
  const k = choreOccurrenceKey(choreId, date);
  const next = { ...completions };
  if (next[k]) delete next[k];
  else next[k] = true;
  return next;
}
