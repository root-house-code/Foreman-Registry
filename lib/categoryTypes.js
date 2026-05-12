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

// ─── Room subtypes ────────────────────────────────────────────────────────────

export const ROOM_SUBTYPES = [
  "Bedroom", "Bathroom", "Kitchen", "Living Room", "Dining Room",
  "Den", "Home Office", "Garage", "Basement", "Attic",
  "Laundry Room", "Crawl Space", "Utility Room", "Mudroom", "Foyer",
  "Sunroom", "Game Room", "Storage Room", "Outdoor / Yard",
];

const ROOM_SUBTYPES_KEY = "foreman-room-subtypes";

export function loadRoomSubtypes() {
  try { return JSON.parse(localStorage.getItem(ROOM_SUBTYPES_KEY) || "{}"); }
  catch { return {}; }
}
export function saveRoomSubtypes(subtypes) {
  localStorage.setItem(ROOM_SUBTYPES_KEY, JSON.stringify(subtypes));
}

// Returns "Name [Type]" if a subtype is set, otherwise just "Name".
export function formatRoomLabel(categoryName, roomSubtypes) {
  const subtype = roomSubtypes?.[categoryName];
  return subtype ? `${categoryName} [${subtype}]` : categoryName;
}

// ─── Room categories ──────────────────────────────────────────────────────────

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
