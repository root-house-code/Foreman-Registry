import { loadData } from "./data.js";
import { loadDeletedCategories } from "./deletedCategories.js";

const KEY = "foreman-category-types";

export const GROUP_ORDER = ["room", "system", "structure", "exterior", "safety", "general"];

export const GROUP_LABELS = {
  system:    "Systems",
  structure: "Structure",
  room:      "Rooms",
  exterior:  "Exterior",
  safety:    "Safety",
  general:   "General",
};

export function loadCategoryTypeOverrides() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}

export function saveCategoryTypeOverrides(overrides) {
  localStorage.setItem(KEY, JSON.stringify(overrides));
}

export function loadRoomCategories() {
  const rows = loadData();
  const overrides = loadCategoryTypeOverrides();
  const deletedCategories = loadDeletedCategories();
  const typeMap = {};
  rows.forEach(row => {
    if (!row.category || !row.categoryType) return;
    if (!row._isCustom && deletedCategories.has(row.category)) return;
    // Custom rows take priority over default rows so user-created categories
    // placed in "Rooms" aren't overridden by a same-named default category.
    if (!typeMap[row.category] || row._isCustom) {
      typeMap[row.category] = row.categoryType;
    }
  });
  return Object.keys(typeMap)
    .filter(cat => (overrides[cat] ?? typeMap[cat]) === "room");
}
