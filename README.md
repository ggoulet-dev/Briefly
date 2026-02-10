# Briefly

Briefly collects news articles from RSS feeds, summarizes them with OpenAI, and sends you a personalized email briefing every morning. Stay informed in minutes, not hours.

## How it works

1. RSS feeds are fetched every 2 hours
2. New articles get summarized by GPT
3. At 6am UTC, each user gets an email with their articles grouped by topic
4. That's it

## Prerequisites

- Node.js 22+
- PostgreSQL
- Redis
- An OpenAI API key

## Setup

```bash
pnpm install
cp .env.example .env         # then fill in your values
pnpm db:migrate
pnpm db:seed                 # creates default topics + Radio-Canada feed
```

## Running

```bash
pnpm dev      # web server (port 3000)
pnpm worker   # background jobs (fetch, summarize, compile, send)
```

Or with a process manager:

```bash
# Procfile includes both processes
web: npx tsx src/server.ts
worker: npx tsx src/worker.ts
```

## CLI

Everything is managed through the CLI. No admin panel needed.

```bash
# Users
pnpm cli users:create user@example.com "Jane Doe"
pnpm cli users:list
pnpm cli users:subscribe user@example.com news,tech

# Sources
pnpm cli sources:add "Hacker News" https://news.ycombinator.com/rss https://news.ycombinator.com tech
pnpm cli sources:list
pnpm cli sources:test-fetch 1

# Topics
pnpm cli topics:list
pnpm cli topics:create Sports sports "sports,nfl,hockey,soccer"

# Pipeline
pnpm cli articles:fetch
pnpm cli articles:summarize
pnpm cli articles:stats

# Briefings
pnpm cli briefings:send-now user@example.com
pnpm cli briefings:stats
```

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `OPENAI_API_KEY` | Your OpenAI key |
| `OPENAI_MODEL` | Model to use (default: `gpt-4o-mini`) |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | Sender address |
| `SESSION_SECRET` | Secret for session cookies |
| `APP_URL` | Base URL for magic links |

For development email, [Ethereal](https://ethereal.email/) works great — it catches all outgoing mail so you can preview without sending anything real.

## Background jobs

The worker runs these on a schedule:

| Job | Schedule | What it does |
|---|---|---|
| Fetch articles | Every 2h | Parses all active RSS feeds |
| Summarize | After each fetch | Sends new articles to GPT |
| Compile briefings | 6am UTC daily | Matches articles to user topics |
| Send briefings | After compile | Delivers emails |
| Cleanup | Sundays 3am UTC | Purges old articles (30d), briefings (90d), tokens (7d) |

## Project structure

```
src/
  server.ts          # Express app
  worker.ts          # BullMQ workers
  cli/               # CLI commands
  config/            # Database, Redis, OpenAI, env, logger
  jobs/              # Job processors + queue definitions
  routes/            # Auth + preferences endpoints
  services/
    rss/             # Feed fetching
    ai/              # Summarization
    briefings/       # Briefing compilation
    auth/            # Magic link auth
    email/           # Nodemailer transports + mailers
  templates/         # Handlebars email templates
prisma/
  schema.prisma      # Data model
  seed.ts            # Default topics + Radio-Canada feed
```

## Auth

There are no passwords. Users sign in with magic links sent to their email. The only web routes are:

- `GET /auth/verify?token=...` — verify a magic link
- `GET /preferences` — view topic subscriptions
- `PATCH /preferences` — update subscriptions

## Tech stack

TypeScript, Express 5, Prisma 7, BullMQ, OpenAI, Nodemailer, PostgreSQL, Redis.
