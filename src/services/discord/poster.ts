import { supabase } from "../../config/database.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

interface TopicSection {
  topic_name: string;
  topic_slug: string;
  articles: {
    title: string;
    url: string;
    summary: string;
    source_name: string;
  }[];
}

async function getRecentArticlesByTopic(): Promise<TopicSection[]> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get all topics that have sources
  const { data: topics, error: topicsErr } = await supabase
    .from("topics")
    .select("id, name, slug")
    .order("id");

  if (topicsErr) throw new Error(`Failed to fetch topics: ${topicsErr.message}`);
  if (!topics || topics.length === 0) return [];

  const sections: TopicSection[] = [];

  for (const topic of topics) {
    // Get source IDs linked to this topic
    const { data: sourceTopics } = await supabase
      .from("source_topics")
      .select("source_id")
      .eq("topic_id", topic.id);

    if (!sourceTopics || sourceTopics.length === 0) continue;

    const sourceIds = sourceTopics.map((st) => st.source_id);

    // Get recent summarized articles from these sources
    const { data: articles, error: articlesErr } = await supabase
      .from("articles")
      .select("title, url, summary, source_id, sources(name)")
      .eq("summary_status", "completed")
      .gte("created_at", oneDayAgo)
      .in("source_id", sourceIds)
      .order("published_at", { ascending: false })
      .limit(5);

    if (articlesErr) {
      logger.error(`Failed to fetch articles for topic ${topic.slug}`, {
        error: articlesErr.message,
      });
      continue;
    }

    if (!articles || articles.length === 0) continue;

    sections.push({
      topic_name: topic.name,
      topic_slug: topic.slug,
      articles: articles.map((a) => ({
        title: a.title,
        url: a.url,
        summary: a.summary!,
        source_name: (a as Record<string, unknown>).sources
          ? ((a as Record<string, unknown>).sources as { name: string }).name
          : "Unknown",
      })),
    });
  }

  return sections;
}

function buildDiscordEmbeds(sections: TopicSection[]): object[] {
  const embeds: object[] = [];

  for (const section of sections) {
    const fields = section.articles.map((article) => ({
      name: article.title,
      value: `${article.summary}\n[Read more](${article.url}) — *${article.source_name}*`,
    }));

    embeds.push({
      title: `📰 ${section.topic_name}`,
      color: 0x3498db,
      fields,
      timestamp: new Date().toISOString(),
    });
  }

  return embeds;
}

export async function postToDiscord(): Promise<{ posted: number }> {
  const webhookUrl = env.discordWebhookUrl;
  if (!webhookUrl) {
    throw new Error(
      "DISCORD_WEBHOOK_URL is not set. Configure it in your environment."
    );
  }

  const sections = await getRecentArticlesByTopic();

  if (sections.length === 0) {
    logger.info("No articles to post to Discord.");
    return { posted: 0 };
  }

  const embeds = buildDiscordEmbeds(sections);

  // Discord allows max 10 embeds per message, send in batches
  const batchSize = 10;
  let posted = 0;

  for (let i = 0; i < embeds.length; i += batchSize) {
    const batch = embeds.slice(i, i + batchSize);
    const body: Record<string, unknown> = { embeds: batch };

    // Add content header only on the first message
    if (i === 0) {
      body.content = `**Briefly — Daily News Summary** (${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })})`;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Discord webhook failed (${response.status}): ${text}`);
    }

    posted += batch.length;

    // Rate limit between batches
    if (i + batchSize < embeds.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const totalArticles = sections.reduce((s, sec) => s + sec.articles.length, 0);
  logger.info(`Posted ${posted} embed(s) with ${totalArticles} article(s) to Discord`);
  return { posted };
}
