import type { Job } from "bullmq";
import { fetchAllFeeds } from "../services/rss/bulkFetcher.js";
import { aiQueue } from "./queues.js";

export async function processFetchArticles(_job: Job): Promise<void> {
  const results = await fetchAllFeeds();
  const totalNew = results.reduce((sum, r) => sum + r.newArticles, 0);

  // If new articles were fetched, trigger summarization
  if (totalNew > 0) {
    await aiQueue.add("summarizeArticles", {});
    console.log("Triggered summarization job for new articles.");
  }
}
