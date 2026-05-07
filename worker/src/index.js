// Foreman reminders Worker.
// Two surfaces:
//   1. fetch handler — POST /sync receives a snapshot of upcoming tasks from the frontend
//   2. scheduled handler — daily cron reads each household's snapshot, posts to Discord
//
// SECURITY: per-household auth uses a shared secret stored in KV (set on first sync).
// This is "good enough" for personal/single-household use only. Before launching to a
// wider audience, replace with proper accounts (signed sessions, per-user webhooks,
// rate limiting). See feedback_env_vars / project_foreman memories.

const KV_PREFIX = "household:";

// Keep in sync with REMINDER_MODES in lib/reminders.js — there's no shared
// module between the Vite frontend and the Cloudflare Worker bundle.
const VALID_MODES = ["off", "digest", "dayof", "both"];

// Same regex the frontend uses to validate webhook URLs (lib/reminders.js).
// Discord webhook URL = https://discord.com/api/webhooks/{id}/{token}
const DISCORD_WEBHOOK_RE = /^https:\/\/discord\.com\/api\/webhooks\/[^/]+\/[^/]+/;

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        if (request.method === "OPTIONS") {
            return corsPreflight(request, env);
        }

        if (url.pathname === "/health") {
            return jsonResponse({ ok: true }, 200, request, env);
        }

        if (url.pathname === "/sync" && request.method === "POST") {
            return handleSync(request, env);
        }

        if (url.pathname === "/dispatch" && request.method === "POST") {
            return handleDispatch(request, env);
        }

        return jsonResponse({ error: "not_found" }, 404, request, env);
    },

    async scheduled(event, env, ctx) {
        ctx.waitUntil(runDailyDigest(env));
    },
};

// ---- /dispatch (manual trigger from frontend) ----------------------------
// Lets a household fire its own digest on demand. Same auth as /sync.

async function handleDispatch(request, env) {
    const body = await readJson(request);
    if (!body) return jsonResponse({ error: "invalid_json" }, 400, request, env);

    const auth = await loadAndAuthHousehold(env, body.householdId, body.syncSecret, { requireExisting: true });
    if (auth.error) return jsonResponse({ error: auth.error }, auth.status, request, env);

    try {
        const sent = await dispatchForHousehold(auth.record);
        return jsonResponse({ ok: true, dispatched: sent }, 200, request, env);
    } catch (err) {
        return jsonResponse({ error: "dispatch_failed", detail: String(err.message || err) }, 500, request, env);
    }
}

// ---- /sync ---------------------------------------------------------------

async function handleSync(request, env) {
    const body = await readJson(request);
    if (!body) return jsonResponse({ error: "invalid_json" }, 400, request, env);

    const { householdId, syncSecret, webhookUrl, sendHourLocal, timezone, tasks } = body;

    const auth = await loadAndAuthHousehold(env, householdId, syncSecret, { requireExisting: false });
    if (auth.error) return jsonResponse({ error: auth.error }, auth.status, request, env);

    if (!isValidWebhookUrl(webhookUrl)) {
        return jsonResponse({ error: "invalid_webhook" }, 400, request, env);
    }
    if (!Array.isArray(tasks)) {
        return jsonResponse({ error: "tasks_must_be_array" }, 400, request, env);
    }

    const record = {
        syncSecret,
        webhookUrl,
        sendHourLocal: Number.isInteger(sendHourLocal) && sendHourLocal >= 0 && sendHourLocal <= 23 ? sendHourLocal : 9,
        timezone: isValidTimezone(timezone) ? timezone : "UTC",
        tasks: tasks.map(normalizeTask),
        updatedAt: new Date().toISOString(),
    };

    await env.FOREMAN_KV.put(KV_PREFIX + householdId, JSON.stringify(record));
    return jsonResponse({ ok: true, count: record.tasks.length }, 200, request, env);
}

function normalizeTask(t) {
    return {
        key: String(t.key || ""),
        category: String(t.category || ""),
        item: String(t.item || ""),
        task: String(t.task || ""),
        nextDate: t.nextDate ? String(t.nextDate) : null,
        mode: VALID_MODES.includes(t.mode) ? t.mode : "off",
        leadDays: Number.isInteger(t.leadDays) ? t.leadDays : 7,
    };
}

// Validate creds, look up record, and check the sync-secret matches if a record
// exists. Returns either { record } (record may be null on first sync) or
// { error, status } describing the failure for the caller to forward.
//
// SECURITY: secret comparison isn't constant-time. The runtime doesn't expose
// timingSafeEqual; secrets are 32 bytes of randomness so practical collision
// risk via timing is nil. Replace before multi-tenant launch.
async function loadAndAuthHousehold(env, householdId, syncSecret, { requireExisting }) {
    if (!isValidId(householdId) || !isValidSecret(syncSecret)) {
        return { error: "missing_credentials", status: 400 };
    }
    const record = await env.FOREMAN_KV.get(KV_PREFIX + householdId, "json");
    if (requireExisting && !record) {
        return { error: "household_not_found", status: 404 };
    }
    if (record && record.syncSecret !== syncSecret) {
        return { error: "auth_failed", status: 403 };
    }
    return { record };
}

async function readJson(request) {
    try { return await request.json(); }
    catch { return null; }
}

