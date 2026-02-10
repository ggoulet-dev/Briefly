# Briefly — AI-Powered Daily News Summarization Platform

## Context

We're building **Briefly**, a platform that collects articles from RSS feeds, summarizes them with OpenAI GPT, and delivers personalized email briefings each morning. The goal is to help users stay informed in minutes. This is a greenfield MVP — the project directory is empty.

## Tech Stack

| Layer | Choice |
|---|---|
| Language | TypeScript 5.x |
| Runtime | Node.js 22.x |
| Framework | Express.js (API-minimal) |
| Background Jobs | BullMQ + Redis |
| AI | OpenAI GPT (`gpt-4o-mini` default, configurable) via official Node SDK |
| News Collection | rss-parser + native fetch |
| Email | Nodemailer + SMTP (any provider) |
| Database | PostgreSQL via Prisma ORM |
| Auth | Passwordless magic links (bcrypt token hashing) |
| Interface | Email delivery + CLI scripts (minimal web for auth/prefs only) |
| Package Manager | pnpm |

## Data Model

```
User ----< UserTopic >---- Topic ----< SourceTopic >---- Source ----< Article
User ----< Briefing ----< BriefingArticle >---- Article
User ----< MagicLink
```

### Prisma Schema

```prisma
enum SummaryStatus {
  pending
  processing
  completed
  failed
}

enum BriefingStatus {
  pending
  compiled
  sending
  sent
  failed
}

model User {
  id           Int          @id @default(autoincrement())
  email        String       @unique
  name         String?
  active       Boolean      @default(true)
  timezone     String       @default("UTC")
  deliveryHour Int          @default(6)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  userTopics   UserTopic[]
  briefings    Briefing[]
  magicLinks   MagicLink[]

  @@map("users")
}

model Topic {
  id           Int           @id @default(autoincrement())
  name         String
  slug         String        @unique
  description  String?
  keywords     String[]
  createdAt    DateTime      @default(now())
  userTopics   UserTopic[]
  sourceTopics SourceTopic[]

  @@map("topics")
}

model UserTopic {
  id       Int   @id @default(autoincrement())
  userId   Int
  topicId  Int
  priority Int   @default(0)
  user     User  @relation(fields: [userId], references: [id])
  topic    Topic @relation(fields: [topicId], references: [id])

  @@unique([userId, topicId])
  @@map("user_topics")
}

model Source {
  id            Int           @id @default(autoincrement())
  name          String
  url           String
  feedUrl       String
  active        Boolean       @default(true)
  lastFetchedAt DateTime?
  etag          String?
  lastModified  String?
  fetchFailures Int           @default(0)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  articles      Article[]
  sourceTopics  SourceTopic[]

  @@map("sources")
}

model SourceTopic {
  id       Int    @id @default(autoincrement())
  sourceId Int
  topicId  Int
  source   Source @relation(fields: [sourceId], references: [id])
  topic    Topic  @relation(fields: [topicId], references: [id])

  @@unique([sourceId, topicId])
  @@map("source_topics")
}

model Article {
  id              Int               @id @default(autoincrement())
  sourceId        Int
  title           String
  url             String
  author          String?
  content         String?
  summary         String?
  summaryStatus   SummaryStatus     @default(pending)
  publishedAt     DateTime?
  guid            String?
  contentHash     String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  source          Source            @relation(fields: [sourceId], references: [id])
  briefingArticles BriefingArticle[]

  @@unique([url])
  @@index([summaryStatus])
  @@map("articles")
}

model Briefing {
  id            Int               @id @default(autoincrement())
  userId        Int
  briefingDate  DateTime          @db.Date
  status        BriefingStatus    @default(pending)
  compiledAt    DateTime?
  sentAt        DateTime?
  articleCount  Int               @default(0)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  user          User              @relation(fields: [userId], references: [id])
  briefingArticles BriefingArticle[]

  @@unique([userId, briefingDate])
  @@map("briefings")
}

model BriefingArticle {
  id         Int      @id @default(autoincrement())
  briefingId Int
  articleId  Int
  position   Int
  topicSlug  String
  briefing   Briefing @relation(fields: [briefingId], references: [id])
  article    Article  @relation(fields: [articleId], references: [id])

  @@map("briefing_articles")
}

model MagicLink {
  id          Int       @id @default(autoincrement())
  userId      Int
  tokenDigest String
  purpose     String    @default("signin")
  expiresAt   DateTime
  usedAt      DateTime?
  ipAddress   String?
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id])

  @@map("magic_links")
}
```

