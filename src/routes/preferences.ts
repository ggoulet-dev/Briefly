import { Router, type IRouter, type Request, type Response } from "express";
import { prisma } from "../config/database.js";

export const preferencesRouter: IRouter = Router();

function getUserId(req: Request): number | null {
  return req.session.userId || null;
}

// GET /preferences — show user's topics
preferencesRouter.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated. Use a magic link to sign in." });
    return;
  }

  const allTopics = await prisma.topic.findMany({ orderBy: { name: "asc" } });
  const userTopics = await prisma.userTopic.findMany({
    where: { userId },
    select: { topicId: true, priority: true },
  });

  const subscribedIds = new Set(userTopics.map((ut) => ut.topicId));

  const topics = allTopics.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    subscribed: subscribedIds.has(t.id),
  }));

  res.json({ topics });
});

// PATCH /preferences — update user topics
preferencesRouter.patch("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const { topicIds } = req.body as { topicIds?: number[] };

  if (!Array.isArray(topicIds)) {
    res.status(400).json({ error: "topicIds must be an array of numbers" });
    return;
  }

  // Replace all user topics
  await prisma.userTopic.deleteMany({ where: { userId } });

  if (topicIds.length > 0) {
    await prisma.userTopic.createMany({
      data: topicIds.map((topicId, i) => ({
        userId,
        topicId,
        priority: topicIds.length - i,
      })),
    });
  }

  res.json({ message: "Preferences updated", topicIds });
});
