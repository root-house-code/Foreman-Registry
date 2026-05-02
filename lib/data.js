import defaultData from "../data/maintenance.json";

const CUSTOM_KEY = "foreman-custom-data";
const OVERRIDES_KEY = "foreman-overrides";

export { defaultData };

export function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}"); }
  catch { return {}; }
}
export function saveOverrides(overrides) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}
export function loadCustomData() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]"); }
  catch { return []; }
}
export function saveCustomData(rows) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(rows));
}
export function loadData() {
  const overrides = loadOverrides();
  const customs = loadCustomData();
  const processed = defaultData.map((row, idx) => {
    const defaultKey = `${row.category}|${row.item}|${row.task}`;
    const override = overrides[defaultKey];
    return {
      ...(override ? { ...row, ...override } : row),
      _id: `default-${idx}`,
      _defaultKey: defaultKey,
      _isCustom: false,
    };
  });
  return [...processed, ...customs];
}
export function resetToDefault() {
  localStorage.removeItem(CUSTOM_KEY);
  localStorage.removeItem(OVERRIDES_KEY);
  localStorage.removeItem("foreman-deleted-categories");
  localStorage.removeItem("foreman-deleted-items");
}