## Daily Pipeline (BullMQ Jobs)

```
[Cron: every 2h]  fetchArticles      — parse all active RSS feeds, store new articles
        |
        v
                  summarizeArticles  — send unsummarized articles to GPT, store summaries
        |
        v
[Cron: 6am UTC]   compileBriefings   — match articles to user topics, build briefings
        |
        v
                  sendBriefing       — deliver email per user via Nodemailer

[Cron: weekly]    cleanup            — purge old articles (30d), briefings (90d), tokens (7d)
```

Queues prioritized: `mailers > briefings > ai > feeds > maintenance`

## Core Services

| Service | Responsibility |
|---|---|
| `rss/feedFetcher` | Parse a single RSS feed (conditional HTTP via ETag/If-Modified-Since headers) |
| `rss/bulkFetcher` | Orchestrate fetching all active feeds, deduplicate articles (URL + guid + content_hash) |
| `ai/promptBuilder` | Build system/user prompts for summarization |
| `ai/summarizer` | Call OpenAI API with retries (exponential backoff), rate limiting (1s between calls) |
| `briefings/compiler` | Match recent summarized articles to user topics, assemble briefing (max 5/topic, 20 total) |
| `auth/magicLinkGenerator` | Create secure token, store bcrypt digest, set expiry |
| `auth/magicLinkVerifier` | Verify token, mark used, return user |

## Email

- **sendBriefingEmail** — HTML + plain text templates (via Nodemailer), articles grouped by topic, source attribution, unsubscribe link
- **sendAuthEmail** — Magic link sign-in email

## Minimal Web Routes (auth + preferences only)

- `GET /auth/verify` — verify magic link token, set session
- `GET /preferences` — show topic checkboxes
- `PATCH /preferences` — update user topics

## CLI Scripts

All CLI commands run via `pnpm cli <command>` using a script entry in `package.json` that runs `tsx src/cli/index.ts`.

- `pnpm cli users:create <email> [name]` — create user + send magic link
- `pnpm cli users:list` — list all users with topics
- `pnpm cli users:subscribe <email> <topic_slugs>` — subscribe user to topics
- `pnpm cli sources:add <name> <feed_url> <url> <topic_slugs>` — add RSS source
- `pnpm cli sources:list` / `sources:test-fetch <id>` — manage sources
- `pnpm cli topics:list` / `topics:create <name> <slug> <keywords>` — manage topics
- `pnpm cli articles:fetch` / `articles:summarize` — manual pipeline triggers
- `pnpm cli briefings:send-now <email>` / `briefings:stats` — send/monitor briefings

## Key Dependencies

```json
{
  "dependencies": {
    "express": "^5.1",
    "prisma": "^7.x",
    "@prisma/client": "^7.x",
    "bullmq": "^5.x",
    "ioredis": "^5.x",
    "openai": "^6.x",
    "rss-parser": "^3.x",
    "nodemailer": "^8.x",
    "bcrypt": "^6.x",
    "express-session": "^1.x",
    "dotenv": "^17.x",
    "commander": "^14.x",
    "winston": "^3.x",
    "handlebars": "^4.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tsx": "^4.x",
    "@types/express": "^5.x",
    "@types/node": "^22.x",
    "@types/bcrypt": "^6.x",
    "@types/nodemailer": "^7.x",
    "@types/express-session": "^1.x"
  }
}
```

## Project Structure

