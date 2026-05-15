import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import FmHeader from "./src/components/FmHeader.jsx";
import {
  PROFILES, PROFILE_DATA_KEYS,
  getAllProfiles, loadUserProfiles,
  loadActiveProfile, switchProfile,
  exportProfile, importProfileData, hasProfileSnapshot,
  createProfile, deleteUserProfile, renameUserProfile,
} from "./lib/profiles.js";
import { defaultData, loadCustomData, saveCustomData } from "./lib/data.js";
import { loadDeletedCategories } from "./lib/deletedCategories.js";
import { loadDeletedItems } from "./lib/deletedItems.js";
import { loadCustomFieldValues, saveCustomFieldValues } from "./lib/customFields.js";
import { extractPdfText, renderSpecificPages, chunkPageTexts } from "./lib/pdfExtract.js";
import { extractChunk, mergeResults, resolveAppliance, associateImages } from "./lib/inspectionGroq.js";
import { storeImageFromDataUrl } from "./lib/images.js";
import { loadTodos, saveTodos, createTodo } from "./lib/todos.js";
import { loadProjects, saveProjects, createProject } from "./lib/projects.js";
import { loadCategoryTypeOverrides, saveCategoryTypeOverrides } from "./lib/categoryTypes.js";
import InspectionReview from "./components/InspectionReview.jsx";
import {
  getWebhookUrl, setWebhookUrl,
  getSendHourLocal, setSendHourLocal,
  getLeadDays, setLeadDays,
  formatHour12,
} from "./lib/reminders.js";

// ─── Settings nav items ───────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: "profile",        label: "Profile",           available: true  },
  { key: "household",      label: "Household",          available: true  },
  { key: "notifications",  label: "Notifications",      available: true  },
  { key: "integrations",   label: "Integrations",       available: true  },
  { key: "inspection",     label: "Upload Inspection",  available: true  },
];

const INSPECTION_META_KEY   = "foreman-inspection-meta";
const HOUSEHOLD_ADDRESS_KEY = "foreman-household-address";
const HOUSEHOLD_MEMBERS_KEY = "foreman-household-members";

const EMPTY_ADDRESS = { street: "", street2: "", city: "", state: "", zip: "" };

function loadAddress() {
  try { return { ...EMPTY_ADDRESS, ...JSON.parse(localStorage.getItem(HOUSEHOLD_ADDRESS_KEY) || "{}") }; }
  catch { return { ...EMPTY_ADDRESS }; }
}

function saveAddress(addr) {
  localStorage.setItem(HOUSEHOLD_ADDRESS_KEY, JSON.stringify(addr));
}

function loadMembers() {
  try { return JSON.parse(localStorage.getItem(HOUSEHOLD_MEMBERS_KEY) || "[]"); }
  catch { return []; }
}

