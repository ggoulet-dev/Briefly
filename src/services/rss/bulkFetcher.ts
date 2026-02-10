import { prisma } from "../../config/database.js";
import { logger } from "../../config/logger.js";
import { fetchFeed, type FetchResult } from "./feedFetcher.js";

export async function fetchAllFeeds(): Promise<FetchResult[]> {
  const sources = await prisma.source.findMany({
    where: { active: true },
  });

  logger.info(`Fetching ${sources.length} active feed(s)`);

  const results: FetchResult[] = [];

  for (const source of sources) {
    logger.info(`Fetching: ${source.name}`, { feedUrl: source.feedUrl });
    const result = await fetchFeed(source);

    if (result.error) {
      logger.error(`Feed fetch error: ${source.name}`, { error: result.error });
    } else {
      logger.info(`Fetched: ${source.name}`, {
        newArticles: result.newArticles,
        skipped: result.skipped,
      });
    }

    results.push(result);
  }

  const totalNew = results.reduce((sum, r) => sum + r.newArticles, 0);
  const totalErrors = results.filter((r) => r.error).length;
  logger.info("Feed fetch complete", { totalNew, totalErrors });

  return results;
}