```
briefly/
├── src/
│   ├── server.ts                  # Express app entry point
│   ├── worker.ts                  # BullMQ worker entry point
│   ├── config/
│   │   ├── database.ts            # Prisma client singleton
│   │   ├── redis.ts               # Redis/IORedis connection
│   │   ├── openai.ts              # OpenAI client init
│   │   └── env.ts                 # Environment variable validation
│   ├── services/
│   │   ├── rss/
│   │   │   ├── feedFetcher.ts
│   │   │   └── bulkFetcher.ts
│   │   ├── ai/
│   │   │   ├── promptBuilder.ts
│   │   │   └── summarizer.ts
│   │   ├── briefings/
│   │   │   └── compiler.ts
│   │   ├── auth/
│   │   │   ├── magicLinkGenerator.ts
│   │   │   └── magicLinkVerifier.ts
│   │   └── email/
│   │       ├── transporter.ts     # Nodemailer transport config
│   │       ├── briefingMailer.ts
│   │       └── authMailer.ts
│   ├── jobs/
│   │   ├── queues.ts              # Queue definitions + cron schedules
│   │   ├── fetchArticles.ts
│   │   ├── summarizeArticles.ts
│   │   ├── compileBriefings.ts
│   │   ├── sendBriefing.ts
│   │   └── cleanup.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   └── preferences.ts
│   ├── templates/
│   │   ├── briefing.html.hbs
│   │   ├── briefing.text.hbs
│   │   └── magicLink.html.hbs
│   └── cli/
│       ├── index.ts               # Commander.js entry point
│       ├── users.ts
│       ├── sources.ts
│       ├── topics.ts
│       ├── articles.ts
│       └── briefings.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── Procfile                       # web + worker processes
```

## Implementation Phases

### Phase 1: Foundation
- `pnpm init` + install all dependencies
- Configure `tsconfig.json` (strict mode, ES2022 target, NodeNext module)
- Set up Prisma: `npx prisma init`, define full schema, `npx prisma migrate dev`
- Create config modules (database, redis, openai, env)
- Create `prisma/seed.ts` with default topics + Radio-Canada source, run `npx prisma db seed`

### Phase 2: RSS Fetching
- Implement `rss/feedFetcher.ts` and `rss/bulkFetcher.ts`
- Implement `fetchArticles` job
- Add `articles:fetch` and `sources:test-fetch` CLI commands
- Verify: `pnpm cli articles:fetch` stores articles in DB

### Phase 3: AI Summarization
- Configure OpenAI client in `config/openai.ts`
- Implement `ai/promptBuilder.ts` and `ai/summarizer.ts`
- Implement `summarizeArticles` job
- Add `articles:summarize` CLI command
- Verify: `pnpm cli articles:summarize` populates summary column

### Phase 4: Briefing + Email
- Implement `briefings/compiler.ts`
- Create Handlebars email templates (HTML + text)
- Implement `email/briefingMailer.ts` with Nodemailer
- Implement `compileBriefings` and `sendBriefing` jobs
- Configure Nodemailer SMTP (Ethereal for dev)
- Add `briefings:send-now` CLI command
- Verify: full pipeline fetch -> summarize -> compile -> send

### Phase 5: Auth + Preferences
- Implement `auth/magicLinkGenerator.ts` and `auth/magicLinkVerifier.ts`
- Implement `email/authMailer.ts`
- Create Express routes for `/auth/verify`, `/preferences`
- Set up `express-session` with basic session store
- Add `users:create` CLI command
- Verify: create user -> receive magic link -> click -> select topics

### Phase 6: BullMQ Cron + Orchestration
- Define all queues and cron schedules in `jobs/queues.ts`
- Implement `cleanup` job
- Create `src/worker.ts` (BullMQ worker process)
- Add all remaining CLI commands
- Add `Procfile` (`web: tsx src/server.ts` + `worker: tsx src/worker.ts`)
- Verify: automated pipeline runs on schedule

### Phase 7: Polish
- Error handling and logging (Winston) across all services
- `briefings:stats` and `articles:stats` monitoring CLI commands
- README with setup instructions

## Test Feed

For development/testing, use Radio-Canada's "À la une" RSS feed:
- **URL**: `https://ici.radio-canada.ca/info/rss/info/a-la-une`
- This will be the default seed source, mapped to a general "News" topic

Note: This is a French-language feed. Summaries will be generated in the article's original language (French). GPT handles French natively — no translation needed.

## Verification

1. `pnpm cli articles:fetch` — confirm articles from Radio-Canada appear in `articles` table
2. `pnpm cli articles:summarize` — confirm summaries populate
3. `pnpm cli users:create test@example.com` — confirm magic link email arrives
4. `pnpm cli users:subscribe test@example.com news` — confirm topic subscriptions
5. `pnpm cli briefings:send-now test@example.com` — confirm email arrives with summarized articles grouped by topic
6. Start worker, verify cron jobs fire on schedule
