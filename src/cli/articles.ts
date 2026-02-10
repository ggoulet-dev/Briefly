import type { Command } from "commander";
import { fetchAllFeeds } from "../services/rss/bulkFetcher.js";
import { summarizePendingArticles } from "../services/ai/summarizer.js";
import { prisma } from "../config/database.js";

export function registerArticleCommands(program: Command): void {
  program
    .command("articles:fetch")
    .description("Fetch articles from all active RSS feeds")
    .action(async () => {
      await fetchAllFeeds();
      await prisma.$disconnect();
    });

  program
    .command("articles:summarize")
    .description("Summarize all pending articles with AI")
    .action(async () => {
      await summarizePendingArticles();
      await prisma.$disconnect();
    });

  program
    .command("articles:stats")
    .description("Show article statistics")
    .action(async () => {
      const total = await prisma.article.count();
      const pending = await prisma.article.count({
        where: { summaryStatus: "pending" },
      });
      const completed = await prisma.article.count({
        where: { summaryStatus: "completed" },
      });
      const failed = await prisma.article.count({
        where: { summaryStatus: "failed" },
      });

      console.log("Article statistics:");
      console.log(`  Total:     ${total}`);
      console.log(`  Pending:   ${pending}`);
      console.log(`  Completed: ${completed}`);
      console.log(`  Failed:    ${failed}`);

      await prisma.$disconnect();
    });
}
