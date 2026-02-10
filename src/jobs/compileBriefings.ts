import type { Job } from "bullmq";
import { compileAllBriefings } from "../services/briefings/compiler.js";
import { mailersQueue } from "./queues.js";
import { prisma } from "../config/database.js";

export async function processCompileBriefings(_job: Job): Promise<void> {
  await compileAllBriefings();

  // Queue send jobs for all compiled briefings
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const briefings = await prisma.briefing.findMany({
    where: {
      briefingDate: today,
      status: "compiled",
    },
    include: { user: true },
  });

  for (const briefing of briefings) {
    await mailersQueue.add("sendBriefing", {
      briefingId: briefing.id,
      userId: briefing.userId,
    });
  }

  console.log(`Queued ${briefings.length} briefing email(s) for delivery.`);
}
