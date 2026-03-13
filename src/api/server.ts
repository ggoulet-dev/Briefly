import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { supabase } from "../config/database.js";
import { logger } from "../config/logger.js";
import { fetchFeed } from "../services/rss/feedFetcher.js";
import { fetchAllFeeds } from "../services/rss/bulkFetcher.js";
import { fetchArticleContent } from "../services/rss/contentFetcher.js";
import {
  summarizeArticle,
  summarizePendingArticles,
} from "../services/ai/summarizer.js";
import { compileAllBriefings } from "../services/briefings/compiler.js";
import { postToDiscord } from "../services/discord/poster.js";
import { authMiddleware, adminOnly } from "./middleware/auth.js";

const app = new Hono();

app.use("*", cors());
app.use("*", honoLogger());

// ── Health ─────────────────────────────────────────────

app.get("/api/health", (c) => c.json({ status: "ok" }));

// ── Auth middleware for all /api/* routes (except health) ──

app.use("/api/sources/*", authMiddleware, adminOnly);
app.use("/api/articles/*", authMiddleware, adminOnly);
app.use("/api/pipeline/*", authMiddleware, adminOnly);
app.use("/api/briefings/*", authMiddleware, adminOnly);
app.use("/api/discord/*", authMiddleware, adminOnly);

// ── Sources: Fetch ─────────────────────────────────────

app.post("/api/sources/:id/fetch", async (c) => {
  const id = Number(c.req.param("id"));
  const { data: source, error } = await supabase
    .from("sources")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !source) {
    return c.json({ error: "Source not found" }, 404);
  }

  try {
    const result = await fetchFeed(source);
    return c.json({
      success: true,
      newArticles: result.newArticles,
      skipped: result.skipped,
      error: result.error,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to fetch source ${id}`, { error: msg });
    return c.json({ error: msg }, 500);
  }
});

app.post("/api/sources/fetch-all", async (c) => {
  try {
    const results = await fetchAllFeeds();
    const totalNew = results.reduce((s, r) => s + r.newArticles, 0);
    const totalSkipped = results.reduce((s, r) => s + r.skipped, 0);
    const errors = results.filter((r) => r.error).length;
    return c.json({
      success: true,
      sources: results.length,
      newArticles: totalNew,
      skipped: totalSkipped,
      errors,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

// ── Articles: Summarize ────────────────────────────────

app.post("/api/articles/summarize-all", async (c) => {
  try {
    const result = await summarizePendingArticles();
    return c.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

app.post("/api/articles/:id/summarize", async (c) => {
  const id = Number(c.req.param("id"));
  const { data: article, error } = await supabase
    .from("articles")
    .select("id, title, url, author, content, summary_status")
    .eq("id", id)
    .single();

  if (error || !article) {
    return c.json({ error: "Article not found" }, 404);
  }

  try {
    await summarizeArticle(article);
    return c.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

app.post("/api/articles/:id/fetch-content", async (c) => {
  const id = Number(c.req.param("id"));
  const { data: article, error } = await supabase
    .from("articles")
    .select("id, url, content")
    .eq("id", id)
    .single();

  if (error || !article) {
    return c.json({ error: "Article not found" }, 404);
  }

  try {
    const content = await fetchArticleContent(article.url);
    if (content) {
      await supabase
        .from("articles")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", id);
    }
    return c.json({ success: true, hasContent: !!content });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

// ── Pipeline: Fetch + Summarize ────────────────────────

app.post("/api/pipeline/fetch-and-summarize", async (c) => {
  try {
    const fetchResults = await fetchAllFeeds();
    const totalNew = fetchResults.reduce((s, r) => s + r.newArticles, 0);

    let summarized = { processed: 0, failed: 0 };
    if (totalNew > 0) {
      summarized = await summarizePendingArticles();
    }

    return c.json({
      success: true,
      fetched: totalNew,
      summarized: summarized.processed,
      failed: summarized.failed,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

app.post("/api/pipeline/run", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const {
      sourceIds,
      summarize = true,
      includeFailed = false,
      summarizeLimit,
    } = body as {
      sourceIds?: number[];
      summarize?: boolean;
      includeFailed?: boolean;
      summarizeLimit?: number;
    };

    // ── Fetch phase ──
    const fetchResults: { sourceId: number; sourceName: string; newArticles: number; skipped: number; error?: string }[] = [];

    if (sourceIds && sourceIds.length > 0) {
      // Fetch specific sources
      const { data: sources, error } = await supabase
        .from("sources")
        .select("*")
        .in("id", sourceIds);

      if (error) throw new Error(`Failed to load sources: ${error.message}`);

      for (const source of sources || []) {
        const result = await fetchFeed(source);
        fetchResults.push({
          sourceId: source.id,
          sourceName: source.name,
          newArticles: result.newArticles,
          skipped: result.skipped,
          error: result.error,
        });
      }
    } else {
      // Fetch all active sources
      const results = await fetchAllFeeds();
      for (const r of results) {
        fetchResults.push({
          sourceId: r.source.id,
          sourceName: r.source.name,
          newArticles: r.newArticles,
          skipped: r.skipped,
          error: r.error,
        });
      }
    }

    const totalNew = fetchResults.reduce((s, r) => s + r.newArticles, 0);

    // ── Summarize phase ──
    let summarizeResult = { processed: 0, failed: 0 };
    if (summarize) {
      const hasPending = totalNew > 0 || includeFailed;
      if (hasPending) {
        summarizeResult = await summarizePendingArticles({
          includeFailed,
          limit: summarizeLimit,
        });
      }
    }

    return c.json({
      success: true,
      fetch: {
        sources: fetchResults,
        totalNew,
        totalSkipped: fetchResults.reduce((s, r) => s + r.skipped, 0),
        totalErrors: fetchResults.filter((r) => r.error).length,
      },
      summarize: summarize
        ? { processed: summarizeResult.processed, failed: summarizeResult.failed }
        : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

// ── Briefings ──────────────────────────────────────────

app.post("/api/briefings/compile", async (c) => {
  try {
    const compiled = await compileAllBriefings();
    return c.json({ success: true, compiled });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

// ── Discord ────────────────────────────────────────────

app.post("/api/discord/post", async (c) => {
  try {
    const result = await postToDiscord();
    return c.json({ success: true, posted: result.posted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

// ── Start ──────────────────────────────────────────────

const port = Number(process.env.API_PORT ?? 5174);

serve({ fetch: app.fetch, port }, () => {
  logger.info(`Briefly API server running on http://localhost:${port}`);
});
