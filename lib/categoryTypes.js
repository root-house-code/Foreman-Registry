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
