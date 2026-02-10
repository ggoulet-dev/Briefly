import type { Job } from "bullmq";
import { prisma } from "../config/database.js";
import { sendBriefingEmail } from "../services/email/briefingMailer.js";
import type { CompiledBriefing } from "../services/briefings/compiler.js";

interface SendBriefingData {
  briefingId: number;
  userId: number;
}

export async function processSendBriefing(
  job: Job<SendBriefingData>
): Promise<void> {
  const { briefingId, userId } = job.data;

  const briefing = await prisma.briefing.findUnique({
    where: { id: briefingId },
    include: {
      user: true,
      briefingArticles: {
        include: { article: { include: { source: true } } },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!briefing) throw new Error(`Briefing ${briefingId} not found`);

  const user = briefing.user;

  // Mark as sending
  await prisma.briefing.update({
    where: { id: briefingId },
    data: { status: "sending" },
  });

  try {
    // Reconstruct the compiled briefing shape for the mailer
    const sectionMap = new Map<
      string,
      CompiledBriefing["sections"][number]
    >();

    for (const ba of briefing.briefingArticles) {
      let section = sectionMap.get(ba.topicSlug);
      if (!section) {
        section = {
          topicName: ba.topicSlug,
          topicSlug: ba.topicSlug,
          articles: [],
        };
        sectionMap.set(ba.topicSlug, section);
      }
      section.articles.push({
        id: ba.article.id,
        title: ba.article.title,
        url: ba.article.url,
        summary: ba.article.summary || "",
        sourceName: ba.article.source.name,
        author: ba.article.author,
      });
    }

    // Resolve topic names
    const topicSlugs = Array.from(sectionMap.keys());
    const topics = await prisma.topic.findMany({
      where: { slug: { in: topicSlugs } },
    });
    const slugToName = new Map(topics.map((t) => [t.slug, t.name]));

    for (const section of sectionMap.values()) {
      section.topicName = slugToName.get(section.topicSlug) || section.topicSlug;
    }

    const compiled: CompiledBriefing = {
      briefingId,
      userId,
      sections: Array.from(sectionMap.values()),
    };

    await sendBriefingEmail(user, compiled);

    await prisma.briefing.update({
      where: { id: briefingId },
      data: { status: "sent", sentAt: new Date() },
    });

    console.log(`Briefing ${briefingId} sent to ${user.email}`);
  } catch (err) {
    await prisma.briefing.update({
      where: { id: briefingId },
      data: { status: "failed" },
    });
    throw err;
  }
}
