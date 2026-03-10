import type { Command } from "commander";
import { fetchAllFeeds } from "../services/rss/bulkFetcher.js";
import { summarizePendingArticles } from "../services/ai/summarizer.js";
import { postToDiscord } from "../services/discord/poster.js";

export function registerPipelineCommands(program: Command): void {
  program
    .command("pipeline:run")
    .description("Run the full pipeline: fetch → summarize → post to Discord")
    .action(async () => {
      console.log("=== Step 1/3: Fetching articles ===");
      await fetchAllFeeds();

      console.log("\n=== Step 2/3: Summarizing articles ===");
      await summarizePendingArticles();

      console.log("\n=== Step 3/3: Posting to Discord ===");
      const { posted } = await postToDiscord();

      if (posted === 0) {
        console.log("No articles to post.");
      } else {
        console.log(`Posted ${posted} article(s) to Discord.`);
      }

      console.log("\n=== Pipeline complete ===");
    });
}
