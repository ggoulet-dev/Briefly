import type { Command } from "commander";
import { fetchAllFeeds } from "../services/rss/bulkFetcher.js";
import { fetchFeed, type Source } from "../services/rss/feedFetcher.js";
import { summarizePendingArticles } from "../services/ai/summarizer.js";
import { supabase } from "../config/database.js";

export function registerArticleCommands(program: Command): void {
  program
    .command("articles:fetch")
    .description("Fetch articles from RSS feeds")
    .option("-s, --source <id>", "Fetch from a specific source ID only")
    .action(async (opts: { source?: string }) => {
      if (opts.source) {
        const { data: source } = await supabase
          .from("sources")
          .select("*")
          .eq("id", parseInt(opts.source, 10))
          .single();

        if (!source) {
          console.error(`Source not found: ${opts.source}`);
          process.exit(1);
        }

        console.log(`Fetching: ${source.name}`);
        const result = await fetchFeed(source as Source);

        if (result.error) {
          console.error(`Error: ${result.error}`);
        } else {
          console.log(`New: ${result.newArticles}, Skipped: ${result.skipped}`);
        }
      } else {
        await fetchAllFeeds();
      }
    });

  program
    .command("articles:summarize")
    .description("Summarize all pending articles with AI")
    .action(async () => {
      await summarizePendingArticles();
    });

  program
    .command("articles:stats")
    .description("Show article statistics")
    .action(async () => {
      const { count: total } = await supabase
        .from("articles")
        .select("*", { count: "exact", head: true });

      const { count: pending } = await supabase
        .from("articles")
        .select("*", { count: "exact", head: true })
        .eq("summary_status", "pending");

      const { count: completed } = await supabase
        .from("articles")
        .select("*", { count: "exact", head: true })
        .eq("summary_status", "completed");

      const { count: failed } = await supabase
        .from("articles")
        .select("*", { count: "exact", head: true })
        .eq("summary_status", "failed");

      console.log("Article statistics:");
      console.log(`  Total:     ${total ?? 0}`);
      console.log(`  Pending:   ${pending ?? 0}`);
      console.log(`  Completed: ${completed ?? 0}`);
      console.log(`  Failed:    ${failed ?? 0}`);
    });
}
