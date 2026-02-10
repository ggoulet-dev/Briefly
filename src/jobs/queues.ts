import { Queue } from "bullmq";
import { redis } from "../config/redis.js";

const connection = redis;

export const feedsQueue = new Queue("feeds", { connection });
export const aiQueue = new Queue("ai", { connection });
export const briefingsQueue = new Queue("briefings", { connection });
export const maintenanceQueue = new Queue("maintenance", { connection });

export async function setupCronJobs(): Promise<void> {
  // Fetch articles every 2 hours
  await feedsQueue.upsertJobScheduler(
    "fetch-articles-cron",
    { pattern: "0 */2 * * *" },
    { name: "fetchArticles" }
  );

  // Compile briefings at 6am UTC
  await briefingsQueue.upsertJobScheduler(
    "compile-briefings-cron",
    { pattern: "0 6 * * *" },
    { name: "compileBriefings" }
  );

  // Cleanup old data weekly (Sunday 3am UTC)
  await maintenanceQueue.upsertJobScheduler(
    "cleanup-cron",
    { pattern: "0 3 * * 0" },
    { name: "cleanup" }
  );

  console.log("Cron jobs scheduled.");
}
