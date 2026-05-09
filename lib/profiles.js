// All localStorage keys included in a profile snapshot.
// Excluded: reminder/device config keys (discord-webhook, household-id, etc.)
// because those are account-level and should not change per profile.
export const PROFILE_DATA_KEYS = [
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
  "foreman-category-types",
  "foreman-inventory",
];

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
    }
    // "default": clearing all keys lets loadChores() re-seed from defaultChores
    // and exposes the full default maintenance data (no overrides or deletions).
  }

  localStorage.setItem("foreman-active-profile", targetKey);
  window.location.reload();
}
