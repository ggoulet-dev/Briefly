import { supabase } from "../../config/database.js";
import { logger } from "../../config/logger.js";
import { fetchFeed, type FetchResult, type Source } from "./feedFetcher.js";

export async function fetchAllFeeds(): Promise<FetchResult[]> {
  const { data: sources, error } = await supabase
    .from("sources")
    .select("*")
    .eq("active", true);

  if (error) throw new Error(`Failed to fetch sources: ${error.message}`);

  const feedSources = (sources || []) as Source[];
  logger.info(`Fetching ${feedSources.length} active feed(s)`);

  const results: FetchResult[] = [];

  for (const source of feedSources) {
    logger.info(`Fetching: ${source.name}`, { feedUrl: source.feed_url });
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