function saveMembers(members) {
  localStorage.setItem(HOUSEHOLD_MEMBERS_KEY, JSON.stringify(members));
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelStyle = {
  color: "#a8a29c", display: "block", fontFamily: "monospace",
  fontSize: "0.62rem", letterSpacing: "0.1em", marginBottom: "0.4rem", textTransform: "uppercase",
};

const selectStyle = {
  appearance: "none",
  background: "#1a1f2e",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a5460'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.75rem center",
  border: "1px solid #a8a29c",
  borderRadius: "4px",
  boxSizing: "border-box",
  color: "#e8e4dd",
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: "0.82rem",
  outline: "none",
  padding: "0.5rem 2rem 0.5rem 0.75rem",
  width: "220px",
};

const subheadStyle = {
  color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.62rem",
  letterSpacing: "0.12em", marginBottom: "0.5rem", textTransform: "uppercase",
};

const bodyTextStyle = {
  color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem",
  lineHeight: 1.55, margin: "0 0 0.9rem",
};

function inputStyle(focused) {
  return {
    background: "#1a1f2e",
    border: `1px solid ${focused ? "#c9a96e" : "#a8a29c"}`,
    borderRadius: "4px",
    boxSizing: "border-box",
    color: "#e8e4dd",
    fontFamily: "monospace",
    fontSize: "0.82rem",
    outline: "none",
    padding: "0.5rem 0.75rem",
    width: "100%",
  };
}

// ─── ProfileSettings ──────────────────────────────────────────────────────────

function ProfileSettings() {
  const [activeProfile]  = useState(() => loadActiveProfile());
  const [allProfiles, setAllProfiles] = useState(() => getAllProfiles());
  const activeMeta = allProfiles.find(p => p.key === activeProfile);

  // ── Profile switcher ──
  const [selected, setSelected]   = useState(activeProfile);
  const [switching, setSwitching] = useState(false);
  const selectedMeta = allProfiles.find(p => p.key === selected);
  const isDirty      = selected !== activeProfile;
  const isUserProfile = selectedMeta?.isUser === true;

  function handleSwitch() { setSwitching(true); switchProfile(selected); }
  function handleCancelSwitch() { setSelected(activeProfile); }

  // ── Rename ──
  const [renamingKey, setRenamingKey]   = useState(null);
  const [renameValue, setRenameValue]   = useState("");
  const [renameFocused, setRenameFocused] = useState(false);

  function handleStartRename() {
    setRenamingKey(selected);
    setRenameValue(selectedMeta?.label ?? "");
  }

  function handleCommitRename() {
    if (renamingKey && renameValue.trim()) {
      renameUserProfile(renamingKey, renameValue.trim());
      setAllProfiles(getAllProfiles());
    }
    setRenamingKey(null);
  }

  // ── Delete ──
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDeleteProfile() {
    setConfirmDelete(false);
    deleteUserProfile(selected);
    // deleteUserProfile reloads if active; otherwise update local list.
    if (selected !== activeProfile) {
      setAllProfiles(getAllProfiles());
      setSelected(activeProfile);
    }
  }

  // ── Create new profile ──
  const [showCreate, setShowCreate]     = useState(false);
  const [newName, setNewName]           = useState("");
  const [seedInventory, setSeedInventory] = useState(true);
  const [seedTasks, setSeedTasks]       = useState(true);
  const [creating, setCreating]         = useState(false);
  const [nameFocused, setNameFocused]   = useState(false);

  function buildSnap() {
    const snap = {};
    for (const k of PROFILE_DATA_KEYS) snap[k] = null;
    snap["foreman-chores"]           = JSON.stringify([]);
    snap["foreman-todos"]            = JSON.stringify([]);
    snap["foreman-projects"]         = JSON.stringify([]);
    snap["foreman-use-default-data"] = JSON.stringify(seedInventory);

    if (seedInventory && !seedTasks) {
      const taskKeys = defaultData
        .filter(r => r.category && r.item && r.task)
        .map(r => `${r.category}|${r.item}|${r.task}`);
      snap["foreman-deleted-rows"] = JSON.stringify(taskKeys);
    }
    return snap;
  }

  function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    createProfile(newName.trim(), buildSnap());
    // createProfile calls switchProfile which reloads — no further state needed.
  }

  function handleCancelCreate() {
    setShowCreate(false);
    setNewName("");
    setSeedInventory(true);
    setSeedTasks(true);
  }

  // ── Export ──
  const [exportTarget, setExportTarget] = useState(activeProfile);
  const exportHasData = hasProfileSnapshot(exportTarget);

  // ── Import ──
  const fileInputRef                      = useRef(null);
  const [importFile, setImportFile]       = useState(null);
  const [importTarget, setImportTarget]   = useState(activeProfile);
  const [importing, setImporting]         = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (!parsed?._foreman || parsed.version !== 1) { setImportFile("error"); return; }
        setImportFile({ name: file.name, data: parsed });
        setImportSuccess(false);
      } catch {
        setImportFile("error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleImport() {
    if (!importFile || importFile === "error") return;
    setImporting(true);
    const err = importProfileData(importFile.data, importTarget);
    if (err) {
      setImportFile("error");
      setImporting(false);
    } else if (importTarget !== activeProfile) {
      setImportFile(null);
      setImporting(false);
      setImportSuccess(true);
    }
  }

  function handleCancelImport() {
    setImportFile(null);
    setImporting(false);
    setImportTarget(activeProfile);
  }

  const importTargetMeta = allProfiles.find(p => p.key === importTarget);

  return (
    <div style={{ maxWidth: "560px" }}>
      <h2 style={{ color: "#e8e4dd", fontFamily: "'Georgia','Times New Roman',serif", fontSize: "1.25rem", fontWeight: "normal", margin: "0 0 0.3rem" }}>Profile</h2>
      <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.75rem", margin: "0 0 2rem" }}>
        Switch between profiles to use different data sets. Each profile's data is saved independently — switching away and back restores it exactly as you left it.
      </p>

      {/* ── Active profile selector ── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={labelStyle}>Active Profile</label>
        <select
          value={selected}
          onChange={e => { setSelected(e.target.value); setSwitching(false); setRenamingKey(null); setConfirmDelete(false); }}
          style={selectStyle}
        >
          {allProfiles.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>

      {/* Profile description card */}
      <div style={{ background: "#13161f", border: "1px solid #1e2330", borderRadius: "4px", marginBottom: "1.5rem", padding: "0.9rem 1rem" }}>
        {renamingKey === selected ? (
          <input
            autoFocus
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onFocus={() => setRenameFocused(true)}
            onBlur={() => { setRenameFocused(false); handleCommitRename(); }}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); handleCommitRename(); }
              if (e.key === "Escape") { e.preventDefault(); setRenamingKey(null); }
            }}
            style={{ ...inputStyle(renameFocused), marginBottom: "0.35rem" }}
          />
        ) : (
          <div style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.12em", marginBottom: "0.35rem", textTransform: "uppercase" }}>
            {selectedMeta?.label}
          </div>
        )}
        <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.78rem", lineHeight: 1.55, margin: 0 }}>
          {selectedMeta?.description}
        </p>
        <div style={{ alignItems: "center", display: "flex", gap: "0.75rem", marginTop: "0.6rem" }}>
          {selected === activeProfile && (
            <div style={{ alignItems: "center", display: "flex", gap: "0.4rem" }}>
              <span style={{ background: "#c9a96e", borderRadius: "50%", display: "inline-block", height: "6px", width: "6px" }} />
              <span style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.08em" }}>Currently active</span>
            </div>
          )}
          {isUserProfile && (
            <>
              <button
                onClick={handleStartRename}
                style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.05em", padding: 0, transition: "color 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#c9a96e"}
                onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
              >Rename</button>
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.05em", padding: 0, transition: "color 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
              >Delete</button>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{ background: "#1a1f2e", border: "1px solid #f8717140", borderRadius: "4px", marginBottom: "1.5rem", padding: "1rem 1.1rem" }}>
          <div style={{ color: "#f87171", fontFamily: "monospace", fontSize: "0.78rem", marginBottom: "0.4rem" }}>
            Delete "{selectedMeta?.label}"?
          </div>
          <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem", lineHeight: 1.5, margin: "0 0 0.9rem" }}>
            {selected === activeProfile
              ? "This will delete the profile and switch you to Foreman. This cannot be undone."
              : "All saved data for this profile will be permanently removed. This cannot be undone."}
          </p>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              onClick={handleDeleteProfile}
              style={{ background: "#f8717118", border: "1px solid #f8717140", borderRadius: "3px", color: "#f87171", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem", letterSpacing: "0.05em", padding: "0.45rem 1.1rem", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f8717130"; e.currentTarget.style.borderColor = "#f87171"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#f8717118"; e.currentTarget.style.borderColor = "#f8717140"; }}
            >Delete</button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ background: "transparent", border: "1px solid #a8a29c", borderRadius: "3px", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem", padding: "0.45rem 1rem", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#8b7d6b"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#a8a29c"; }}
            >Cancel</button>
          </div>
        </div>
      )}

      {/* Inline switch confirmation */}
      {isDirty && !confirmDelete && (
        <div style={{ background: "#1a1f2e", border: "1px solid #a8a29c", borderRadius: "4px", marginBottom: "1.5rem", padding: "1rem 1.1rem" }}>
          <div style={{ color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.78rem", marginBottom: "0.4rem" }}>
            Switch to <strong style={{ color: "#c9a96e" }}>{selectedMeta?.label}</strong>?
          </div>
          <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem", lineHeight: 1.5, margin: "0 0 0.9rem" }}>
            Your current <strong style={{ color: "#8b7d6b" }}>{activeMeta?.label}</strong> data will be saved automatically. The page will reload with {selectedMeta?.label} data.
          </p>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              onClick={handleSwitch} disabled={switching}
              style={{ background: switching ? "transparent" : "#c9a96e22", border: `1px solid ${switching ? "#a8a29c" : "#c9a96e"}`, borderRadius: "3px", color: switching ? "#a8a29c" : "#c9a96e", cursor: switching ? "default" : "pointer", fontFamily: "monospace", fontSize: "0.75rem", letterSpacing: "0.05em", padding: "0.45rem 1.1rem", transition: "all 0.15s" }}
              onMouseEnter={e => { if (!switching) e.currentTarget.style.background = "#c9a96e35"; }}
              onMouseLeave={e => { if (!switching) e.currentTarget.style.background = "#c9a96e22"; }}
            >
              {switching ? "Switching…" : `Switch to ${selectedMeta?.label}`}
            </button>
            <button
              onClick={handleCancelSwitch} disabled={switching}
              style={{ background: "transparent", border: "1px solid #a8a29c", borderRadius: "3px", color: "#a8a29c", cursor: switching ? "default" : "pointer", fontFamily: "monospace", fontSize: "0.75rem", padding: "0.45rem 1rem", transition: "all 0.15s" }}
              onMouseEnter={e => { if (!switching) { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#8b7d6b"; } }}
              onMouseLeave={e => { if (!switching) { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#a8a29c"; } }}
            >Cancel</button>
          </div>
        </div>
      )}

      {/* ── Create new profile ── */}
      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          style={{ background: "transparent", border: "1px solid #1e2330", borderRadius: "3px", color: "#8b7d6b", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.05em", marginBottom: "2rem", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#c9a96e"; e.currentTarget.style.color = "#c9a96e"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2330"; e.currentTarget.style.color = "#8b7d6b"; }}
        >+ New Profile</button>
      ) : (
        <div style={{ background: "#13161f", border: "1px solid #1e2330", borderRadius: "4px", marginBottom: "2rem", padding: "1rem 1.1rem" }}>
          <div style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.12em", marginBottom: "0.85rem", textTransform: "uppercase" }}>New Profile</div>

          <div style={{ marginBottom: "0.85rem" }}>
            <label style={labelStyle}>Profile Name</label>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              placeholder="e.g. Rental Property"
              onKeyDown={e => {
                if (e.key === "Enter" && newName.trim()) handleCreate();
                if (e.key === "Escape") handleCancelCreate();
              }}
              style={inputStyle(nameFocused)}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Starting Content</label>
            <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.68rem", lineHeight: 1.5, margin: "0 0 0.65rem" }}>
              New profiles always start with no chores, to dos, or projects. Choose whether to include default maintenance content.
            </p>
            <label style={{ alignItems: "flex-start", cursor: "pointer", display: "flex", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <input
                type="checkbox"
                checked={seedInventory}
                onChange={e => { setSeedInventory(e.target.checked); if (!e.target.checked) setSeedTasks(false); }}
                style={{ accentColor: "#c9a96e", flexShrink: 0, marginTop: "0.15rem" }}
              />
              <div>
                <div style={{ color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.72rem" }}>Default categories & items</div>
                <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem", marginTop: "0.1rem" }}>Include the default inventory structure (HVAC, Plumbing, Exterior, etc.)</div>
              </div>
            </label>
            <label style={{ alignItems: "flex-start", cursor: seedInventory ? "pointer" : "default", display: "flex", gap: "0.6rem", opacity: seedInventory ? 1 : 0.4 }}>
              <input
                type="checkbox"
                checked={seedTasks && seedInventory}
                disabled={!seedInventory}
                onChange={e => setSeedTasks(e.target.checked)}
                style={{ accentColor: "#c9a96e", flexShrink: 0, marginTop: "0.15rem" }}
              />
              <div>
                <div style={{ color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.72rem" }}>Default maintenance tasks</div>
                <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem", marginTop: "0.1rem" }}>Include pre-built task schedules for each item (requires categories & items)</div>
              </div>
            </label>
          </div>

          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              style={{ background: newName.trim() && !creating ? "#c9a96e22" : "transparent", border: `1px solid ${newName.trim() && !creating ? "#c9a96e" : "#a8a29c"}`, borderRadius: "3px", color: newName.trim() && !creating ? "#c9a96e" : "#a8a29c", cursor: newName.trim() && !creating ? "pointer" : "default", fontFamily: "monospace", fontSize: "0.75rem", letterSpacing: "0.05em", padding: "0.45rem 1.1rem", transition: "all 0.15s" }}
              onMouseEnter={e => { if (newName.trim() && !creating) e.currentTarget.style.background = "#c9a96e35"; }}
              onMouseLeave={e => { if (newName.trim() && !creating) e.currentTarget.style.background = "#c9a96e22"; }}
            >{creating ? "Creating…" : "Create Profile"}</button>
            <button
              onClick={handleCancelCreate}
              disabled={creating}
              style={{ background: "transparent", border: "1px solid #a8a29c", borderRadius: "3px", color: "#a8a29c", cursor: creating ? "default" : "pointer", fontFamily: "monospace", fontSize: "0.75rem", padding: "0.45rem 1rem", transition: "all 0.15s" }}
              onMouseEnter={e => { if (!creating) { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#8b7d6b"; } }}
              onMouseLeave={e => { if (!creating) { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#a8a29c"; } }}
            >Cancel</button>
          </div>
        </div>
      )}

      {/* ── Divider ── */}
      <div style={{ borderTop: "1px solid #1e2330", margin: "0 0 1.75rem" }} />

      {/* ── Export ── */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={subheadStyle}>Export</div>
        <p style={bodyTextStyle}>
          Download a profile's data as a JSON backup file. Store it somewhere safe — it can be used to restore your data at any time.
        </p>
        <div style={{ alignItems: "flex-end", display: "flex", gap: "0.6rem" }}>
          <div>
            <label style={labelStyle}>Profile</label>
            <select value={exportTarget} onChange={e => setExportTarget(e.target.value)} style={selectStyle}>
              {allProfiles.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <button
            onClick={() => exportProfile(exportTarget)}
            disabled={!exportHasData}
            style={{
              background: exportHasData ? "#1a1f2e" : "transparent",
              border: `1px solid ${exportHasData ? "#a8a29c" : "#1e2330"}`,
              borderRadius: "3px",
              color: exportHasData ? "#8b7d6b" : "#a8a29c",
              cursor: exportHasData ? "pointer" : "default",
              fontFamily: "monospace", fontSize: "0.75rem",
              letterSpacing: "0.05em", padding: "0.5rem 1.1rem", transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (exportHasData) { e.currentTarget.style.borderColor = "#c9a96e"; e.currentTarget.style.color = "#c9a96e"; } }}
            onMouseLeave={e => { if (exportHasData) { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#8b7d6b"; } }}
          >
            Download
          </button>
        </div>
        {!exportHasData && (
          <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.67rem", margin: "0.5rem 0 0" }}>
            No data saved for this profile yet. Switch to it first to generate data.
          </p>
        )}
      </div>

      {/* ── Import ── */}
      <div>
        <div style={subheadStyle}>Import</div>
        <p style={bodyTextStyle}>
          Restore from a previously exported backup file. Choose which profile slot to load the data into.
        </p>

        {importSuccess && (
          <div style={{ alignItems: "center", background: "#4ade8010", border: "1px solid #4ade8030", borderRadius: "4px", display: "flex", gap: "0.5rem", marginBottom: "0.9rem", padding: "0.6rem 0.85rem" }}>
            <span style={{ color: "#4ade80", fontFamily: "monospace", fontSize: "0.72rem" }}>Import complete — data saved to {importTargetMeta?.label}.</span>
            <button onClick={() => setImportSuccess(false)} style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.65rem", marginLeft: "auto", padding: 0 }}>×</button>
          </div>
        )}

        {!importFile ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ background: "transparent", border: "1px solid #a8a29c", borderRadius: "3px", color: "#8b7d6b", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem", letterSpacing: "0.05em", padding: "0.5rem 1.1rem", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#c9a96e"; e.currentTarget.style.color = "#c9a96e"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#8b7d6b"; }}
          >
            Choose File…
          </button>
        ) : importFile === "error" ? (
          <div style={{ background: "#f8717110", border: "1px solid #f8717130", borderRadius: "4px", padding: "0.75rem 1rem" }}>
            <div style={{ color: "#f87171", fontFamily: "monospace", fontSize: "0.72rem", marginBottom: "0.5rem" }}>
              Invalid file — make sure you're importing a Foreman backup.
            </div>
            <button
              onClick={() => { setImportFile(null); fileInputRef.current?.click(); }}
              style={{ background: "transparent", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.67rem", padding: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = "#8b7d6b"}
              onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
            >
              Try again
            </button>
          </div>
        ) : (
          <div style={{ background: "#13161f", border: "1px solid #1e2330", borderRadius: "4px", padding: "0.9rem 1rem" }}>
            <div style={{ alignItems: "baseline", display: "flex", gap: "0.5rem", marginBottom: "0.9rem" }}>
              <span style={{ color: "#4ade80", fontFamily: "monospace", fontSize: "0.65rem" }}>✓</span>
              <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem" }}>{importFile.name}</span>
              {importFile.data.label && (
                <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.65rem" }}>· from {importFile.data.label}</span>
              )}
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={labelStyle}>Load into</label>
              <select value={importTarget} onChange={e => setImportTarget(e.target.value)} style={selectStyle}>
                {allProfiles.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.68rem", lineHeight: 1.5, margin: "0 0 0.85rem" }}>
              {importTarget === activeProfile
                ? `This will replace all current ${activeMeta?.label} data. The page will reload.`
                : `This will replace the saved ${importTargetMeta?.label} snapshot. No reload needed.`
              }
            </p>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button
                onClick={handleImport} disabled={importing}
                style={{ background: importing ? "transparent" : "#c9a96e22", border: `1px solid ${importing ? "#a8a29c" : "#c9a96e"}`, borderRadius: "3px", color: importing ? "#a8a29c" : "#c9a96e", cursor: importing ? "default" : "pointer", fontFamily: "monospace", fontSize: "0.75rem", letterSpacing: "0.05em", padding: "0.45rem 1.1rem", transition: "all 0.15s" }}
                onMouseEnter={e => { if (!importing) e.currentTarget.style.background = "#c9a96e35"; }}
                onMouseLeave={e => { if (!importing) e.currentTarget.style.background = "#c9a96e22"; }}
              >
                {importing ? "Importing…" : `Import into ${importTargetMeta?.label}`}
              </button>
              <button
                onClick={handleCancelImport} disabled={importing}
                style={{ background: "transparent", border: "1px solid #a8a29c", borderRadius: "3px", color: "#a8a29c", cursor: importing ? "default" : "pointer", fontFamily: "monospace", fontSize: "0.75rem", padding: "0.45rem 1rem", transition: "all 0.15s" }}
                onMouseEnter={e => { if (!importing) { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#8b7d6b"; } }}
                onMouseLeave={e => { if (!importing) { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#a8a29c"; } }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleFileSelect} />
      </div>
    </div>
  );
}

// ─── NotificationsSettings ────────────────────────────────────────────────────

function NotificationsSettings() {
  const [webhookUrl, setWebhookUrlState] = useState(() => getWebhookUrl());
  const [showModal, setShowModal]         = useState(false);

  // Modal draft state
  const [draftWebhook, setDraftWebhook]   = useState("");
  const [draftHour, setDraftHour]         = useState(9);
  const [draftLeadDays, setDraftLeadDays] = useState(7);
  const [webhookFocused, setWebhookFocused] = useState(false);

  function openModal() {
    setDraftWebhook(getWebhookUrl());
    setDraftHour(getSendHourLocal());
    setDraftLeadDays(getLeadDays());
    setShowModal(true);
  }

  function handleSave() {
    const trimmed = draftWebhook.trim();
    setWebhookUrl(trimmed);
    setSendHourLocal(draftHour);
    setLeadDays(draftLeadDays);
    setWebhookUrlState(trimmed);
    setShowModal(false);
  }

  function handleDisconnect() {
    setWebhookUrl("");
    setWebhookUrlState("");
    setShowModal(false);
  }

  const isConnected = !!webhookUrl;

  return (
    <div style={{ maxWidth: "560px" }}>
      <h2 style={{ color: "#e8e4dd", fontFamily: "'Georgia','Times New Roman',serif", fontSize: "1.25rem", fontWeight: "normal", margin: "0 0 0.3rem" }}>Notifications</h2>
      <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.75rem", margin: "0 0 2rem" }}>
        Get reminders about upcoming and overdue maintenance tasks delivered to your Discord server.
      </p>

      {/* Discord card */}
      <div style={{ background: "#13161f", border: "1px solid #1e2330", borderRadius: "6px", padding: "1.1rem 1.25rem" }}>
        <div style={{ alignItems: "center", display: "flex", gap: "0.6rem", marginBottom: "0.4rem" }}>
          <svg width="18" height="18" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, opacity: 0.7 }}>
            <path d="M60.1 4.9A58.5 58.5 0 0 0 45.8.7a.2.2 0 0 0-.2.1 40.7 40.7 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A38.3 38.3 0 0 0 25.8.8a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 11.3 5a.2.2 0 0 0-.1.1C1.6 19.1-1 32.8.3 46.4a.2.2 0 0 0 .1.2 58.8 58.8 0 0 0 17.7 9 .2.2 0 0 0 .2-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4c.4-.3.7-.6 1.1-.9a.2.2 0 0 1 .2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 0 1 .2 0c.4.3.8.6 1.1.9a.2.2 0 0 1 0 .4 36 36 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47.2 47.2 0 0 0 3.6 5.9.2.2 0 0 0 .2.1 58.7 58.7 0 0 0 17.8-9 .2.2 0 0 0 .1-.2C73.5 30.6 69.2 17 60.2 5a.2.2 0 0 0-.1-.1ZM23.7 38.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.3 6.4 7.2c0 4-2.9 7.2-6.4 7.2Zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.3 6.4 7.2c0 4-2.9 7.2-6.4 7.2Z" fill="#5865F2"/>
          </svg>
          <span style={{ color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.82rem" }}>Discord</span>
          {isConnected && (
            <div style={{ alignItems: "center", display: "flex", gap: "0.35rem", marginLeft: "auto" }}>
              <span style={{ background: "#4ade80", borderRadius: "50%", display: "inline-block", height: "6px", width: "6px" }} />
              <span style={{ color: "#4ade80", fontFamily: "monospace", fontSize: "0.62rem", letterSpacing: "0.08em" }}>Connected</span>
            </div>
          )}
        </div>
        <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem", lineHeight: 1.5, margin: "0 0 0.85rem" }}>
          {isConnected
            ? "Discord webhook is configured. Reminders will be posted to your channel on the schedule below."
            : "Connect a Discord webhook to receive daily maintenance reminders in your server."}
        </p>
        {isConnected && (
          <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "4px", fontFamily: "monospace", fontSize: "0.68rem", marginBottom: "0.85rem", padding: "0.6rem 0.75rem" }}>
            <div style={{ alignItems: "center", display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ color: "#8b7d6b", minWidth: "70px" }}>Send time</span>
              <span style={{ color: "#a8a29c" }}>{formatHour12(getSendHourLocal())}</span>
            </div>
            <div style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}>
              <span style={{ color: "#8b7d6b", minWidth: "70px" }}>Lead days</span>
              <span style={{ color: "#a8a29c" }}>{getLeadDays()} {getLeadDays() === 1 ? "day" : "days"} before due</span>
            </div>
          </div>
        )}
        <button
          onClick={openModal}
          style={{ background: "transparent", border: "1px solid #a8a29c", borderRadius: "3px", color: "#8b7d6b", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.05em", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#c9a96e"; e.currentTarget.style.color = "#c9a96e"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#8b7d6b"; }}
        >
          {isConnected ? "Edit" : "Set up Discord"}
        </button>
      </div>

      {/* Discord setup modal */}
      {showModal && createPortal(
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          style={{ alignItems: "center", background: "rgba(0,0,0,0.75)", bottom: 0, display: "flex", justifyContent: "center", left: 0, position: "fixed", right: 0, top: 0, zIndex: 1000 }}
        >
          <div style={{ background: "#0f1117", border: "1px solid #a8a29c", borderRadius: "8px", maxWidth: "480px", padding: "1.75rem", width: "90vw" }}>
            <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <span style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>Discord Notifications</span>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "1rem", lineHeight: 1, padding: "0.1rem 0.3rem", transition: "color 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
              >×</button>
            </div>

            {/* Webhook URL */}
            <div style={{ marginBottom: "1.1rem" }}>
              <label style={labelStyle}>Webhook URL</label>
              <input
                value={draftWebhook}
                onChange={e => setDraftWebhook(e.target.value)}
                onFocus={() => setWebhookFocused(true)}
                onBlur={() => setWebhookFocused(false)}
                placeholder="https://discord.com/api/webhooks/…"
                style={inputStyle(webhookFocused)}
              />
              <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem", lineHeight: 1.5, margin: "0.4rem 0 0" }}>
                Server Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL
              </p>
            </div>

            {/* Send hour */}
            <div style={{ marginBottom: "1.1rem" }}>
              <label style={labelStyle}>Daily Send Time</label>
              <select
                value={draftHour}
                onChange={e => setDraftHour(Number(e.target.value))}
                style={{ ...selectStyle, width: "160px" }}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{formatHour12(h)}</option>
                ))}
              </select>
              <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem", margin: "0.4rem 0 0" }}>
                Time in your local timezone. Reminders are sent once daily.
              </p>
            </div>

            {/* Lead days */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={labelStyle}>Remind me</label>
              <div style={{ alignItems: "center", display: "flex", gap: "0.6rem" }}>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={draftLeadDays}
                  onChange={e => setDraftLeadDays(Math.max(0, Math.min(30, Number(e.target.value))))}
                  style={{ ...inputStyle(false), width: "72px" }}
                />
                <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem" }}>days before a task is due</span>
              </div>
              <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem", margin: "0.4rem 0 0" }}>
                Set to 0 to only be notified on the due date itself.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.6rem", justifyContent: "space-between" }}>
              <div>
                {isConnected && (
                  <button
                    onClick={handleDisconnect}
                    style={{ background: "transparent", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.67rem", padding: 0, transition: "color 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                    onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
                  >Disconnect</button>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: "transparent", border: "1px solid #a8a29c", borderRadius: "3px", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem", padding: "0.45rem 1rem", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#8b7d6b"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#a8a29c"; }}
                >Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={!draftWebhook.trim()}
                  style={{ background: draftWebhook.trim() ? "#c9a96e22" : "transparent", border: `1px solid ${draftWebhook.trim() ? "#c9a96e" : "#a8a29c"}`, borderRadius: "3px", color: draftWebhook.trim() ? "#c9a96e" : "#a8a29c", cursor: draftWebhook.trim() ? "pointer" : "default", fontFamily: "monospace", fontSize: "0.75rem", letterSpacing: "0.05em", padding: "0.45rem 1.1rem", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (draftWebhook.trim()) e.currentTarget.style.background = "#c9a96e35"; }}
                  onMouseLeave={e => { if (draftWebhook.trim()) e.currentTarget.style.background = "#c9a96e22"; }}
                >Save</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── IntegrationsSettings ─────────────────────────────────────────────────────

function IntegrationsSettings() {
  return (
    <div style={{ maxWidth: "560px" }}>
      <h2 style={{ color: "#e8e4dd", fontFamily: "'Georgia','Times New Roman',serif", fontSize: "1.25rem", fontWeight: "normal", margin: "0 0 0.3rem" }}>Integrations</h2>
      <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.75rem", margin: "0 0 2rem" }}>
        Connect Foreman with external tools to get your data where it needs to go.
      </p>

      {/* ICS Export card */}
      <div style={{ background: "#13161f", border: "1px solid #1e2330", borderRadius: "6px", padding: "1.1rem 1.25rem" }}>
        <div style={{ alignItems: "center", display: "flex", gap: "0.75rem", marginBottom: "0.4rem" }}>
          <span style={{ color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.82rem" }}>ICS Export</span>
          <span style={{
            background: "#1e2330",
            border: "1px solid #2a3040",
            borderRadius: "3px",
            color: "#a8a29c",
            fontFamily: "monospace",
            fontSize: "0.58rem",
            letterSpacing: "0.1em",
            padding: "0.15rem 0.5rem",
            textTransform: "uppercase",
          }}>Coming Soon</span>
        </div>
        <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem", lineHeight: 1.55, margin: 0 }}>
          Export your maintenance schedule and chore due dates as a .ics file for import into Google Calendar, Apple Calendar, Outlook, or any other calendar application.
        </p>
      </div>
    </div>
  );
}

// ─── HouseholdSettings ───────────────────────────────────────────────────────

function HouseholdSettings() {
  // ── Address ──
  const [address, setAddressState]   = useState(() => loadAddress());
  const [editingAddress, setEditingAddress] = useState(false);
  const [draft, setDraft]            = useState(EMPTY_ADDRESS);
  const [focusedField, setFocusedField] = useState(null);

  const hasAddress = address.street.trim() !== "" || address.city.trim() !== "";

  function startEditAddress() {
    setDraft({ ...address });
    setEditingAddress(true);
  }

  function handleSaveAddress() {
    const cleaned = {
      street:  draft.street.trim(),
      street2: draft.street2.trim(),
      city:    draft.city.trim(),
      state:   draft.state.trim().toUpperCase().slice(0, 2),
      zip:     draft.zip.trim().slice(0, 10),
    };
    saveAddress(cleaned);
    setAddressState(cleaned);
    setEditingAddress(false);
  }

  function handleClearAddress() {
    saveAddress(EMPTY_ADDRESS);
    setAddressState({ ...EMPTY_ADDRESS });
    setEditingAddress(false);
  }

  function field(key, placeholder, opts = {}) {
    return (
      <input
        value={draft[key]}
        placeholder={placeholder}
        onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
        onFocus={() => setFocusedField(key)}
        onBlur={() => setFocusedField(null)}
        onKeyDown={e => {
          if (e.key === "Escape") { e.preventDefault(); setEditingAddress(false); }
        }}
        maxLength={opts.maxLength}
        style={{ ...inputStyle(focusedField === key), ...opts.style }}
      />
    );
  }

  // ── Members ──
  const [members, setMembersState]     = useState(() => loadMembers());
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editingMemberValue, setEditingMemberValue] = useState("");
  const [hoveredMemberId, setHoveredMemberId]   = useState(null);
  const [confirmDeleteId, setConfirmDeleteId]   = useState(null);
  const [newMemberFocused, setNewMemberFocused] = useState(false);
  const [editMemberFocused, setEditMemberFocused] = useState(false);

  function persist(next) { setMembersState(next); saveMembers(next); }

  function handleAddMember() {
    const name = newMemberName.trim();
    if (!name) return;
    persist([...members, { id: `m-${Date.now()}`, name }]);
    setNewMemberName("");
    setAddingMember(false);
  }

  function handleCommitRename() {
    const name = editingMemberValue.trim();
    if (name) persist(members.map(m => m.id === editingMemberId ? { ...m, name } : m));
    setEditingMemberId(null);
  }

  function handleDeleteMember(id) {
    persist(members.filter(m => m.id !== id));
    setConfirmDeleteId(null);
  }

  return (
    <div style={{ maxWidth: "560px" }}>
      <h2 style={{ color: "#e8e4dd", fontFamily: "'Georgia','Times New Roman',serif", fontSize: "1.25rem", fontWeight: "normal", margin: "0 0 0.3rem" }}>Household</h2>
      <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.75rem", margin: "0 0 2.25rem" }}>
        Basic information about your home and the people who live in it.
      </p>

      {/* ── Address ── */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div style={subheadStyle}>Address</div>

        {editingAddress ? (
          <div style={{ background: "#13161f", border: "1px solid #1e2330", borderRadius: "6px", padding: "1.1rem 1.25rem" }}>
            <div style={{ marginBottom: "0.7rem" }}>
              {field("street", "Street address", { style: { width: "100%" } })}
            </div>
            <div style={{ marginBottom: "0.7rem" }}>
              {field("street2", "Apt, suite, unit (optional)", { style: { width: "100%" } })}
            </div>
            <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "1fr 72px 100px", marginBottom: "1rem" }}>
              {field("city", "City")}
              {field("state", "ST", { maxLength: 2, style: { textTransform: "uppercase" } })}
              {field("zip", "ZIP", { maxLength: 10 })}
            </div>
            <div style={{ display: "flex", gap: "0.6rem", justifyContent: "space-between" }}>
              <div>
                {hasAddress && (
                  <button
                    onClick={handleClearAddress}
                    style={{ background: "transparent", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.67rem", padding: 0, transition: "color 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                    onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
                  >Clear address</button>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button
                  onClick={() => setEditingAddress(false)}
                  style={{ background: "transparent", border: "1px solid #a8a29c", borderRadius: "3px", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#8b7d6b"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#a8a29c"; e.currentTarget.style.color = "#a8a29c"; }}
                >Cancel</button>
                <button
                  onClick={handleSaveAddress}
                  style={{ background: "#c9a96e22", border: "1px solid #c9a96e", borderRadius: "3px", color: "#c9a96e", cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem", letterSpacing: "0.05em", padding: "0.4rem 0.9rem", transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#c9a96e35"}
                  onMouseLeave={e => e.currentTarget.style.background = "#c9a96e22"}
                >Save</button>
              </div>
            </div>
          </div>
        ) : hasAddress ? (
          <div style={{ background: "#13161f", border: "1px solid #1e2330", borderRadius: "6px", padding: "1.1rem 1.25rem" }}>
            <div style={{ alignItems: "flex-start", display: "flex", gap: "1rem", justifyContent: "space-between" }}>
              <address style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.78rem", fontStyle: "normal", lineHeight: 1.65 }}>
                <div style={{ color: "#e8e4dd" }}>{address.street}</div>
                {address.street2 && <div>{address.street2}</div>}
                <div>{[address.city, address.state].filter(Boolean).join(", ")}{address.zip ? ` ${address.zip}` : ""}</div>
              </address>
              <button
                onClick={startEditAddress}
                style={{ background: "transparent", border: "none", color: "#a8a29c", cursor: "pointer", flexShrink: 0, fontFamily: "monospace", fontSize: "0.67rem", letterSpacing: "0.05em", padding: 0, transition: "color 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#c9a96e"}
                onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
              >Edit</button>
            </div>
          </div>
        ) : (
          <button
            onClick={startEditAddress}
            style={{ alignItems: "center", background: "#13161f", border: "1px dashed #2a3040", borderRadius: "6px", color: "#4a4458", cursor: "pointer", display: "flex", fontFamily: "monospace", fontSize: "0.72rem", gap: "0.5rem", letterSpacing: "0.05em", padding: "1rem 1.25rem", textAlign: "left", transition: "all 0.15s", width: "100%" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#c9a96e50"; e.currentTarget.style.color = "#8b7d6b"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a3040"; e.currentTarget.style.color = "#4a4458"; }}
          >
            + Add address
          </button>
        )}
      </div>

      {/* ── Members ── */}
      <div>
        <div style={subheadStyle}>Household Members</div>
        <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem", lineHeight: 1.5, margin: "0 0 0.85rem" }}>
          People who live in this home. Double-click a name to edit it.
        </p>

        <div style={{ background: "#13161f", border: "1px solid #1e2330", borderRadius: "6px", overflow: "hidden" }}>
          {members.length === 0 && !addingMember && (
            <div style={{ color: "#4a4458", fontFamily: "monospace", fontSize: "0.72rem", padding: "1.25rem 1rem", textAlign: "center" }}>
              No members added yet
            </div>
          )}

          {members.map((member, idx) => (
            <div key={member.id}>
              {/* Delete confirmation inline */}
              {confirmDeleteId === member.id ? (
                <div style={{ alignItems: "center", background: "#1a1218", borderBottom: idx < members.length - 1 || addingMember ? "1px solid #1e2330" : "none", display: "flex", gap: "0.75rem", padding: "0.6rem 1rem" }}>
                  <span style={{ color: "#f87171", fontFamily: "monospace", fontSize: "0.68rem", flex: 1 }}>
                    Remove {member.name}?
                  </span>
                  <button
                    onClick={() => handleDeleteMember(member.id)}
                    style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem", padding: "0.15rem 0.3rem", transition: "color 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#fca5a5"}
                    onMouseLeave={e => e.currentTarget.style.color = "#f87171"}
                  >Remove</button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    style={{ background: "transparent", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem", padding: "0.15rem 0.3rem", transition: "color 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#e8e4dd"}
                    onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
                  >Cancel</button>
                </div>
              ) : editingMemberId === member.id ? (
                <div style={{ alignItems: "center", background: "#161920", borderBottom: idx < members.length - 1 || addingMember ? "1px solid #1e2330" : "none", display: "flex", gap: "0.5rem", padding: "0.45rem 1rem" }}>
                  <input
                    autoFocus
                    value={editingMemberValue}
                    onChange={e => setEditingMemberValue(e.target.value)}
                    onFocus={() => setEditMemberFocused(true)}
                    onBlur={() => { setEditMemberFocused(false); handleCommitRename(); }}
                    onKeyDown={e => {
                      if (e.key === "Enter") { e.preventDefault(); handleCommitRename(); }
                      if (e.key === "Escape") { e.preventDefault(); setEditingMemberId(null); }
                    }}
                    style={{ ...inputStyle(editMemberFocused), flex: 1, padding: "0.25rem 0.5rem" }}
                  />
                </div>
              ) : (
                <div
                  onMouseEnter={() => setHoveredMemberId(member.id)}
                  onMouseLeave={() => setHoveredMemberId(null)}
                  onDoubleClick={() => { setEditingMemberId(member.id); setEditingMemberValue(member.name); }}
                  style={{ alignItems: "center", background: idx % 2 === 0 ? "#13161f" : "#161920", borderBottom: idx < members.length - 1 || addingMember ? "1px solid #1e2330" : "none", cursor: "default", display: "flex", gap: "0.75rem", padding: "0.6rem 1rem", userSelect: "none" }}
                >
                  <div style={{ alignItems: "center", background: "#1e2330", borderRadius: "50%", color: "#a8a29c", display: "flex", flexShrink: 0, fontFamily: "monospace", fontSize: "0.62rem", height: "24px", justifyContent: "center", width: "24px" }}>
                    {member.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span style={{ color: "#e8e4dd", flex: 1, fontFamily: "monospace", fontSize: "0.78rem" }}>
                    {member.name}
                  </span>
                  {hoveredMemberId === member.id && (
                    <button
                      onClick={() => setConfirmDeleteId(member.id)}
                      style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.85rem", lineHeight: 1, padding: "0.1rem 0.2rem", transition: "color 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                      onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
                    >×</button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add member row */}
          {addingMember ? (
            <div style={{ alignItems: "center", borderTop: members.length > 0 ? "1px solid #1e2330" : "none", display: "flex", gap: "0.5rem", padding: "0.45rem 1rem" }}>
              <input
                autoFocus
                value={newMemberName}
                placeholder="Name"
                onChange={e => setNewMemberName(e.target.value)}
                onFocus={() => setNewMemberFocused(true)}
                onBlur={() => setNewMemberFocused(false)}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); handleAddMember(); }
                  if (e.key === "Escape") { e.preventDefault(); setAddingMember(false); setNewMemberName(""); }
                }}
                style={{ ...inputStyle(newMemberFocused), flex: 1, padding: "0.25rem 0.5rem" }}
              />
              <button
                onClick={handleAddMember}
                disabled={!newMemberName.trim()}
                style={{ background: newMemberName.trim() ? "#c9a96e22" : "transparent", border: `1px solid ${newMemberName.trim() ? "#c9a96e" : "#a8a29c"}`, borderRadius: "3px", color: newMemberName.trim() ? "#c9a96e" : "#a8a29c", cursor: newMemberName.trim() ? "pointer" : "default", fontFamily: "monospace", fontSize: "0.72rem", padding: "0.3rem 0.65rem", transition: "all 0.15s", whiteSpace: "nowrap" }}
              >Add</button>
              <button
                onClick={() => { setAddingMember(false); setNewMemberName(""); }}
                style={{ background: "transparent", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.85rem", lineHeight: 1, padding: "0.1rem 0.2rem", transition: "color 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#e8e4dd"}
                onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
              >×</button>
            </div>
          ) : (
            <div style={{ borderTop: members.length > 0 ? "1px solid #1e2330" : "none", padding: "0.45rem 1rem" }}>
              <button
                onClick={() => setAddingMember(true)}
                style={{ background: "none", border: "none", color: "#8b7d6b", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.05em", padding: "0.2rem 0", transition: "color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#c9a96e"}
                onMouseLeave={e => e.currentTarget.style.color = "#8b7d6b"}
              >+ Add Member</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── UploadInspectionSettings ─────────────────────────────────────────────────

function UploadInspectionSettings() {
  const fileInputRef = useRef(null);

  const [meta, setMeta] = useState(() => {
    try { return JSON.parse(localStorage.getItem(INSPECTION_META_KEY) || "null"); }
    catch { return null; }
  });
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState("idle"); // "idle"|"extracting"|"calling"|"review"|"success"
  const [extractedData, setExtractedData] = useState(null);
  const [progress, setProgress] = useState({ chunk: 0, total: 0 });
  const [importSummary, setImportSummary] = useState(null);
  const [processError, setProcessError] = useState(null);

  const { reviewCategories, reviewCategoryItems, reviewProjects } = (() => {
    const rows = loadCustomData();
    const deletedCats = loadDeletedCategories();
    const deletedItems = loadDeletedItems();
    const map = {};
    rows.forEach(row => {
      if (deletedCats.has(row.category)) return;
      if (row._isBlankCategory || !row.category || !row.item) return;
      if (deletedItems.has(`${row.category}|${row.item}`)) return;
      if (!map[row.category]) map[row.category] = [];
      if (!map[row.category].includes(row.item)) map[row.category].push(row.item);
    });
    return {
      reviewCategories: Object.keys(map),
      reviewCategoryItems: map,
      reviewProjects: loadProjects(),
    };
  })();

  function saveMeta(m) {
    setMeta(m);
    if (m) localStorage.setItem(INSPECTION_META_KEY, JSON.stringify(m));
    else localStorage.removeItem(INSPECTION_META_KEY);
  }

  function handleFile(f) {
    if (!f || f.type !== "application/pdf") return;
    setFile(f);
    setPhase("idle");
    setProcessError(null);
    setImportSummary(null);
    saveMeta({ name: f.name, sizeMb: (f.size / 1024 / 1024).toFixed(1), uploadedAt: new Date().toISOString() });
  }

  function handleInputChange(e) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function handleRemove() {
    setFile(null);
    setPhase("idle");
    setProcessError(null);
    setImportSummary(null);
    saveMeta(null);
  }

  async function handleProcess() {
    if (!file) return;
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) { setProcessError("Groq API key not configured. Set VITE_GROQ_API_KEY in your .env file."); return; }

    setProcessError(null);
    setPhase("extracting");
    let pages;
    try {
      pages = await extractPdfText(file);
    } catch (err) {
      setProcessError(`Failed to read PDF: ${err.message}`);
      setPhase("idle");
      return;
    }

    const chunks = chunkPageTexts(pages);
    setProgress({ chunk: 0, total: chunks.length });
    setPhase("calling");

    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      setProgress({ chunk: i + 1, total: chunks.length });
      try {
        results.push(await extractChunk(chunks[i], apiKey));
      } catch (err) {
        const msg = err?.message || String(err);
        // Rate limit or auth error — stop immediately and tell the user
        if (msg.includes("429") || msg.includes("401") || msg.includes("403")) {
          setProcessError(`Groq API error: ${msg}`);
          setPhase("idle");
          return;
        }
        // Other errors (timeout, parse failure) — skip chunk but continue
        results.push({ appliances: [], todos: [], projects: [] });
      }
    }

    const merged = mergeResults(results);

    // Render only the pages Groq identified as containing findings
    const neededPages = new Set();
    [...merged.todos, ...merged.projects].forEach(item => {
      (item.sourcePages || []).forEach(p => neededPages.add(p));
    });

    const renderedPages = await renderSpecificPages(file, [...neededPages]);

    const pageImageIds = new Map();
    for (const [pageNum, dataUrl] of renderedPages) {
      const id = storeImageFromDataUrl(dataUrl, `inspection-p${pageNum}.jpg`);
      pageImageIds.set(pageNum, [id]);
    }

    setExtractedData(associateImages(merged, pageImageIds));
    setPhase("review");
  }

  function handleImport(selected) {
    // Appliances → custom inventory rows + field values
    const customRows = loadCustomData();
    const existingKeys = new Set(customRows.map(r => `${r.category}|${r.item}`));
    const newRows = [];
    const cfValues = loadCustomFieldValues();

    selected.appliances.forEach(a => {
      const resolved = resolveAppliance(a);
      const catKey = `${resolved.category}|`;
      const itemKey = `${resolved.category}|${resolved.item}`;

      if (!existingKeys.has(catKey) && !customRows.some(r => r.category === resolved.category && r._isBlankCategory)) {
        newRows.push({ _id: `insp-cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, _isCustom: true, _isBlankCategory: true, category: resolved.category, item: "", task: "", schedule: "", season: null, categoryType: "system" });
      }
      if (!existingKeys.has(itemKey)) {
        newRows.push({ _id: `insp-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, _isCustom: true, category: resolved.category, item: resolved.item, task: "", schedule: "", season: null, categoryType: "system" });
        existingKeys.add(itemKey);
      }

      const cfKey = `${resolved.category}|${resolved.item}`;
      cfValues[cfKey] = {
        ...(cfValues[cfKey] || {}),
        ...(a.manufacturer ? { manufacturer: a.manufacturer } : {}),
        ...(a.model        ? { model: a.model }               : {}),
        ...(a.age          ? { age_note: a.age }               : {}),
      };
    });

    if (newRows.length > 0) saveCustomData([...customRows, ...newRows]);
    saveCustomFieldValues(cfValues);

    // Category type overrides for new categories
    if (selected.appliances.length > 0) {
      const overrides = loadCategoryTypeOverrides();
      const updated = { ...overrides };
      selected.appliances.forEach(a => {
        const resolved = resolveAppliance(a);
        if (!updated[resolved.category]) updated[resolved.category] = "system";
      });
      saveCategoryTypeOverrides(updated);
    }

    // To Dos
    if (selected.todos.length > 0) {
      const newTodos = selected.todos.map(t => createTodo({
        title: t.title,
        description: t.description || "",
        priority: t.priority,
        status: "not-started",
        linkedCategory: t.linkedCategory || null,
        linkedItem: t.linkedItem || null,
        labels: t.labels || [],
      }));
      saveTodos([...loadTodos(), ...newTodos]);
    }

    // Projects
    if (selected.projects.length > 0) {
      const newProjects = selected.projects.map(p => ({
        ...createProject({ name: p.name, linkedCategory: p.linkedCategory || null, linkedItem: p.linkedItem || null }),
        description: p.description || "",
        priority: p.priority || "medium",
        status: "not-started",
      }));
      saveProjects([...loadProjects(), ...newProjects]);
    }

    setImportSummary({
      appliances: selected.appliances.length,
      todos: selected.todos.length,
      projects: selected.projects.length,
    });
    setPhase("success");
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const hasFile = !!file;
  const hasMeta = !!meta;
  const needsReupload = hasMeta && !hasFile;

  return (
    <div style={{ maxWidth: "560px" }}>
      {phase === "review" && extractedData && createPortal(
        <InspectionReview
          data={extractedData}
          categories={reviewCategories}
          categoryItems={reviewCategoryItems}
          allProjects={reviewProjects}
          onImport={handleImport}
          onCancel={() => setPhase("idle")}
        />,
        document.body
      )}

      <h2 style={{ color: "#e8e4dd", fontFamily: "'Georgia','Times New Roman',serif", fontSize: "1.25rem", fontWeight: "normal", margin: "0 0 0.3rem" }}>Upload Inspection</h2>
      <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.75rem", margin: "0 0 2rem" }}>
        Upload a PDF copy of your home inspection report. Foreman will extract appliances, to dos, and projects for your review before adding anything to your profile.
      </p>

      {hasFile ? (
        /* ── File loaded ── */
        <div style={{ background: "#13161f", border: "1px solid #1e2330", borderRadius: "6px", padding: "1.25rem" }}>
          <div style={{ alignItems: "flex-start", display: "flex", gap: "0.75rem" }}>
            <div style={{ background: "#1a1f2e", border: "1px solid #2a3040", borderRadius: "4px", flexShrink: 0, padding: "0.5rem 0.6rem" }}>
              <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1H3a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-7-7Z" stroke="#a8a29c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 1v7h7" stroke="#a8a29c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <text x="3.5" y="19" fill="#c9a96e" fontFamily="monospace" fontSize="5.5" fontWeight="600" letterSpacing="0.05em">PDF</text>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.78rem", marginBottom: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {meta.name}
              </div>
              <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.62rem" }}>
                {meta.sizeMb} MB · Uploaded {formatDate(meta.uploadedAt)}
              </div>
            </div>
            {phase === "idle" || phase === "success" ? (
              <button
                onClick={handleRemove}
                title="Remove"
                style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", flexShrink: 0, fontFamily: "monospace", fontSize: "0.85rem", lineHeight: 1, padding: "0.1rem 0.2rem", transition: "color 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
              >×</button>
            ) : null}
          </div>

          {/* Phase-specific content below the file card */}
          {phase === "idle" && (
            <div style={{ marginTop: "1rem" }}>
              {processError && (
                <div style={{ background: "#f8717118", border: "1px solid #f8717140", borderRadius: "4px", color: "#f87171", fontFamily: "monospace", fontSize: "0.68rem", marginBottom: "0.75rem", padding: "0.6rem 0.85rem" }}>
                  {processError}
                </div>
              )}
              <button
                onClick={handleProcess}
                style={{ background: "#c9a96e18", border: "1px solid #c9a96e", borderRadius: "3px", color: "#c9a96e", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.1em", padding: "0.55rem 1.5rem", textTransform: "uppercase", transition: "all 0.15s", width: "100%" }}
                onMouseEnter={e => e.currentTarget.style.background = "#c9a96e28"}
                onMouseLeave={e => e.currentTarget.style.background = "#c9a96e18"}
              >
                Process Report →
              </button>
            </div>
          )}

          {(phase === "extracting" || phase === "calling") && (
            <div style={{ alignItems: "center", background: "#0f1117", border: "1px solid #1e2330", borderRadius: "4px", display: "flex", gap: "0.5rem", marginTop: "1rem", padding: "0.65rem 0.85rem" }}>
              <span style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "0.68rem" }}>
                {phase === "extracting"
                  ? "Reading PDF…"
                  : `Analyzing with AI… (chunk ${progress.chunk} of ${progress.total})`}
              </span>
            </div>
          )}

          {phase === "success" && importSummary && (
            <div style={{ background: "#4ade8012", border: "1px solid #4ade8030", borderRadius: "4px", marginTop: "1rem", padding: "0.75rem 1rem" }}>
              <div style={{ color: "#4ade80", fontFamily: "monospace", fontSize: "0.68rem", letterSpacing: "0.06em", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                Import complete
              </div>
              <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.68rem" }}>
                Added {importSummary.appliances} {importSummary.appliances === 1 ? "appliance" : "appliances"}, {importSummary.todos} {importSummary.todos === 1 ? "to do" : "to dos"}, and {importSummary.projects} {importSummary.projects === 1 ? "project" : "projects"} to your profile.
              </div>
              <button
                onClick={() => { setPhase("idle"); setImportSummary(null); }}
                style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.65rem", marginTop: "0.5rem", padding: 0, transition: "color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#c9a96e"}
                onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
              >
                Process another report
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── Upload area ── */
        <>
          {needsReupload && (
            <div style={{ alignItems: "center", background: "#1a1f2e", border: "1px solid #2a3040", borderRadius: "4px", display: "flex", gap: "0.5rem", marginBottom: "1rem", padding: "0.65rem 0.85rem" }}>
              <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.68rem" }}>
                Previously uploaded: <strong style={{ color: "#e8e4dd" }}>{meta.name}</strong> on {formatDate(meta.uploadedAt)} · Re-upload to continue.
              </span>
              <button
                onClick={handleRemove}
                style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", flexShrink: 0, fontFamily: "monospace", fontSize: "0.72rem", marginLeft: "auto", padding: 0, transition: "color 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}
              >Clear</button>
            </div>
          )}

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              alignItems: "center",
              background: dragOver ? "#1a2035" : "#13161f",
              border: `2px dashed ${dragOver ? "#c9a96e" : "#2a3040"}`,
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              padding: "2.5rem 1.5rem",
              textAlign: "center",
              transition: "all 0.15s",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={dragOver ? "#c9a96e" : "#4a4458"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.15s" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <div>
              <div style={{ color: dragOver ? "#c9a96e" : "#a8a29c", fontFamily: "monospace", fontSize: "0.78rem", marginBottom: "0.3rem", transition: "color 0.15s" }}>
                Drop your inspection PDF here
              </div>
              <div style={{ color: "#4a4458", fontFamily: "monospace", fontSize: "0.65rem" }}>
                or click to browse
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={handleInputChange}
          />
        </>
      )}
    </div>
  );
}

// ─── PreferencesPage ──────────────────────────────────────────────────────────

export default function PreferencesPage({ navigate }) {
  const [activeSection, setActiveSection] = useState("profile");

  return (
    <div style={{ background: "#0f1117", color: "#e8e4dd", display: "flex", flexDirection: "column", fontFamily: "'Georgia','Times New Roman',serif", height: "100vh", overflow: "hidden" }}>

      {/* Header */}
      <FmHeader active="Preferences" tagline="how Foreman behaves" />

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Settings nav sidebar */}
        <div style={{ borderRight: "1px solid #1e2330", flexShrink: 0, overflowY: "auto", padding: "2rem 0", width: "200px" }}>
          {NAV_ITEMS.map(item => {
            const isActive = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => item.available && setActiveSection(item.key)}
                style={{
                  background: isActive ? "#c9a96e12" : "transparent",
                  border: "none",
                  borderLeft: `2px solid ${isActive ? "#c9a96e" : "transparent"}`,
                  color: isActive ? "#c9a96e" : item.available ? "#8b7d6b" : "#a8a29c",
                  cursor: item.available ? "pointer" : "default",
                  display: "block",
                  fontFamily: "monospace",
                  fontSize: "0.78rem",
                  letterSpacing: "0.05em",
                  padding: "0.5rem 1.25rem",
                  textAlign: "left",
                  transition: "all 0.15s",
                  width: "100%",
                }}
                onMouseEnter={e => { if (item.available && !isActive) e.currentTarget.style.color = "#a8a29c"; }}
                onMouseLeave={e => { if (item.available && !isActive) e.currentTarget.style.color = "#8b7d6b"; }}
              >
                {item.label}
                {!item.available && (
                  <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.58rem", marginLeft: "0.5rem" }}>soon</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Settings content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "2rem 2.5rem" }}>
          {activeSection === "profile"       && <ProfileSettings />}
          {activeSection === "household"      && <HouseholdSettings />}
          {activeSection === "notifications"  && <NotificationsSettings />}
          {activeSection === "integrations"   && <IntegrationsSettings />}
          {activeSection === "inspection"     && <UploadInspectionSettings />}
        </div>

      </div>
    </div>
  );
}
