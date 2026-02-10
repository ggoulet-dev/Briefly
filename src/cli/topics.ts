import type { Command } from "commander";
import { prisma } from "../config/database.js";

export function registerTopicCommands(program: Command): void {
  program
    .command("topics:list")
    .description("List all topics")
    .action(async () => {
      const topics = await prisma.topic.findMany({ orderBy: { id: "asc" } });

      if (topics.length === 0) {
        console.log("No topics found.");
      } else {
        for (const topic of topics) {
          console.log(
            `  [${topic.id}] ${topic.name} (${topic.slug}) — keywords: ${topic.keywords.join(", ")}`
          );
        }
      }

      await prisma.$disconnect();
    });

  program
    .command("topics:create")
    .description("Create a new topic")
    .argument("<name>", "Topic name")
    .argument("<slug>", "Topic slug")
    .argument("[keywords]", "Comma-separated keywords")
    .action(async (name: string, slug: string, keywords?: string) => {
      const keywordList = keywords
        ? keywords.split(",").map((k) => k.trim())
        : [];

      const topic = await prisma.topic.create({
        data: { name, slug, keywords: keywordList },
      });

      console.log(
        `Created topic: ${topic.name} (${topic.slug}) — keywords: ${topic.keywords.join(", ")}`
      );

      await prisma.$disconnect();
    });
}
