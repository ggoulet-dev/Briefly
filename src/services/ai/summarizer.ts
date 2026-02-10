import { openai } from "../../config/openai.js";
import { env } from "../../config/env.js";
import { prisma } from "../../config/database.js";
import { logger } from "../../config/logger.js";
import { buildSystemPrompt, buildUserPrompt } from "./promptBuilder.js";
import type { Article } from "../../../generated/prisma/client.js";

const RATE_LIMIT_MS = 1000;
const MAX_RETRIES = 3;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function summarizeWithRetry(article: Article): Promise<string> {
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
      logger.warn(`Retry ${attempt}/${MAX_RETRIES} for article ${article.id}`, {
        backoffMs: backoff,
      });
      await sleep(backoff);
    }
  }
  throw new Error("Unreachable");
}

export async function summarizeArticle(article: Article): Promise<void> {
  await prisma.article.update({
    where: { id: article.id },
    data: { summaryStatus: "processing" },
  });

  try {
    const summary = await summarizeWithRetry(article);
    await prisma.article.update({
      where: { id: article.id },
      data: { summary, summaryStatus: "completed" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to summarize article ${article.id}`, { error: message });
    await prisma.article.update({
      where: { id: article.id },
      data: { summaryStatus: "failed" },
    });
  }
}

export async function summarizePendingArticles(): Promise<{
  processed: number;
  failed: number;
}> {
  const articles = await prisma.article.findMany({
    where: { summaryStatus: "pending" },
    orderBy: { createdAt: "asc" },
  });

  logger.info(`Summarizing ${articles.length} pending article(s)`);

  let processed = 0;
  let failed = 0;

  for (const article of articles) {
    logger.info(`[${processed + failed + 1}/${articles.length}] ${article.title}`);
    await summarizeArticle(article);

    const updated = await prisma.article.findUnique({
      where: { id: article.id },
      select: { summaryStatus: true },
    });

    if (updated?.summaryStatus === "completed") {
      processed++;
    } else {
      failed++;
    }

    // Rate limiting between API calls
    if (processed + failed < articles.length) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  logger.info("Summarization complete", { processed, failed });
  return { processed, failed };
}
