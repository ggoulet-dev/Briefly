# API Endpoints

Hono REST server at `src/api/server.ts`. Runs on port `API_PORT` env var (default 5174). CORS enabled globally.

## Auth

All `/api/*` routes (except health) require Bearer token via `authMiddleware`. Admin-only routes additionally use `adminOnly` middleware.

**Middleware** (`src/api/middleware/auth.ts`):
- `authMiddleware` — validates JWT against Supabase Auth, fetches user profile from `public.users`, attaches `AuthUser` to Hono context
- `adminOnly` — checks `user.role === 'admin'`, returns 403 otherwise

```typescript
interface AuthUser {
  authId: string    // Supabase auth.users UUID
  userId: number    // public.users id
  email: string
  role: string      // 'admin' | 'user'
}
```

## Routes

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Returns `{ status: "ok" }` |

### Sources (Admin only)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/sources/:id/fetch` | Admin | Fetch single source. Returns `{ success, result: FetchResult }` |
| POST | `/api/sources/fetch-all` | Admin | Fetch all active sources. Returns `{ success, results: FetchResult[] }` |

### Articles (Admin only)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/articles/summarize-all` | Admin | Summarize all pending. Returns `{ success, processed, failed }` |
| POST | `/api/articles/:id/summarize` | Admin | Summarize single article. Returns `{ success, article }` |
| POST | `/api/articles/:id/fetch-content` | Admin | Fetch & store article body. Returns `{ success, content }` |

### Pipeline (Admin only)
| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/api/pipeline/fetch-and-summarize` | Admin | — | Fetch all → summarize if new. Returns `{ success, fetch, summarize? }` |
| POST | `/api/pipeline/run` | Admin | `PipelineOptions` | Full pipeline with options. Returns detailed breakdown by source |

```typescript
interface PipelineOptions {
  sourceIds?: number[]       // specific sources (empty = all)
  summarize?: boolean        // run summarization after fetch
  includeFailed?: boolean    // retry failed articles
  summarizeLimit?: number    // max articles to summarize
}
```

### Briefings (Admin only)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/briefings/compile` | Admin | Compile briefings for all users. Returns `{ success, compiled }` |

### Discord (Admin only)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/discord/post` | Admin | Post to Discord webhook. Returns `{ success, posted }` |

## Response Patterns

**Success:** `{ success: true, ...data }`

**Error:** `{ error: "message" }` with appropriate HTTP status (400, 401, 403, 500)
