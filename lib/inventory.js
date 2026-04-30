export function loadInventory() {
  try { return JSON.parse(localStorage.getItem("foreman-inventory") || "{}"); }
  catch { return {}; }
}

export function saveInventory(inv) {
  localStorage.setItem("foreman-inventory", JSON.stringify(inv));
}

export function getCategoryState(inv, category) {
  return inv[`cat:${category}`] ?? "included";
}

export function getOwnItemState(inv, category, item) {
  return inv[`item:${category}|${item}`] ?? "included";
}

// Parent always wins: if category is non-included, that state applies to all items beneath it.
export function getEffectiveRowState(inv, row) {
  const catState = getCategoryState(inv, row.category);
  if (catState !== "included") return catState;
  return getOwnItemState(inv, row.category, row.item);
}

export function setCategoryState(inv, category, state) {
  const key = `cat:${category}`;
  const next = { ...inv };
  state === "included" ? delete next[key] : (next[key] = state);
  return next;
}

export function setItemState(inv, category, item, state) {
  const key = `item:${category}|${item}`;
  const next = { ...inv };
  state === "included" ? delete next[key] : (next[key] = state);
  return next;
}

// Sets both the category and item to included so the row is guaranteed visible.
export function unmuteRow(inv, row) {
  let next = setCategoryState(inv, row.category, "included");
  next = setItemState(next, row.category, row.item, "included");
  return next;
}
