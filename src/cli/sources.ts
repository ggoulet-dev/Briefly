import type { Command } from "commander";
import { prisma } from "../config/database.js";
import { fetchFeed } from "../services/rss/feedFetcher.js";

export function registerSourceCommands(program: Command): void {
  program
    .command("sources:add")
    .description("Add an RSS source")
    .argument("<name>", "Source name")
    .argument("<feed_url>", "RSS feed URL")
    .argument("<url>", "Source website URL")
    .argument("[topic_slugs]", "Comma-separated topic slugs")
    .action(
      async (name: string, feedUrl: string, url: string, topicSlugs?: string) => {
        const source = await prisma.source.create({
          data: { name, feedUrl, url },
        });

        if (topicSlugs) {
          const slugs = topicSlugs.split(",").map((s) => s.trim());
          const topics = await prisma.topic.findMany({
            where: { slug: { in: slugs } },
          });

          for (const topic of topics) {
            await prisma.sourceTopic.create({
              data: { sourceId: source.id, topicId: topic.id },
            });
          }

          console.log(
            `Created source "${name}" (id: ${source.id}) linked to: ${topics.map((t) => t.slug).join(", ")}`
          );
        } else {
          console.log(`Created source "${name}" (id: ${source.id})`);
        }

        await prisma.$disconnect();
      }
    );

  program
    .command("sources:list")
    .description("List all sources")
    .action(async () => {
      const sources = await prisma.source.findMany({
        include: { sourceTopics: { include: { topic: true } } },
        orderBy: { id: "asc" },
      });

      if (sources.length === 0) {
        console.log("No sources found.");
      } else {
        for (const source of sources) {
          const topics =
            source.sourceTopics.map((st) => st.topic.slug).join(", ") || "none";
          const status = source.active ? "active" : "inactive";
          console.log(
            `  [${source.id}] ${source.name} (${status}) — topics: ${topics}`
          );
          console.log(`         Feed: ${source.feedUrl}`);
        }
      }

      await prisma.$disconnect();
    });

  program
    .command("sources:test-fetch")
    .description("Test fetching a single source")
    .argument("<id>", "Source ID")
    .action(async (id: string) => {
      const source = await prisma.source.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!source) {
        console.error(`Source not found: ${id}`);
        process.exit(1);
      }

      console.log(`Testing fetch for: ${source.name}`);
      const result = await fetchFeed(source);

      if (result.error) {
        console.error(`Error: ${result.error}`);
      } else {
        console.log(`New: ${result.newArticles}, Skipped: ${result.skipped}`);
      }

      await prisma.$disconnect();
    });
}
