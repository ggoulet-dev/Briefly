import type { Job } from "bullmq";
import { prisma } from "../config/database.js";

export async function processCleanup(_job: Job): Promise<void> {
  const now = new Date();

  // Purge articles older than 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const deletedArticles = await prisma.article.deleteMany({
    where: { createdAt: { lt: thirtyDaysAgo } },
  });
  console.log(`Cleanup: deleted ${deletedArticles.count} old article(s)`);

  // Purge briefings older than 90 days
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const deletedBriefings = await prisma.briefing.deleteMany({
    where: { createdAt: { lt: ninetyDaysAgo } },
  });
  console.log(`Cleanup: deleted ${deletedBriefings.count} old briefing(s)`);

  // Purge expired magic links older than 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const deletedLinks = await prisma.magicLink.deleteMany({
    where: { expiresAt: { lt: sevenDaysAgo } },
  });
  console.log(`Cleanup: deleted ${deletedLinks.count} expired magic link(s)`);
}
