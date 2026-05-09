import { useState } from "react";
import PageNav from "./components/PageNav.jsx";
import { PROFILES, loadActiveProfile, switchProfile } from "./lib/profiles.js";

// ─── Settings nav items ───────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: "profile",       label: "Profile",       available: true  },
  { key: "household",     label: "Household",     available: false },
  { key: "notifications", label: "Notifications", available: false },
];

// ─── ProfileSettings ──────────────────────────────────────────────────────────

function ProfileSettings() {
  const [activeProfile]   = useState(() => loadActiveProfile());
  const [selected, setSelected] = useState(activeProfile);
  const [switching, setSwitching] = useState(false);

  const selectedMeta  = PROFILES.find(p => p.key === selected);
  const activeMeta    = PROFILES.find(p => p.key === activeProfile);
  const isDirty       = selected !== activeProfile;

  const labelStyle  = { color: "#5a5460", display: "block", fontFamily: "monospace", fontSize: "0.62rem", letterSpacing: "0.1em", marginBottom: "0.4rem", textTransform: "uppercase" };
  const selectStyle = {
    appearance: "none",
    background: "#1a1f2e",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a5460'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.75rem center",
    border: "1px solid #2e3448",
    borderRadius: "4px",
    boxSizing: "border-box",
    color: "#e8e0d0",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: "0.82rem",
    outline: "none",
    padding: "0.5rem 2rem 0.5rem 0.75rem",
    width: "280px",
  };

  function handleSwitch() {
    setSwitching(true);
    switchProfile(selected);
  }

  function handleCancel() {
    setSelected(activeProfile);
  }

  return (
    <div style={{ maxWidth: "540px" }}>
      <h2 style={{ color: "#d4c9b8", fontFamily: "'Georgia','Times New Roman',serif", fontSize: "1.25rem", fontWeight: "normal", margin: "0 0 0.3rem" }}>Profile</h2>
      <p style={{ color: "#5a5460", fontFamily: "monospace", fontSize: "0.75rem", margin: "0 0 2rem" }}>
        Switch between profiles to use different data sets. Each profile's data is saved independently — switching away and back restores it exactly as you left it.
      </p>

      <div style={{ marginBottom: "1.5rem" }}>
        <label style={labelStyle}>Active Profile</label>
        <select
          value={selected}
          onChange={e => { setSelected(e.target.value); setSwitching(false); }}
          style={selectStyle}
        >
          {PROFILES.map(p => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Profile description */}
      <div style={{ background: "#13161f", border: "1px solid #1e2330", borderRadius: "4px", marginBottom: "1.5rem", padding: "0.9rem 1rem" }}>
        <div style={{ color: "#8b7d6b", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.12em", marginBottom: "0.35rem", textTransform: "uppercase" }}>
          {selectedMeta?.label}
        </div>
        <p style={{ color: "#a89e8e", fontFamily: "monospace", fontSize: "0.78rem", lineHeight: 1.55, margin: 0 }}>
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
        <div style={{ background: "#1a1f2e", border: "1px solid #2e3448", borderRadius: "4px", padding: "1rem 1.1rem" }}>
          <div style={{ color: "#d4c9b8", fontFamily: "monospace", fontSize: "0.78rem", marginBottom: "0.4rem" }}>
            Switch to <strong style={{ color: "#c9a96e" }}>{selectedMeta?.label}</strong>?
          </div>
          <p style={{ color: "#5a5460", fontFamily: "monospace", fontSize: "0.72rem", lineHeight: 1.5, margin: "0 0 0.9rem" }}>
            Your current <strong style={{ color: "#8b7d6b" }}>{activeMeta?.label}</strong> data will be saved automatically. The page will reload with {selectedMeta?.label} data.
          </p>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              onClick={handleSwitch}
              disabled={switching}
              style={{
                background: switching ? "transparent" : "#c9a96e22",
                border: `1px solid ${switching ? "#2e3448" : "#c9a96e"}`,
                borderRadius: "3px",
                color: switching ? "#3a3440" : "#c9a96e",
                cursor: switching ? "default" : "pointer",
                fontFamily: "monospace",
                fontSize: "0.75rem",
                letterSpacing: "0.05em",
                padding: "0.45rem 1.1rem",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!switching) { e.currentTarget.style.background = "#c9a96e35"; } }}
              onMouseLeave={e => { if (!switching) { e.currentTarget.style.background = "#c9a96e22"; } }}
            >
              {switching ? "Switching…" : `Switch to ${selectedMeta?.label}`}
            </button>
            <button
              onClick={handleCancel}
              disabled={switching}
              style={{ background: "transparent", border: "1px solid #2e3448", borderRadius: "3px", color: "#5a5460", cursor: switching ? "default" : "pointer", fontFamily: "monospace", fontSize: "0.75rem", padding: "0.45rem 1rem", transition: "all 0.15s" }}
              onMouseEnter={e => { if (!switching) { e.currentTarget.style.borderColor = "#5a5460"; e.currentTarget.style.color = "#8b7d6b"; } }}
              onMouseLeave={e => { if (!switching) { e.currentTarget.style.borderColor = "#2e3448"; e.currentTarget.style.color = "#5a5460"; } }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PreferencesPage ──────────────────────────────────────────────────────────

export default function PreferencesPage({ navigate }) {
  const [activeSection, setActiveSection] = useState("profile");

  return (
    <div style={{ background: "#0f1117", color: "#d4c9b8", display: "flex", flexDirection: "column", fontFamily: "'Georgia','Times New Roman',serif", height: "100vh", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 60%)", borderBottom: "1px solid #2a2f3e", flexShrink: 0, padding: "2rem", zIndex: 50 }}>
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
                  color: isActive ? "#c9a96e" : item.available ? "#8b7d6b" : "#2a2f3e",
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
                onMouseEnter={e => { if (item.available && !isActive) e.currentTarget.style.color = "#a89e8e"; }}
                onMouseLeave={e => { if (item.available && !isActive) e.currentTarget.style.color = "#8b7d6b"; }}
              >
                {item.label}
                {!item.available && (
                  <span style={{ color: "#2a2f3e", fontFamily: "monospace", fontSize: "0.58rem", marginLeft: "0.5rem" }}>soon</span>
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
