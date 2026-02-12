# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Briefly is an AI-powered news summarization platform. It fetches articles from RSS feeds, summarizes them with OpenAI, and delivers briefings (currently via Discord webhooks). The codebase is CLI-first with BullMQ background jobs — no web server.

**Note:** The README.md is outdated. It references Prisma, Express, email/auth features, and scripts (`pnpm dev`, `pnpm db:migrate`, `pnpm db:seed`) that no longer exist. The project migrated to Supabase and the current feature set is what's in `src/`.

## Build & Run Commands

```bash
pnpm install                          # Install dependencies
pnpm build                            # TypeScript compilation (tsc → dist/)
pnpm cli <command>                    # Run CLI commands (tsx src/cli/index.ts)
pnpm worker                           # Start BullMQ worker (tsx src/worker.ts)
docker compose up -d                  # Start Redis (required for worker/jobs)
```

There are no tests or linting configured.

## Required Environment Variables

Copy `.env.example` to `.env`. Required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`. Optional: `REDIS_URL` (defaults localhost), `OPENAI_MODEL` (defaults gpt-4o-mini), `DISCORD_WEBHOOK_URL`.

## Architecture

**Runtime:** TypeScript (strict, ESM via NodeNext), Node.js 22+, pnpm

### Module Layout

- **`src/config/`** — Singleton initializers for all external services (Supabase, Redis, OpenAI, env validation, Winston logger). Every module imports connections from here.
- **`src/cli/`** — Commander.js commands. `index.ts` registers command groups. Each file exports a `register*Commands(program)` function.
- **`src/services/`** — Business logic:
  - `rss/feedFetcher.ts` — Single feed fetch with ETag/If-Modified-Since conditional headers
  - `rss/bulkFetcher.ts` — Orchestrates all active feeds, deduplicates by URL/GUID/content_hash
  - `rss/contentFetcher.ts` — Extracts article body via Mozilla Readability + linkedom
  - `ai/summarizer.ts` — OpenAI calls with exponential backoff retry (3 attempts)
  - `ai/promptBuilder.ts` — Prompt construction for summarization
  - `briefings/compiler.ts` — Matches articles to user topics (max 5/topic, 20/user, last 24h)
  - `discord/poster.ts` — Formats and posts to Discord webhooks (handles 10-embed limit)
- **`src/jobs/`** — BullMQ job handlers and cron definitions in `queues.ts`:
  - Fetch feeds: every 2h → Summarize: triggered after fetch → Compile briefings: 6am UTC daily → Cleanup: Sundays 3am UTC

### Data Flow

RSS feeds → `bulkFetcher` (dedupe + store) → `summarizer` (OpenAI) → `compiler` (match to user topics) → `discord/poster` (deliver)

### Database

Supabase (PostgreSQL) via `@supabase/supabase-js` with service role key (bypasses RLS). Schema lives in `supabase/migration.sql`. Key tables: `users`, `topics`, `sources`, `articles` (with `summary_status` enum: pending/processing/completed/failed), `briefings`, `briefing_articles`. All queries use the Supabase JS client `.from().select().eq()` pattern.

### CLI Commands

Commands follow the pattern `<resource>:<action>`: `users:create`, `users:list`, `users:subscribe`, `sources:add`, `sources:list`, `sources:link`, `sources:test-fetch`, `topics:create`, `topics:list`, `articles:fetch` (supports `-s <id>` for single source), `articles:summarize`, `articles:stats`, `briefings:stats`, `discord:post`.
