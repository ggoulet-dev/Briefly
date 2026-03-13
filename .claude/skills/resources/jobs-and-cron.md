# Jobs & Cron

BullMQ job system with Redis backend. Defined in `src/jobs/`.

## Queues — `src/jobs/queues.ts`

4 queues, each with dedicated handlers:

| Queue | Variable | Jobs |
|-------|----------|------|
| `briefly:feeds` | `feedsQueue` | `fetchArticles` |
| `briefly:ai` | `aiQueue` | `summarizeArticles` |
| `briefly:briefings` | `briefingsQueue` | `compileBriefings` |
| `briefly:maintenance` | `maintenanceQueue` | `cleanup` |

## Cron Schedules — `setupCronJobs()`

| Scheduler ID | Cron | Queue | Job | Description |
|--------------|------|-------|-----|-------------|
| `fetch-articles-cron` | `0 */2 * * *` | feeds | `fetchArticles` | Every 2 hours |
| `compile-briefings-cron` | `0 6 * * *` | briefings | `compileBriefings` | Daily at 6am UTC |
| `cleanup-cron` | `0 3 * * 0` | maintenance | `cleanup` | Sundays at 3am UTC |

Note: Summarization is **not** cron-scheduled. It auto-triggers after a successful fetch if new articles are found.

## Job Handlers

### fetchArticles.ts — `processFetchArticles(job)`
Calls `fetchAllFeeds()`. If `totalNew > 0`, enqueues `summarizeArticles` on `aiQueue`.

### summarizeArticles.ts — `processSummarizeArticles(job)`
Calls `summarizePendingArticles()`.

### compileBriefings.ts — `processCompileBriefings(job)`
Calls `compileAllBriefings()`.

### cleanup.ts — `processCleanup(job)`
- Deletes articles older than 30 days
- Deletes briefings older than 90 days

## Worker — `src/worker.ts`

Creates 4 BullMQ Worker instances, one per queue. Each dispatches to the correct handler based on `job.name`. Logs completion/failure via Winston. Calls `setupCronJobs()` on start. Blocks indefinitely.

Start with: `pnpm worker` (runs `tsx src/worker.ts`)

## Trigger Chain

```
Cron (every 2h)
  → fetchArticles
    → if new articles found → enqueue summarizeArticles
      → summarizePendingArticles()

Cron (daily 6am UTC)
  → compileBriefings
    → compileAllBriefings()

Cron (Sunday 3am UTC)
  → cleanup
    → delete old articles (30d) + briefings (90d)
```
