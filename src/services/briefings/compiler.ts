import { supabase } from "../../config/database.js";
import { logger } from "../../config/logger.js";

const MAX_PER_TOPIC = 5;
const MAX_TOTAL = 20;

interface User {
  id: number;
  email: string;
  name: string | null;
  active: boolean;
}

export interface CompiledBriefing {
  briefingId: number;
  userId: number;
  sections: {
    topicName: string;
    topicSlug: string;
    articles: {
      id: number;
      title: string;
      url: string;
      summary: string;
      sourceName: string;
      author: string | null;
    }[];
  }[];
}

export async function compileBriefingForUser(
  user: User
): Promise<CompiledBriefing | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD for date column

  // Check if briefing already exists for today
  const { data: existing } = await supabase
    .from("briefings")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("briefing_date", todayStr)
    .single();

  if (existing && existing.status !== "pending") {
    return null; // Already compiled or sent
  }

  // Get user's subscribed topics
  const { data: userTopics, error: utErr } = await supabase
    .from("user_topics")
    .select("topic_id, priority, topics(id, name, slug)")
    .eq("user_id", user.id)
    .order("priority", { ascending: false });

  if (utErr) throw new Error(`Failed to fetch user topics: ${utErr.message}`);
  if (!userTopics || userTopics.length === 0) return null;

  // Get recent summarized articles (last 24h) matching user's topics
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sections: CompiledBriefing["sections"] = [];
  let totalArticles = 0;
  const usedArticleIds = new Set<number>();

  for (const ut of userTopics) {
    if (totalArticles >= MAX_TOTAL) break;

    const remaining = Math.min(MAX_PER_TOPIC, MAX_TOTAL - totalArticles);
    const topic = ut.topics as unknown as { id: number; name: string; slug: string };

    // Find source IDs linked to this topic
    const { data: sourceTopics } = await supabase
      .from("source_topics")
      .select("source_id")
      .eq("topic_id", topic.id);

    if (!sourceTopics || sourceTopics.length === 0) continue;

    const sourceIds = sourceTopics.map((st) => st.source_id);

    // Find articles from these sources
    let query = supabase
      .from("articles")
      .select("id, title, url, summary, author, source_id, sources(name)")
      .eq("summary_status", "completed")
      .gte("created_at", oneDayAgo)
      .in("source_id", sourceIds)
      .order("published_at", { ascending: false })
      .limit(remaining);

    if (usedArticleIds.size > 0) {
      query = query.not("id", "in", `(${Array.from(usedArticleIds).join(",")})`);
    }

    const { data: articles } = await query;

    if (!articles || articles.length === 0) continue;

    sections.push({
      topicName: topic.name,
      topicSlug: topic.slug,
      articles: articles.map((a) => ({
        id: a.id,
        title: a.title,
        url: a.url,
        summary: a.summary!,
        sourceName: (a as Record<string, unknown>).sources
          ? ((a as Record<string, unknown>).sources as { name: string }).name
          : "Unknown",
        author: a.author,
      })),
    });

    for (const a of articles) {
      usedArticleIds.add(a.id);
    }
    totalArticles += articles.length;
  }

  if (sections.length === 0) return null;

  // Create or update the briefing record
  let briefingId: number;

  if (existing) {
    const { error: updateErr } = await supabase
      .from("briefings")
      .update({
        status: "compiled",
        compiled_at: new Date().toISOString(),
        article_count: totalArticles,
      })
      .eq("id", existing.id);

    if (updateErr) throw new Error(`Failed to update briefing: ${updateErr.message}`);
    briefingId = existing.id;
  } else {
    const { data: newBriefing, error: createErr } = await supabase
      .from("briefings")
      .insert({
        user_id: user.id,
        briefing_date: todayStr,
        status: "compiled",
        compiled_at: new Date().toISOString(),
        article_count: totalArticles,
      })
      .select("id")
      .single();

    if (createErr) throw new Error(`Failed to create briefing: ${createErr.message}`);
    briefingId = newBriefing!.id;
  }

  // Create briefing articles
  let position = 0;
  for (const section of sections) {
    for (const article of section.articles) {
      await supabase.from("briefing_articles").insert({
        briefing_id: briefingId,
        article_id: article.id,
        position: position++,
        topic_slug: section.topicSlug,
      });
    }
  }

  return {
    briefingId,
    userId: user.id,
    sections,
  };
}

export async function compileAllBriefings(): Promise<number> {
  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, name, active")
    .eq("active", true);

  if (error) throw new Error(`Failed to fetch users: ${error.message}`);

  const activeUsers = (users || []) as User[];
  logger.info(`Compiling briefings for ${activeUsers.length} active user(s)`);
  let compiled = 0;

  for (const user of activeUsers) {
    const result = await compileBriefingForUser(user);
    if (result) {
      logger.info(`Compiled briefing for ${user.email}`, {
        topics: result.sections.length,
        articles: result.sections.reduce((s, sec) => s + sec.articles.length, 0),
      });
      compiled++;
    } else {
      logger.debug(`Skipped ${user.email}: no articles or already compiled`);
    }
  }

  logger.info(`Briefing compilation complete`, { compiled });
  return compiled;
}
