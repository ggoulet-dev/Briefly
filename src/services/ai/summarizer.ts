import { openai } from "../../config/openai.js";
import { env } from "../../config/env.js";
import { supabase } from "../../config/database.js";
import { logger } from "../../config/logger.js";
import { buildSystemPrompt, buildUserPrompt, type ArticleForPrompt } from "./promptBuilder.js";
import { fetchArticleContent } from "../rss/contentFetcher.js";

interface Article {
  id: number;
  title: string;
  url: string;
  author: string | null;
  content: string | null;
  summary_status: string;
}

const RATE_LIMIT_MS = 1000;
const MAX_RETRIES = 3;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function summarizeWithRetry(article: ArticleForPrompt): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: env.openaiModel,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(article) },
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      const summary = response.choices[0]?.message?.content?.trim();
      if (!summary) throw new Error("Empty response from OpenAI");
      return summary;
    } catch (err: unknown) {
      if (attempt === MAX_RETRIES) throw err;
      const backoff = Math.pow(2, attempt) * 1000;
      logger.warn(`Retry ${attempt}/${MAX_RETRIES} for article ${(article as Article).id ?? "?"}`, {
        backoffMs: backoff,
      });
      await sleep(backoff);
    }
  }
  throw new Error("Unreachable");
}

export async function summarizeArticle(article: Article): Promise<void> {
  await supabase
    .from("articles")
    .update({ summary_status: "processing" })
    .eq("id", article.id);

  try {
    // Fetch full article content from URL
    const fullContent = await fetchArticleContent(article.url);
    const articleForPrompt: ArticleForPrompt = {
      title: article.title,
      author: article.author,
      content: fullContent || article.content,
    };

    const summary = await summarizeWithRetry(articleForPrompt);
    await supabase
      .from("articles")
      .update({ summary, summary_status: "completed" })
      .eq("id", article.id);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to summarize article ${article.id}`, { error: message });
    await supabase
      .from("articles")
      .update({ summary_status: "failed" })
      .eq("id", article.id);
  }
}

export async function summarizePendingArticles(): Promise<{
  processed: number;
  failed: number;
}> {
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, url, author, content, summary_status")
    .eq("summary_status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch pending articles: ${error.message}`);

  const pending = (articles || []) as Article[];
  logger.info(`Summarizing ${pending.length} pending article(s)`);

  let processed = 0;
  let failed = 0;

  for (const article of pending) {
    logger.info(`[${processed + failed + 1}/${pending.length}] ${article.title}`);
    await summarizeArticle(article);

    const { data: updated } = await supabase
      .from("articles")
      .select("summary_status")
      .eq("id", article.id)
      .single();

    if (updated?.summary_status === "completed") {
      processed++;
    } else {
      failed++;
    }

    // Rate limiting between API calls
    if (processed + failed < pending.length) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  logger.info("Summarization complete", { processed, failed });
  return { processed, failed };
}
