import type { Command } from "commander";
import { fetchAllFeeds } from "../services/rss/bulkFetcher.js";
import { summarizePendingArticles } from "../services/ai/summarizer.js";
import { supabase } from "../config/database.js";

export function registerArticleCommands(program: Command): void {
  program
    .command("articles:fetch")
    .description("Fetch articles from all active RSS feeds")
    .action(async () => {
      await fetchAllFeeds();
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
