const KEY = "foreman-item-details";

/**
 * Item Detail Shape (Phase 1):
 * {
 *   id: "system::item",              // composite key, e.g., "hvac::Furnace"
 *   name: "Furnace",                 // item name
 *   systemId: "hvac",                // system category
 *   manufacturer: "",                // mfr name
 *   model: "",                       // model number
 *   serial: "",                      // serial number
 *   installedDate: null,             // ISO string or null
 *   warrantyExpires: null,           // ISO string or null
 *   photoUrl: null,                  // data URL or URL
 *   notes: "",                       // user notes
 *   customFields: {}                 // custom field values keyed by fieldId
 * }
 *
 * Phase 2 (future):
 * - documents: [{ id, type, label, size, url }]
 * - specs: { fieldId: value }
 */

export function loadItemDetails() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return raw;
  } catch {
    return {};
  }
}

export function saveItemDetails(details) {
  localStorage.setItem(KEY, JSON.stringify(details));
}

/**
 * Get or create item detail record with Phase 1 shape
 */
export function getOrCreateItemDetail(systemId, itemName) {
  const details = loadItemDetails();
  const id = `${systemId}::${itemName}`;

  if (!details[id]) {
    details[id] = {
      id,
      name: itemName,
      systemId,
      manufacturer: "",
      model: "",
      serial: "",
      installedDate: null,
      warrantyExpires: null,
      photoUrl: null,
      notes: "",
      customFields: {},
    };
  }

  return details[id];
}

/**
 * Update item detail record
 */
export function updateItemDetail(systemId, itemName, updates) {
  const details = loadItemDetails();
  const id = `${systemId}::${itemName}`;

  if (!details[id]) {
    details[id] = getOrCreateItemDetail(systemId, itemName);
  }

  details[id] = {
    ...details[id],
    ...updates,
    id,  // never allow id to be overwritten
  };

  saveItemDetails(details);
  return details[id];
}

/**
 * Delete item detail record
 */
export function deleteItemDetail(systemId, itemName) {
  const details = loadItemDetails();
  const id = `${systemId}::${itemName}`;
  delete details[id];
  saveItemDetails(details);
}

/**
 * Migrate old item detail format to new shape if needed
 */
export function migrateItemDetails() {
  const details = loadItemDetails();
  let hasMigrated = false;

  Object.entries(details).forEach(([key, detail]) => {
    // If the detail doesn't have the new Phase 1 shape, upgrade it
    if (!detail.manufacturer && !detail.model && !detail.serial) {
      details[key] = {
        ...detail,
        manufacturer: detail.manufacturer || "",
        model: detail.model || "",
        serial: detail.serial || "",
        installedDate: detail.installedDate || null,
        warrantyExpires: detail.warrantyExpires || null,
        photoUrl: detail.photoUrl || null,
        notes: detail.notes || "",
        customFields: detail.customFields || {},
      };
      hasMigrated = true;
    }
  });

  if (hasMigrated) {
    saveItemDetails(details);
  }

  return details;
}
