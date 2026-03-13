# Frontend Guide

## Stack

React 19, Tailwind CSS 3.4, @tanstack/react-query 5, Supabase JS (anon key, RLS enforced), Recharts, date-fns, Vite 6.

## Entry & Routing

`main.tsx` → QueryClientProvider → ToastProvider → AuthProvider → `App.tsx`

Routing is **manual state-based** — no react-router. `App.tsx` holds `useState<Page>()` and the Sidebar calls `onNavigate(page)`.

```typescript
type Page = "dashboard" | "articles" | "sources" | "topics" | "users"
  | "briefings" | "my-briefings" | "my-topics" | "home" | "my-sources" | "settings"
```

Auth gate: loading → Spinner, no session → Login, authenticated → Sidebar + page content.

## Pages

### Admin Pages

| Page | File | Key Features |
|------|------|-------------|
| Dashboard | `Dashboard.tsx` | 4x StatCard, 7-day BarChart (Recharts), recent summaries list, PipelineButton + Discord post |
| Articles | `Articles.tsx` | Filterable table (status: all/completed/pending/processing/failed), search, ArticleDetail modal |
| Sources | `Sources.tsx` | Grid of source cards, individual fetch action, last-fetched timestamp, failure count |
| Topics | `Topics.tsx` | Grid with name, slug, emoji, keywords display |
| Users | `Users.tsx` | Table with role, timezone, delivery hour |
| Briefings | `Briefings.tsx` | Table of briefings, expandable detail with articles grouped by topic |

### User Pages

| Page | File | Key Features |
|------|------|-------------|
| Home | `Home.tsx` | Personalized feed: sections by subscribed topics + favorited sources, stats |
| My Topics | `MyTopics.tsx` | All topics grid with subscribe/unsubscribe toggle, visual indicator |
| My Sources | `MySources.tsx` | All sources grid with favorite star toggle, topic tags, article counts |
| My Briefings | `MyBriefings.tsx` | User's briefings table with expandable detail |
| Settings | `Settings.tsx` | Name, timezone (datalist autocomplete), delivery hour (24h select) |

### Auth

| Page | File | Key Features |
|------|------|-------------|
| Login | `Login.tsx` | Sign in / Sign up toggle, email + password, error display |

## Components

| Component | File | Props | Usage |
|-----------|------|-------|-------|
| Sidebar | `Sidebar.tsx` | `current, onNavigate` | Fixed left panel (desktop), hamburger overlay (mobile). Shows admin or user nav based on role |
| PageHeader | `PageHeader.tsx` | `title, description?, children?` | Page title bar with optional action buttons slot |
| ActionButton | `ActionButton.tsx` | `onClick, loading?, variant, size` | Variants: primary/secondary/danger. Shows spinner when loading |
| PipelineButton | `PipelineButton.tsx` | none | Opens PipelineDialog |
| PipelineDialog | `PipelineDialog.tsx` | `open, onClose` | Modal: source selection checkboxes, summarize toggle, failed retry, limit input, results display |
| StatCard | `StatCard.tsx` | `label, value, sub?, accent` | Metric card. Accents: blue/green/yellow/red |
| StatusBadge | `StatusBadge.tsx` | `status` | Colored pill: green=completed/sent, red=failed, amber=pending, blue=processing, purple=sending |
| ArticleDetail | `ArticleDetail.tsx` | `id, onBack` | Full article view with summary, content, Summarize + Fetch Content actions |
| Spinner | `Spinner.tsx` | none | Centered loading circle |
| EmptyState | `EmptyState.tsx` | `message, action?` | Centered empty message with optional CTA |
| Toast | `Toast.tsx` | Provider-based | `useToast()` → `toast(msg, type)`. Auto-dismiss 4s. Bottom-right |

## Auth Context — `lib/AuthContext.tsx`

```typescript
interface AuthContextValue {
  session: Session | null
  user: UserProfile | null     // { id, email, name, role, timezone, delivery_hour }
  isAdmin: boolean             // user.role === "admin"
  isLoading: boolean
  signIn(email, password): Promise<{ error? }>
  signUp(email, password, name): Promise<{ error? }>
  signOut(): Promise<void>
  refreshProfile(): void
}
```

Uses Supabase Auth session + fetches `public.users` profile. Subscribes to auth state changes.

## Data Fetching — `lib/hooks.ts`

All read queries use `useQuery()` hitting Supabase directly (anon key + RLS).

| Hook | Returns | Notes |
|------|---------|-------|
| `useStats()` | `DashboardStats` | Article counts by status, source/user/topic/briefing counts |
| `useArticles(status?, limit?, offset?, search?)` | `Article[]` | Paginated, filterable |
| `useArticle(id)` | `Article` | Single detail |
| `useSources()` | `Source[]` | All sources |
| `useTopics()` | `Topic[]` | All topics |
| `useUsers()` | `User[]` | All users |
| `useBriefings(limit?)` | `Briefing[]` | Briefings list |
| `useBriefingDetail(id)` | `BriefingDetail` | With nested articles by topic |
| `useArticleTimeline()` | `TimelineEntry[]` | Last 7 days, articles + summarized counts |
| `useHomeFeed(userId)` | `HomeFeed` | Personalized: topics → sources → articles |

## Mutations — `lib/api.ts`

All mutations use `useMutation()` calling the Hono API (`/api/*`) with Bearer token from Supabase session.

| Hook | Endpoint | Invalidates |
|------|----------|-------------|
| `useFetchSource(id)` | `POST /api/sources/:id/fetch` | sources, stats |
| `useFetchAllSources()` | `POST /api/sources/fetch-all` | sources, stats |
| `useSummarizeAll()` | `POST /api/articles/summarize-all` | articles, stats |
| `useSummarizeArticle(id)` | `POST /api/articles/:id/summarize` | articles, stats |
| `useFetchArticleContent(id)` | `POST /api/articles/:id/fetch-content` | article detail |
| `useRunPipeline(opts)` | `POST /api/pipeline/run` | all queries |
| `useFetchAndSummarize()` | `POST /api/pipeline/fetch-and-summarize` | all queries |
| `useCompileBriefings()` | `POST /api/briefings/compile` | briefings, stats |
| `usePostToDiscord()` | `POST /api/discord/post` | — |

## Styling

Dark theme (zinc-950 bg). Custom Tailwind components in `index.css`:
- `.card` — rounded-xl zinc-900/50 border
- `.badge` / `.badge-{color}` — colored pills (blue, green, yellow, red, purple, zinc)
- Brand color: blue-600 for primary actions
- Toast animation: `slide-up` keyframe

## Vite Config

- `envDir: "../"` — reads `.env` from project root
- `@` alias → `web/src/`
- Dev proxy: `/api` → `http://localhost:5174` (Hono server)
