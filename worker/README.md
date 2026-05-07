# Foreman reminders Worker

Cloudflare Worker that receives daily task snapshots from the Foreman frontend and posts reminders to Discord.

## First-time setup

```bash
cd worker
npm install
wrangler kv namespace create FOREMAN_KV
# copy the printed `id` into wrangler.toml under [[kv_namespaces]]
wrangler deploy
```

After deploy, `wrangler` prints your Worker URL (e.g. `https://foreman-reminders.<subdomain>.workers.dev`). Put that in the frontend's `.env.local` as `VITE_WORKER_URL`.

## Local dev

```bash
npm run dev          # serves on http://localhost:8787
```

Trigger the cron locally:
```bash
curl "http://localhost:8787/__scheduled?cron=0+16+*+*+*"
```

## Architecture (Phase 1)

- **Storage:** Workers KV, one entry per household keyed `household:<id>`. Value: `{ syncSecret, webhookUrl, sendHourUtc, tasks[], updatedAt }`.
- **Auth:** household ID + 32-byte hex secret, generated client-side on first sync, validated against KV on subsequent syncs. SECURITY: replace before multi-tenant launch.
- **Cron:** daily UTC trigger walks all households, computes due/upcoming, posts to Discord webhook.
- **Snapshot-push:** frontend remains source of truth (localStorage). `/sync` overwrites the household's task list each call.
