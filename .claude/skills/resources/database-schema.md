# Database Schema

Supabase PostgreSQL. Backend uses service role key (bypasses RLS). Frontend uses anon key (RLS enforced).

Schema source: `supabase/migration.sql` + `supabase/migrations/add_auth.sql` + `supabase/migrations/add_user_sources.sql`

## Enums

```sql
SummaryStatus: pending | processing | completed | failed
BriefingStatus: pending | compiled | sending | sent | failed
```

## Tables

### users
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| auth_id | uuid | FK → auth.users, added by add_auth migration |
| email | text UNIQUE | |
| name | text | nullable |
| role | text | 'admin' or 'user', default 'user' |
| active | boolean | default true |
| timezone | text | default 'UTC' |
| delivery_hour | integer | 0-23, default 8 |
| created_at / updated_at | timestamptz | |

### topics
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | text | |
| slug | text UNIQUE | |
| description | text | nullable |
| emoji | text | nullable, single emoji |
| keywords | text[] | array of keyword strings |
| created_at / updated_at | timestamptz | |

### sources
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | text | |
| url | text | site URL |
| feed_url | text UNIQUE | RSS feed URL |
| active | boolean | default true |
| last_fetched_at | timestamptz | nullable |
| etag | text | for conditional fetch |
| last_modified | text | for conditional fetch |
| fetch_failures | integer | default 0, incremented on error |
| created_at / updated_at | timestamptz | |

### articles
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| source_id | integer FK → sources | |
| title | text | |
| url | text UNIQUE | |
| author | text | nullable |
| content | text | nullable, raw or extracted |
| summary | text | nullable, filled by summarizer |
| summary_status | SummaryStatus | default 'pending' |
| published_at | timestamptz | nullable |
| guid | text | nullable |
| content_hash | text | nullable, SHA256 for dedup |
| created_at / updated_at | timestamptz | |

Index: `articles.summary_status` for fast filtering.

### briefings
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| user_id | integer FK → users | |
| briefing_date | date | |
| status | BriefingStatus | default 'pending' |
| compiled_at | timestamptz | nullable |
| sent_at | timestamptz | nullable |
| article_count | integer | default 0 |
| created_at / updated_at | timestamptz | |

## Junction Tables

### user_topics
`user_id` FK → users, `topic_id` FK → topics, `priority` integer (default 0). Composite PK.

### source_topics
`source_id` FK → sources, `topic_id` FK → topics. Composite PK.

### briefing_articles
`briefing_id` FK → briefings, `article_id` FK → articles, `position` integer, `topic_slug` text. Composite PK (briefing_id + article_id).

### user_sources
`user_id` FK → users, `source_id` FK → sources. Composite PK. Used for user favorites.

## Auth Integration (add_auth.sql)

- Trigger `on_auth_user_created` on `auth.users` INSERT → auto-creates `public.users` row
- Helper functions: `get_user_role()`, `get_user_id()` — use `auth.uid()` to resolve current user

## RLS Policies

- **Admins:** full access to all tables
- **Users:** read own profile, update own profile, read all topics/sources/articles
- **user_topics:** users manage own subscriptions only
- **user_sources:** users manage own favorites only
- **briefings / briefing_articles:** users read own only
