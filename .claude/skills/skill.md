# Briefly — Product Knowledge Base

## What Is Briefly

Briefly is an AI-powered news summarization platform. It ingests RSS feeds, summarizes articles with OpenAI, matches them to user-defined topics, and delivers daily briefings via Discord. It has two interfaces: a CLI for admin operations and a web UI for both admin and end-user experiences.

## Architecture at a Glance

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  RSS Feeds  │───▶│ bulkFetcher  │───▶│ summarizer  │───▶│   compiler   │
│  (sources)  │    │ (dedupe/store)│   │  (OpenAI)   │    │(topic match) │
└─────────────┘    └──────────────┘    └─────────────┘    └──────┬───────┘
                                                                 │
                                                          ┌──────▼───────┐
                                                          │ discord/post │
                                                          │  (webhooks)  │
                                                          └──────────────┘
```

**Tech stack:** TypeScript (strict ESM), Node 22+, pnpm, Supabase (PostgreSQL + Auth), OpenAI, BullMQ + Redis, Hono (API), React 19 + Tailwind + TanStack Query (web).

## Module Map

| Layer | Location | Purpose |
|-------|----------|---------|
| Config | `src/config/` | Singleton clients: Supabase, Redis, OpenAI, env, logger |
| CLI | `src/cli/` | Commander.js commands (`<resource>:<action>` pattern) |
| Services | `src/services/` | Core business logic (RSS, AI, briefings, Discord) |
| Jobs | `src/jobs/` | BullMQ queues + cron (fetch 2h, briefings 6am, cleanup Sun) |
| API | `src/api/` | Hono REST server on port 5174 with JWT auth + admin middleware |
| Web | `web/src/` | React SPA — state-based routing, role-based views |

## Key Concepts

### Users & Roles

Two roles: `admin` and `user`. Auth via Supabase Auth with a trigger that auto-creates a `public.users` row. Admins get full CRUD + pipeline controls. Users get a personalized feed, topic subscriptions, and source favorites.

### Sources & Topics

**Sources** are RSS feeds (url + feed_url). **Topics** are categories with name, slug, emoji, and keyword array. Sources link to topics via `source_topics` (many-to-many). Users subscribe to topics via `user_topics` (with priority).

### The Pipeline

The core data flow runs in 4 stages — can be triggered via CLI (`pipeline:run`), API (`POST /api/pipeline/run`), or BullMQ cron jobs:

1. **Fetch** — `bulkFetcher` pulls all active sources with ETag/If-Modified-Since. Dedupes by URL/GUID/content_hash. New articles stored as `pending`.
2. **Summarize** — `summarizer` fetches full content (Readability + linkedom), sends to OpenAI, stores 1-sentence summary. Retries 3x with exponential backoff.
3. **Compile** — `compiler` matches summarized articles to user topics (max 5/topic, 20/user, last 24h). Creates briefing records.
4. **Deliver** — `poster` sends to Discord webhook as embeds (one per article, 500ms throttle, topic-colored).

### Article Lifecycle

`pending` → `processing` → `completed` or `failed`

Status tracked in `articles.summary_status` enum. The summarizer picks up `pending` articles (optionally retries `failed`).

## Web UI Structure

Two distinct experiences based on role:

**Admin pages:** Dashboard (stats + 7-day chart), Articles (filterable table + detail modal), Sources (grid + fetch actions), Topics (grid), Users (table), Briefings (table + detail)

**User pages:** Home (personalized feed by topic), My Topics (subscribe/unsubscribe grid), My Sources (favorite sources), My Briefings (view compiled briefings), Settings (name, timezone, delivery hour)

Navigation: `<Sidebar>` component with responsive hamburger on mobile. Routing is manual state-based (`useState<Page>()`) — no react-router.

## Deep Dives

For detailed module documentation, see:

- [resources/backend-services.md](resources/backend-services.md) — RSS fetching, AI summarization, briefing compilation, Discord posting
- [resources/frontend-guide.md](resources/frontend-guide.md) — Pages, components, hooks, mutations, auth context
- [resources/database-schema.md](resources/database-schema.md) — All tables, enums, RLS policies, migrations
- [resources/api-endpoints.md](resources/api-endpoints.md) — Hono REST routes, auth middleware, request/response shapes
- [resources/jobs-and-cron.md](resources/jobs-and-cron.md) — BullMQ queues, cron schedules, job handlers, worker setup
