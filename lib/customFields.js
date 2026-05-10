const CAT_KEY  = "foreman-category-field-schemas";
const ITEM_KEY = "foreman-item-field-schemas";
const VAL_KEY  = "foreman-custom-field-values";

export function loadCategoryFieldSchemas() {
  try { return JSON.parse(localStorage.getItem(CAT_KEY)  || "{}"); } catch { return {}; }
}
export function saveCategoryFieldSchemas(d) {
  localStorage.setItem(CAT_KEY, JSON.stringify(d));
}

export function loadItemFieldSchemas() {
  try { return JSON.parse(localStorage.getItem(ITEM_KEY) || "{}"); } catch { return {}; }
}
export function saveItemFieldSchemas(d) {
  localStorage.setItem(ITEM_KEY, JSON.stringify(d));
}

export function loadCustomFieldValues() {
  try { return JSON.parse(localStorage.getItem(VAL_KEY)  || "{}"); } catch { return {}; }
}
export function saveCustomFieldValues(d) {
  localStorage.setItem(VAL_KEY, JSON.stringify(d));
}
