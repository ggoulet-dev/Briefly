import { prisma } from "../../config/database.js";
import { logger } from "../../config/logger.js";
import type { User } from "../../../generated/prisma/client.js";

const MAX_PER_TOPIC = 5;
const MAX_TOTAL = 20;

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

  // Check if briefing already exists for today
  const existing = await prisma.briefing.findUnique({
    where: {
      userId_briefingDate: {
        userId: user.id,
        briefingDate: today,
      },
    },
  });

  if (existing && existing.status !== "pending") {
    return null; // Already compiled or sent
  }

  // Get user's subscribed topics
  const userTopics = await prisma.userTopic.findMany({
    where: { userId: user.id },
    include: { topic: true },
    orderBy: { priority: "desc" },
  });

  if (userTopics.length === 0) return null;

  // Get recent summarized articles (last 24h) matching user's topics
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sections: CompiledBriefing["sections"] = [];
  let totalArticles = 0;
  const usedArticleIds = new Set<number>();

  for (const ut of userTopics) {
    if (totalArticles >= MAX_TOTAL) break;

    const remaining = Math.min(MAX_PER_TOPIC, MAX_TOTAL - totalArticles);

    // Find articles from sources linked to this topic
    const articles = await prisma.article.findMany({
      where: {
        summaryStatus: "completed",
        createdAt: { gte: oneDayAgo },
        id: { notIn: Array.from(usedArticleIds) },
        source: {
          sourceTopics: {
            some: { topicId: ut.topicId },
          },
        },
      },
      include: { source: true },
      orderBy: { publishedAt: "desc" },
      take: remaining,
    });

    if (articles.length === 0) continue;

    sections.push({
      topicName: ut.topic.name,
      topicSlug: ut.topic.slug,
      articles: articles.map((a) => ({
        id: a.id,
        title: a.title,
        url: a.url,
        summary: a.summary!,
        sourceName: a.source.name,
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
  const briefing = await prisma.briefing.upsert({
    where: {
      userId_briefingDate: {
        userId: user.id,
        briefingDate: today,
      },
    },
    update: {
      status: "compiled",
      compiledAt: new Date(),
      articleCount: totalArticles,
    },
    create: {
      userId: user.id,
      briefingDate: today,
      status: "compiled",
      compiledAt: new Date(),
      articleCount: totalArticles,
    },
  });

  // Create briefing articles
  let position = 0;
  for (const section of sections) {
    for (const article of section.articles) {
      await prisma.briefingArticle.create({
        data: {
          briefingId: briefing.id,
          articleId: article.id,
          position: position++,
          topicSlug: section.topicSlug,
        },
      });
    }
  }

  return {
    briefingId: briefing.id,
    userId: user.id,
    sections,
  };
}

export async function compileAllBriefings(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { active: true },
  });

  logger.info(`Compiling briefings for ${users.length} active user(s)`);
  let compiled = 0;

  for (const user of users) {
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
