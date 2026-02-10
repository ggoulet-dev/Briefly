import type { Job } from "bullmq";
import { summarizePendingArticles } from "../services/ai/summarizer.js";

export async function processSummarizeArticles(_job: Job): Promise<void> {
  await summarizePendingArticles();
}
