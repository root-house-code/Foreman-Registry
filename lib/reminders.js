// Reminder agent client: household identity, per-task mode storage, and sync to Worker.
// SECURITY: household-id + sync-secret is single-tenant friendly only. Replace with
// real auth before opening this to multiple households. See project_foreman memory.

import { loadChores, loadChoreNextDates } from "./chores.js";

const ID_KEY              = "foreman-household-id";
const SECRET_KEY          = "foreman-sync-secret";
const WEBHOOK_KEY         = "foreman-discord-webhook";
const SEND_HOUR_LOCAL_KEY = "foreman-send-hour-local";
const TIMEZONE_KEY        = "foreman-timezone";
const LEAD_DAYS_KEY       = "foreman-lead-days";
const MODES_KEY           = "foreman-reminder-modes";
const CHORE_MODES_KEY     = "foreman-chore-reminder-modes";
const LAST_SYNC_KEY       = "foreman-last-sync";

// Keep in sync with VALID_MODES in worker/src/index.js — there's no shared
// module between the Vite frontend and the Cloudflare Worker bundle.
export const REMINDER_MODES = ["off", "digest", "dayof", "both"];

// Common US timezones offered as friendly presets. Users with other zones
// keep their auto-detected IANA name (we don't lose information).
export const TIMEZONE_PRESETS = [
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Denver",      label: "Mountain (MT)" },
  { value: "America/Phoenix",     label: "Arizona (no DST)" },
  { value: "America/Chicago",     label: "Central (CT)" },
  { value: "America/New_York",    label: "Eastern (ET)" },
  { value: "America/Anchorage",   label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu",    label: "Hawaii (HT)" },
  { value: "UTC",                 label: "UTC" },
];

// Human label for an hour in 0-23 (e.g., 9 → "9:00 AM", 17 → "5:00 PM").
export function formatHour12(h) {
  const hour = ((h % 12) === 0) ? 12 : (h % 12);
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour}:00 ${ampm}`;
}

export function getHouseholdId() {
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = randomId();
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function getSyncSecret() {
  let s = localStorage.getItem(SECRET_KEY);
  if (!s) {
    s = randomHex(32);
    localStorage.setItem(SECRET_KEY, s);
  }
  return s;
}

export function getWebhookUrl() {
  return localStorage.getItem(WEBHOOK_KEY) || "";
}

export function setWebhookUrl(url) {
  localStorage.setItem(WEBHOOK_KEY, url);
}

// Stored as a local hour (0-23) interpreted in the household's timezone.
// Worker computes the current local hour at cron-fire time and dispatches
// only when it matches — DST-correct, no user-side math.
export function getSendHourLocal() {
  const v = parseInt(localStorage.getItem(SEND_HOUR_LOCAL_KEY) ?? "9", 10);
  return Number.isInteger(v) && v >= 0 && v <= 23 ? v : 9;
}

export function setSendHourLocal(h) {
  localStorage.setItem(SEND_HOUR_LOCAL_KEY, String(h));
}

export function getLeadDays() {
  const v = parseInt(localStorage.getItem(LEAD_DAYS_KEY) ?? "7", 10);
  return Number.isInteger(v) && v >= 0 && v <= 365 ? v : 7;
}

export function setLeadDays(d) {
  localStorage.setItem(LEAD_DAYS_KEY, String(d));
}

// Default to the browser-detected IANA zone on first run; respect user override.
export function getTimezone() {
  const stored = localStorage.getItem(TIMEZONE_KEY);
  if (stored) return stored;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function setTimezone(tz) {
  localStorage.setItem(TIMEZONE_KEY, tz);
}

export function loadReminderModes() {
  try { return JSON.parse(localStorage.getItem(MODES_KEY) || "{}"); }
  catch { return {}; }
}

export function saveReminderModes(modes) {
  localStorage.setItem(MODES_KEY, JSON.stringify(modes));
}

export function loadChoreReminderModes() {
  try { return JSON.parse(localStorage.getItem(CHORE_MODES_KEY) || "{}"); }
  catch { return {}; }
}

export function saveChoreReminderModes(modes) {
  localStorage.setItem(CHORE_MODES_KEY, JSON.stringify(modes));
}

export function getReminderMode(modes, key) {
  return REMINDER_MODES.includes(modes[key]) ? modes[key] : "off";
}

export function getLastSyncIso() {
  return localStorage.getItem(LAST_SYNC_KEY) || null;
}

function setLastSyncIso(iso) {
  localStorage.setItem(LAST_SYNC_KEY, iso);
}

export function buildChoreSnapshot({ chores, choreNextDates, choreModes, leadDays }) {
  const tasks = [];
  for (const chore of chores) {
    const mode = getReminderMode(choreModes, chore.id);
    if (mode === "off") continue;
    const next = choreNextDates[chore.id];
    if (!next) continue;
    tasks.push({
      key: `chore:${chore.id}`,
      category: chore.room,
      item: "",
      task: chore.title,
      nextDate: next instanceof Date ? next.toISOString() : next,
      mode,
      leadDays,
    });
  }
  return tasks;
}

// Build the snapshot the Worker expects from the live frontend state.
export function buildSnapshot({ rows, nextDates, modes, leadDays }) {
  const tasks = [];
  for (const row of rows) {
    if (row._isBlankCategory) continue;
    const key = `${row.category}|${row.item}|${row.task}`;
    const mode = getReminderMode(modes, key);
    if (mode === "off") continue;
    const next = nextDates[key];
    if (!next) continue;
    tasks.push({
      key,
      category: row.category,
      item: row.item,
      task: row.task,
      nextDate: next instanceof Date ? next.toISOString() : next,
      mode,
      leadDays,
    });
  }
  return tasks;
}

async function postToWorker(path, body) {
  const workerUrl = import.meta.env.VITE_WORKER_URL;
  if (!workerUrl) throw new Error("VITE_WORKER_URL is not set. Check .env.local.");

  const res = await fetch(`${workerUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error || ""; } catch {}
    throw new Error(`Worker ${path} failed (${res.status}): ${detail}`);
  }
  return res.json();
}

export async function syncReminders({ rows, nextDates, modes }) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) throw new Error("Discord webhook URL is not configured.");

  const leadDays = getLeadDays();
  const maintenanceTasks = buildSnapshot({ rows, nextDates, modes, leadDays });
  const choreTasks = buildChoreSnapshot({
    chores: loadChores(),
    choreNextDates: loadChoreNextDates(),
    choreModes: loadChoreReminderModes(),
    leadDays,
  });

  const result = await postToWorker("/sync", {
    householdId: getHouseholdId(),
    syncSecret: getSyncSecret(),
    webhookUrl,
    sendHourLocal: getSendHourLocal(),
    timezone: getTimezone(),
    tasks: [...maintenanceTasks, ...choreTasks],
  });
  setLastSyncIso(new Date().toISOString());
  return result;
}

// Manually fire a Discord post for the current household (uses already-synced KV state).
export async function dispatchReminders() {
  return postToWorker("/dispatch", {
    householdId: getHouseholdId(),
    syncSecret: getSyncSecret(),
  });
}

// ---- helpers ----

function randomId() {
  // 16 bytes of randomness, base36 — readable, URL-safe, fits Worker validator
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(36).padStart(2, "0")).join("").slice(0, 24);
}

function randomHex(byteCount) {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
