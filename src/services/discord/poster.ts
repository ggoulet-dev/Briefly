import { supabase } from "../../config/database.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

interface RecentArticle {
  title: string;
  url: string;
  summary: string;
  published_at: string | null;
  source_name: string;
}

async function getRecentArticles(): Promise<RecentArticle[]> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: articles, error } = await supabase
    .from("articles")
    .select("title, url, summary, published_at, sources(name)")
    .eq("summary_status", "completed")
    .gte("created_at", oneDayAgo)
    .order("published_at", { ascending: false })
    .limit(20);

  if (error)
    throw new Error(`Failed to fetch articles: ${error.message}`);
  if (!articles || articles.length === 0) return [];

  return articles.map((a) => {
    const sourceName = (a as Record<string, unknown>).sources
      ? ((a as Record<string, unknown>).sources as { name: string }).name
      : "Unknown";

    return {
      title: a.title,
      url: a.url,
      summary: a.summary!,
      published_at: a.published_at,
      source_name: sourceName,
    };
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

function buildArticleEmbed(article: RecentArticle): object {
  return {
    title: truncate(article.title, 256),
    url: article.url,
    description: article.summary,
    footer: { text: article.source_name },
    timestamp: article.published_at ?? new Date().toISOString(),
    color: 0x3498db,
  };
}

export async function postToDiscord(): Promise<{ posted: number }> {
  const webhookUrl = env.discordWebhookUrl;
  if (!webhookUrl) {
    throw new Error(
      "DISCORD_WEBHOOK_URL is not set. Configure it in your environment."
    );
  }

  const articles = await getRecentArticles();

  if (articles.length === 0) {
    logger.info("No articles to post to Discord.");
    return { posted: 0 };
  }

  // Send header message
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const headerRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `📰 **Briefly** — ${dateStr} — ${articles.length} articles`,
    }),
  });

  if (!headerRes.ok) {
    const text = await headerRes.text();
    throw new Error(`Discord webhook failed (${headerRes.status}): ${text}`);
  }

  // Post one embed per article with suppressed notifications
  let posted = 0;

  for (const article of articles) {
    await new Promise((r) => setTimeout(r, 500));

    const embed = buildArticleEmbed(article);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [embed],
        flags: 4096,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error(`Discord webhook failed for article: ${article.title}`, {
        status: response.status,
        text,
      });
      continue;
    }

    posted++;
  }

  logger.info(`Posted ${posted} article(s) to Discord`);
  return { posted };
}
