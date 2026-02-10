import type { Job } from "bullmq";
import { supabase } from "../config/database.js";

export async function processCleanup(_job: Job): Promise<void> {
  const now = new Date();

  // Purge articles older than 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: deletedArticles } = await supabase
    .from("articles")
    .delete({ count: "exact" })
    .lt("created_at", thirtyDaysAgo);
  console.log(`Cleanup: deleted ${deletedArticles ?? 0} old article(s)`);

  // Purge briefings older than 90 days
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { count: deletedBriefings } = await supabase
    .from("briefings")
    .delete({ count: "exact" })
    .lt("created_at", ninetyDaysAgo);
  console.log(`Cleanup: deleted ${deletedBriefings ?? 0} old briefing(s)`);
}
