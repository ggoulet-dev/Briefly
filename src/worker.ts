import { Worker, type Job } from "bullmq";
import { redis } from "./config/redis.js";
import { logger } from "./config/logger.js";
import { setupCronJobs } from "./jobs/queues.js";
import { processFetchArticles } from "./jobs/fetchArticles.js";
import { processSummarizeArticles } from "./jobs/summarizeArticles.js";
import { processCompileBriefings } from "./jobs/compileBriefings.js";
import { processCleanup } from "./jobs/cleanup.js";

const connection = redis;

function createWorker(
  name: string,
  handler: (job: Job) => Promise<void>,
  concurrency = 1
): Worker {
  const worker = new Worker(name, handler, { connection, concurrency });

  worker.on("completed", (job) => {
    logger.info(`Job completed: ${name}/${job.name}`, { jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logger.error(`Job failed: ${name}/${job?.name}`, {
      jobId: job?.id,
      error: err.message,
    });
  });

  return worker;
}

// Feeds worker
createWorker("feeds", async (job) => {
  if (job.name === "fetchArticles") return processFetchArticles(job);
});

// AI worker
createWorker("ai", async (job) => {
  if (job.name === "summarizeArticles") return processSummarizeArticles(job);
});

// Briefings worker
createWorker("briefings", async (job) => {
  if (job.name === "compileBriefings") return processCompileBriefings(job);
});

// Maintenance worker
createWorker("maintenance", async (job) => {
  if (job.name === "cleanup") return processCleanup(job);
});

// Set up cron schedules
await setupCronJobs();

logger.info("Briefly worker started. Listening for jobs...");
