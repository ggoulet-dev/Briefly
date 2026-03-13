# Backend Services

## RSS — `src/services/rss/`

### feedFetcher.ts

`fetchFeed(source)` → `FetchResult`

Fetches a single RSS source with conditional headers (ETag / If-Modified-Since). On 304 Not Modified, skips entirely. Deduplicates articles by URL (unique constraint) and skips articles older than `last_fetched_at`. Generates `content_hash` (SHA256) for content dedup. Tracks `fetch_failures` count on errors.

Returns: `{ source, newArticles: Article[], skipped: number, error?: string }`

### bulkFetcher.ts

`fetchAllFeeds()` → `FetchResult[]`

Fetches all sources where `active = true`. Iterates sequentially, logs each result. Returns array of all results.

### contentFetcher.ts

`fetchArticleContent(url)` → `string | null`

Extracts article body text from a URL. Handles manual redirects with cookie accumulation (needed for cookie-gated sites like TVA Sports). Uses Mozilla Readability + linkedom for content extraction. Trims to 5000 chars. 15s timeout, max 10 redirects.

---

## AI — `src/services/ai/`

### summarizer.ts

`summarizeArticle(article)` → `Promise<void>`

Sets status to `processing`, fetches full content via contentFetcher, sends to OpenAI, stores summary, sets status to `completed` or `failed`. Exponential backoff retry: 3 attempts (delay = 2^attempt * 1000ms). 1000ms sleep between articles for rate limiting.

`summarizePendingArticles(options?)` → `{ processed, failed }`

Batch processes: filters `summary_status = 'pending'` (+ optionally `'failed'` via `includeFailed`). Optional `limit`. Processes sequentially.

### promptBuilder.ts

`buildSystemPrompt()` — Instructions for 1-sentence summaries (max 40 words), same language as source, neutral/factual tone.

`buildUserPrompt(article)` — Formats title/author/content for the model.

---

## Briefings — `src/services/briefings/`

### compiler.ts

`compileBriefingForUser(user)` → `CompiledBriefing | null`

1. Fetches user's subscribed topics (ordered by priority)
2. For each topic, finds linked sources
3. Pulls recent summarized articles (last 24h, max 5/topic, 20/user total)
4. Creates briefing record (status: `compiled`)
5. Creates `briefing_articles` junction records with position
6. Returns structured object with sections (topic → articles)

`compileAllBriefings()` → `number`

Iterates all active users, skips if already compiled/sent today.

---

## Discord — `src/services/discord/`

### poster.ts

`postToDiscord()` → `{ posted: number }`

1. Fetches recent summarized articles (last 24h, max 20)
2. Maps each article's source → topic (name + emoji) for display
3. Sends header message with date + count
4. Posts one embed per article (500ms throttle between posts)
5. Topic-to-color mapping (8-color palette, cycles)
6. Sets `flags: 4096` (suppress notifications)
7. Truncates titles to 256 chars
