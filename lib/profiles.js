// All localStorage keys included in a profile snapshot.
// Excluded: foreman-household-id and foreman-sync-secret — device identity keys
// used to authenticate with the reminder Worker; must not vary per profile.
export const PROFILE_DATA_KEYS = [
  // Inventory & maintenance
  "foreman-chores",
  "chore-next-dates",
  "chore-completed-dates",
  "chore-notes",
  "foreman-todos",
  "foreman-projects",
  "foreman-custom-data",
  "foreman-overrides",
  "foreman-deleted-categories",
  "foreman-deleted-items",
  "foreman-deleted-rows",
  "foreman-hidden-rows",
  "maintenance-dates",
  "maintenance-next-dates",
  "maintenance-start-dates",
  "maintenance-notes",
  "maintenance-follow",
  "foreman-item-details",
  "foreman-category-field-schemas",
  "foreman-item-field-schemas",
  "foreman-custom-field-values",
  "foreman-category-types",
  "foreman-room-subtypes",
  "foreman-inventory",
  "foreman-guide-notes",
  "foreman-use-default-data",
  // Per-task reminder settings
  "foreman-reminder-modes",
  "foreman-chore-reminder-modes",
  // Chore per-occurrence completions
  "foreman-chore-done-dates",
  // Preferences / household settings
  "foreman-household-address",
  "foreman-household-members",
  "foreman-discord-webhook",
  "foreman-send-hour-local",
  "foreman-lead-days",
  "foreman-timezone",
  "foreman-inspection-meta",
];

// Built-in profiles — always present, cannot be renamed or deleted.
export const PROFILES = [
  {
    key: "foreman",
    label: "Foreman",
    description: "Your personal profile. All changes you've made — chores, maintenance tracking, to dos, projects, and inventory — are saved here in this browser.",
  },
  {
    key: "default",
    label: "Default Profile",
    description: "The out-of-the-box Foreman experience. All pre-built maintenance tasks and default chores are included, with no personal changes applied.",
  },
  {
    key: "new",
    label: "New Profile",
    description: "A completely blank slate. No pre-built tasks or chores. Start fresh and build your own setup from scratch.",
  },
];

// ─── User-created profiles ────────────────────────────────────────────────────

const USER_PROFILES_KEY = "foreman-user-profiles";

export function loadUserProfiles() {
  try { return JSON.parse(localStorage.getItem(USER_PROFILES_KEY) || "[]"); }
  catch { return []; }
}

function saveUserProfiles(profiles) {
  localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(profiles));
}

export function getAllProfiles() {
  return [...PROFILES, ...loadUserProfiles()];
}

// Create a new user profile, store its snapshot, and immediately switch to it.
// snap: a complete PROFILE_DATA_KEYS object (null values = key absent in localStorage).
// Callers build snap from defaultData so this module doesn't need to import data.js.
export function createProfile(name, snap) {
  const key  = `user-${Date.now()}`;
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const userProfiles = loadUserProfiles();
  userProfiles.push({ key, label: name, description: `Custom profile created ${date}.`, isUser: true });
  saveUserProfiles(userProfiles);
  localStorage.setItem(`foreman-snapshot-${key}`, JSON.stringify(snap));
  switchProfile(key);
}

export function deleteUserProfile(key) {
  const activeKey = loadActiveProfile();
  saveUserProfiles(loadUserProfiles().filter(p => p.key !== key));
  localStorage.removeItem(`foreman-snapshot-${key}`);
  if (activeKey === key) switchProfile("foreman");
}

export function renameUserProfile(key, newName) {
  const trimmed = newName.trim();
  if (!trimmed) return;
  const userProfiles = loadUserProfiles();
  const p = userProfiles.find(p => p.key === key);
  if (p) p.label = trimmed;
  saveUserProfiles(userProfiles);
}

// ─── Core profile operations ──────────────────────────────────────────────────

export function loadActiveProfile() {
  return localStorage.getItem("foreman-active-profile") || "foreman";
}

function snapshotToStorage(profileKey) {
  const snap = {};
  for (const k of PROFILE_DATA_KEYS) {
    snap[k] = localStorage.getItem(k); // null if key absent
  }
  localStorage.setItem(`foreman-snapshot-${profileKey}`, JSON.stringify(snap));
}

export function switchProfile(targetKey) {
  const currentKey = loadActiveProfile();

  // Save current live state as the current profile's snapshot.
  snapshotToStorage(currentKey);

  // Restore target profile from its snapshot (if one exists).
  const snapStr = localStorage.getItem(`foreman-snapshot-${targetKey}`);
  if (snapStr) {
    const snap = JSON.parse(snapStr);
    for (const k of PROFILE_DATA_KEYS) {
      if (snap[k] == null) {
        localStorage.removeItem(k);
      } else {
        localStorage.setItem(k, snap[k]);
      }
    }
  } else {
    // No snapshot yet — build the initial state for this profile.
    for (const k of PROFILE_DATA_KEYS) localStorage.removeItem(k);

    if (targetKey === "new") {
      // Prevent loadChores() from auto-seeding default chores on next load.
      localStorage.setItem("foreman-chores", JSON.stringify([]));
      // Blank slate: exclude default maintenance data from loadData().
      localStorage.setItem("foreman-use-default-data", JSON.stringify(false));
    }
    // "default": clearing all keys lets loadChores() re-seed from defaultChores
    // and exposes the full default maintenance data (no overrides or deletions).
  }

  localStorage.setItem("foreman-active-profile", targetKey);
  window.location.reload();
}

// Returns the data object for a profile.
// Active profile → reads live localStorage. Non-active → reads stored snapshot.
// Returns null if the profile has no snapshot and is not active.
export function getProfileData(profileKey) {
  const activeKey = loadActiveProfile();
  if (profileKey === activeKey) {
    const data = {};
    for (const k of PROFILE_DATA_KEYS) data[k] = localStorage.getItem(k);
    return data;
  }
  const snapStr = localStorage.getItem(`foreman-snapshot-${profileKey}`);
  return snapStr ? JSON.parse(snapStr) : null;
}

// True if a profile has data available to export.
export function hasProfileSnapshot(profileKey) {
  return getProfileData(profileKey) !== null;
}

// Triggers a browser download of a profile's data as a JSON backup file.
// Returns false if the profile has no data.
export function exportProfile(profileKey) {
  const data = getProfileData(profileKey);
  if (!data) return false;

  const meta    = getAllProfiles().find(p => p.key === profileKey);
  const payload = {
    _foreman:   true,
    version:    1,
    profile:    profileKey,
    label:      meta?.label ?? profileKey,
    exportedAt: new Date().toISOString(),
    data,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `foreman-${profileKey}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

// Validates and loads imported JSON into a target profile slot.
// Returns an error string on failure, or null on success.
// If the target is the active profile, also restores live data and reloads.
export function importProfileData(parsedJson, targetProfileKey) {
  if (!parsedJson?._foreman || parsedJson.version !== 1 || typeof parsedJson.data !== "object") {
    return "Invalid file — make sure you're importing a Foreman backup.";
  }

  const snap = {};
  for (const k of PROFILE_DATA_KEYS) snap[k] = parsedJson.data[k] ?? null;

  localStorage.setItem(`foreman-snapshot-${targetProfileKey}`, JSON.stringify(snap));

  // If the target is live, restore immediately and reload.
  if (targetProfileKey === loadActiveProfile()) {
    for (const k of PROFILE_DATA_KEYS) {
      if (snap[k] == null) localStorage.removeItem(k);
      else localStorage.setItem(k, snap[k]);
    }
    window.location.reload();
  }

  return null;
}
