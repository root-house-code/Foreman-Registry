import { loadData } from "./data.js";

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
  const defaultTypes = {};
  rows.forEach(row => {
    if (row.category && !(row.category in defaultTypes)) {
      defaultTypes[row.category] = row.categoryType ?? "general";
    }
  });
  return Object.keys(defaultTypes)
    .filter(cat => (overrides[cat] ?? defaultTypes[cat]) === "room");
}
