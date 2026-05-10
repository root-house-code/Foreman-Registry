import { useState, useRef } from "react";
import PageNav from "./components/PageNav.jsx";
import {
  PROFILES, loadActiveProfile, switchProfile,
  exportProfile, importProfileData, hasProfileSnapshot,
} from "./lib/profiles.js";

// ─── Settings nav items ───────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: "profile",       label: "Profile",       available: true  },
  { key: "household",     label: "Household",     available: false },
  { key: "notifications", label: "Notifications", available: false },
];

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

// ─── ProfileSettings ──────────────────────────────────────────────────────────

function ProfileSettings() {
  const [activeProfile] = useState(() => loadActiveProfile());
  const activeMeta      = PROFILES.find(p => p.key === activeProfile);

  // ── Profile switcher ──
  const [selected, setSelected]   = useState(activeProfile);
  const [switching, setSwitching] = useState(false);
  const selectedMeta = PROFILES.find(p => p.key === selected);
  const isDirty      = selected !== activeProfile;

  function handleSwitch() { setSwitching(true); switchProfile(selected); }
  function handleCancelSwitch() { setSelected(activeProfile); }

  // ── Export ──
  const [exportTarget, setExportTarget] = useState(activeProfile);
  const exportHasData = hasProfileSnapshot(exportTarget);

  function handleExport() {
    exportProfile(exportTarget);
  }

  // ── Import ──
  const fileInputRef                      = useRef(null);
  const [importFile, setImportFile]       = useState(null); // null | { name, data } | "error"
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
    // If target === activeProfile, importProfileData reloads the page — no further state needed.
  }

  function handleCancelImport() {
    setImportFile(null);
    setImporting(false);
    setImportTarget(activeProfile);
  }

  const importTargetMeta = PROFILES.find(p => p.key === importTarget);

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
          onChange={e => { setSelected(e.target.value); setSwitching(false); }}
          style={selectStyle}
        >
          {PROFILES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>

      {/* Profile description card */}
      <div style={{ background: "#13161f", border: "1px solid #1e2330", borderRadius: "4px", marginBottom: "1.5rem", padding: "0.9rem 1rem" }}>
        <div style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.12em", marginBottom: "0.35rem", textTransform: "uppercase" }}>
          {selectedMeta?.label}
        </div>
        <p style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.78rem", lineHeight: 1.55, margin: 0 }}>
          {selectedMeta?.description}
        </p>
        {selected === activeProfile && (
          <div style={{ alignItems: "center", display: "flex", gap: "0.4rem", marginTop: "0.6rem" }}>
            <span style={{ background: "#c9a96e", borderRadius: "50%", display: "inline-block", height: "6px", width: "6px" }} />
            <span style={{ color: "#c9a96e", fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.08em" }}>Currently active</span>
          </div>
        )}
      </div>

      {/* Inline switch confirmation */}
      {isDirty && (
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
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Divider ── */}
      <div style={{ borderTop: "1px solid #1e2330", margin: "2rem 0 1.75rem" }} />

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
              {PROFILES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <button
            onClick={handleExport}
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
            {/* File info */}
            <div style={{ alignItems: "baseline", display: "flex", gap: "0.5rem", marginBottom: "0.9rem" }}>
              <span style={{ color: "#4ade80", fontFamily: "monospace", fontSize: "0.65rem" }}>✓</span>
              <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem" }}>{importFile.name}</span>
              {importFile.data.label && (
                <span style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.65rem" }}>· from {importFile.data.label}</span>
              )}
            </div>

            {/* Target selector */}
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={labelStyle}>Load into</label>
              <select value={importTarget} onChange={e => setImportTarget(e.target.value)} style={selectStyle}>
                {PROFILES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>

            {/* Warning */}
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

// ─── PreferencesPage ──────────────────────────────────────────────────────────

export default function PreferencesPage({ navigate }) {
  const [activeSection, setActiveSection] = useState("profile");

  return (
    <div style={{ background: "#0f1117", color: "#e8e4dd", display: "flex", flexDirection: "column", fontFamily: "'Georgia','Times New Roman',serif", height: "100vh", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 60%)", borderBottom: "1px solid #a8a29c", flexShrink: 0, padding: "2rem", zIndex: 50 }}>
        <div style={{ alignItems: "flex-end", display: "flex", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ color: "#f0e6d3", fontFamily: "'Georgia','Times New Roman',serif", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: "normal", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 0.5rem" }}>Foreman</h1>
            <div>
              <span style={{ color: "#8b7d6b", display: "block", fontFamily: "monospace", fontSize: "0.7rem", letterSpacing: "0.25em", textTransform: "uppercase" }}>SETTINGS</span>
              <span style={{ color: "#c9a96e", fontFamily: "'Georgia','Times New Roman',serif", fontSize: "clamp(0.95rem, 2vw, 1.15rem)", letterSpacing: "0.01em" }}>Preferences</span>
            </div>
          </div>
          <PageNav currentPage="preferences" navigate={navigate} />
        </div>
      </div>

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
          {activeSection === "profile" && <ProfileSettings />}
        </div>

      </div>
    </div>
  );
}
