import type { Command } from "commander";
import { fetchAllFeeds } from "../services/rss/bulkFetcher.js";
import { fetchFeed, type Source } from "../services/rss/feedFetcher.js";
import { summarizeArticle, summarizePendingArticles } from "../services/ai/summarizer.js";
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
    .command("articles:list")
    .description("List articles by summary status")
    .option(
      "-s, --status <status>",
      "Filter by summary_status (pending, processing, completed, failed)",
      "pending"
    )
    .option("-l, --limit <n>", "Max articles to show", "20")
    .action(async (opts: { status: string; limit: string }) => {
      const validStatuses = ["pending", "processing", "completed", "failed"];
      if (!validStatuses.includes(opts.status)) {
        console.error(
          `Invalid status: ${opts.status}. Must be one of: ${validStatuses.join(", ")}`
        );
        process.exit(1);
      }

      const { data: articles, error } = await supabase
        .from("articles")
        .select("id, title, url, source_id, published_at, created_at")
        .eq("summary_status", opts.status)
        .order("created_at", { ascending: false })
        .limit(parseInt(opts.limit, 10));

      if (error) {
        console.error("Error fetching articles:", error.message);
        process.exit(1);
      }

      if (!articles || articles.length === 0) {
        console.log(`No articles with status: ${opts.status}`);
        return;
      }

      console.log(`Articles with status "${opts.status}" (${articles.length}):\n`);
      for (const a of articles) {
        console.log(`  [${a.id}] ${a.title}`);
        console.log(`       ${a.url}`);
        console.log(`       Created: ${a.created_at}\n`);
      }
    });

  program
    .command("articles:summarize-one")
    .description("Summarize a single article by ID")
    .argument("<id>", "Article ID")
    .action(async (id: string) => {
      const { data: article, error } = await supabase
        .from("articles")
        .select("id, title, url, author, content, summary_status")
        .eq("id", parseInt(id, 10))
        .single();

      if (error || !article) {
        console.error(`Article not found: ${id}`);
        process.exit(1);
      }

      console.log(`Summarizing: [${article.id}] ${article.title}`);
      await summarizeArticle(article);

      const { data: updated } = await supabase
        .from("articles")
        .select("summary, summary_status")
        .eq("id", article.id)
        .single();

      if (updated?.summary_status === "completed") {
        console.log(`\nSummary:\n${updated.summary}`);
      } else {
        console.error(`\nSummarization failed (status: ${updated?.summary_status})`);
        process.exit(1);
      }
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
