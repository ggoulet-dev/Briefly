import { supabase } from "../../config/database.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

interface RecentArticle {
  title: string;
  url: string;
  summary: string;
  published_at: string | null;
  source_name: string;
  topic_emoji: string | null;
  topic_name: string | null;
}

async function getRecentArticles(): Promise<RecentArticle[]> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: articles, error } = await supabase
    .from("articles")
    .select("title, url, summary, published_at, source_id, sources(name)")
    .eq("summary_status", "completed")
    .gte("created_at", oneDayAgo)
    .order("published_at", { ascending: false })
    .limit(20);

  if (error)
    throw new Error(`Failed to fetch articles: ${error.message}`);
  if (!articles || articles.length === 0) return [];

  // Collect all source IDs to batch-fetch topic info
  const sourceIds = [...new Set(articles.map((a) => a.source_id))];

  // Fetch source → topic mappings with emoji
  const { data: sourceTopics } = await supabase
    .from("source_topics")
    .select("source_id, topics(name, emoji)")
    .in("source_id", sourceIds);

  // Build a map: source_id → { name, emoji } (use first topic per source)
  const topicBySource = new Map<number, { name: string; emoji: string | null }>();
  if (sourceTopics) {
    for (const st of sourceTopics) {
      if (!topicBySource.has(st.source_id)) {
        const topic = (st as Record<string, unknown>).topics as { name: string; emoji: string | null } | null;
        if (topic) {
          topicBySource.set(st.source_id, { name: topic.name, emoji: topic.emoji });
        }
      }
    }
  }

  return articles.map((a) => {
    const sourceName = (a as Record<string, unknown>).sources
      ? ((a as Record<string, unknown>).sources as { name: string }).name
      : "Unknown";

    const topic = topicBySource.get(a.source_id);

    return {
      title: a.title,
      url: a.url,
      summary: a.summary!,
      published_at: a.published_at,
      source_name: sourceName,
      topic_emoji: topic?.emoji ?? null,
      topic_name: topic?.name ?? null,
    };
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

// Map topic names to colors for visual distinction
const TOPIC_COLORS: Record<string, number> = {};
const COLOR_PALETTE = [
  0x3498db, // blue
  0xe74c3c, // red
  0x2ecc71, // green
  0xf39c12, // orange
  0x9b59b6, // purple
  0x1abc9c, // teal
  0xe67e22, // dark orange
  0x11806a, // dark teal
];
let nextColorIndex = 0;

function getTopicColor(topicName: string | null): number {
  if (!topicName) return 0x3498db;
  if (!(topicName in TOPIC_COLORS)) {
    TOPIC_COLORS[topicName] = COLOR_PALETTE[nextColorIndex % COLOR_PALETTE.length];
    nextColorIndex++;
  }
  return TOPIC_COLORS[topicName];
}

function buildArticleEmbed(article: RecentArticle): object {
  const topicLabel = article.topic_emoji && article.topic_name
    ? `${article.topic_emoji} ${article.topic_name}`
    : article.topic_name ?? null;

  return {
    ...(topicLabel ? { author: { name: topicLabel } } : {}),
    title: truncate(article.title, 256),
    url: article.url,
    description: article.summary,
    footer: { text: article.source_name },
    timestamp: article.published_at ?? new Date().toISOString(),
    color: getTopicColor(article.topic_name),
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