// ---- scheduled cron ------------------------------------------------------

async function runDailyDigest(env) {
    // Cron fires every hour. For each household, compute the current local hour
    // in *their* timezone and dispatch only when it matches their chosen
    // sendHourLocal. This is DST-correct: 9am stays 9am year-round.
    const now = new Date();

    const list = await env.FOREMAN_KV.list({ prefix: KV_PREFIX });
    for (const k of list.keys) {
        const record = await env.FOREMAN_KV.get(k.name, "json");
        if (!record) continue;
        const targetHour = Number.isInteger(record.sendHourLocal) ? record.sendHourLocal : 9;
        const tz = record.timezone || "UTC";
        const currentLocalHour = localHourInTz(now, tz);
        if (targetHour !== currentLocalHour) continue;
        try {
            await dispatchForHousehold(record);
        } catch (err) {
            console.error(`dispatch failed for ${k.name}:`, err);
        }
    }
}

function localHourInTz(date, timezone) {
    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            hour12: false,
            hour: "2-digit",
        }).formatToParts(date);
        const h = parts.find(p => p.type === "hour")?.value;
        const n = parseInt(h, 10);
        // Intl returns "24" for midnight in some locales — normalize to 0
        return Number.isInteger(n) ? n % 24 : 0;
    } catch {
        return date.getUTCHours();
    }
}

async function dispatchForHousehold(record) {
    const tz = record.timezone || "UTC";
    const todayLocal = localDateString(new Date(), tz);

    const digestItems = [];
    const dayOfItems = [];

    for (const task of record.tasks) {
        if (!task.nextDate || task.mode === "off") continue;
        const dueDateObj = new Date(task.nextDate);
        if (Number.isNaN(dueDateObj.getTime())) continue;
        const dueLocal = localDateString(dueDateObj, tz);

        const daysUntil = daysBetween(todayLocal, dueLocal);

        if ((task.mode === "dayof" || task.mode === "both") && daysUntil === 0) {
            dayOfItems.push({ task, daysUntil });
        }
        if ((task.mode === "digest" || task.mode === "both") && daysUntil >= 0 && daysUntil <= task.leadDays) {
            digestItems.push({ task, daysUntil });
        }
    }

    const total = digestItems.length + dayOfItems.length;
    if (total === 0) return { digest: 0, dayOf: 0, total: 0, posted: false };

    const content = formatDiscordMessage(digestItems, dayOfItems);
    await postToDiscord(record.webhookUrl, content);
    return { digest: digestItems.length, dayOf: dayOfItems.length, total, posted: true };
}

// ---- Discord formatting ---------------------------------------------------

function formatDiscordMessage(digestItems, dayOfItems) {
    const lines = [];

    if (dayOfItems.length > 0) {
        lines.push("**Due today**");
        for (const { task } of dayOfItems) {
            lines.push(`- ${task.category} / ${task.item} — ${task.task}`);
        }
        lines.push("");
    }

    if (digestItems.length > 0) {
        const horizon = Math.max(...digestItems.map(i => i.daysUntil));
        lines.push(`**Coming up (next ${horizon} days)**`);
        const sorted = [...digestItems].sort((a, b) => a.daysUntil - b.daysUntil);
        for (const { task, daysUntil } of sorted) {
            const when = daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`;
            lines.push(`- [${when}] ${task.category} / ${task.item} — ${task.task}`);
        }
    }

    return lines.join("\n");
}

async function postToDiscord(webhookUrl, content) {
    const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Discord ${res.status}: ${body}`);
    }
}

// ---- helpers --------------------------------------------------------------

function isValidId(s) {
    return typeof s === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(s);
}

function isValidSecret(s) {
    return typeof s === "string" && /^[a-f0-9]{32,128}$/.test(s);
}

function isValidWebhookUrl(url) {
    return typeof url === "string" && DISCORD_WEBHOOK_RE.test(url);
}

function startOfUtcDay(d) {
    const x = new Date(d);
    x.setUTCHours(0, 0, 0, 0);
    return x;
}

// Format a Date as "YYYY-MM-DD" in the given IANA timezone.
// Critical for "is this task due today in the user's wall-clock?" — comparing UTC
// instants gives wrong answers near midnight in non-UTC zones.
function localDateString(date, timezone) {
    try {
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(date);
    } catch {
        // Bad timezone → fall back to UTC date
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "UTC",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(date);
    }
}

// Calendar-day difference between two "YYYY-MM-DD" strings (toYmd minus fromYmd).
function daysBetween(fromYmd, toYmd) {
    const [fy, fm, fd] = fromYmd.split("-").map(Number);
    const [ty, tm, td] = toYmd.split("-").map(Number);
    const from = Date.UTC(fy, fm - 1, fd);
    const to   = Date.UTC(ty, tm - 1, td);
    return Math.round((to - from) / 86400000);
}

function isValidTimezone(tz) {
    if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
    try {
        new Intl.DateTimeFormat("en-CA", { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}

function corsHeaders(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.FOREMAN_ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || "*";
    return {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
    };
}

function corsPreflight(request, env) {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

function jsonResponse(obj, status, request, env) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: {
            "Content-Type": "application/json",
            ...corsHeaders(request, env),
        },
    });
}
