import type { Command } from "commander";
import { supabase } from "../config/database.js";

export function registerTopicCommands(program: Command): void {
  program
    .command("topics:list")
    .description("List all topics")
    .action(async () => {
      const { data: topics, error } = await supabase
        .from("topics")
        .select("id, name, slug, keywords")
        .order("id");

      if (error) {
        console.error(`Failed to list topics: ${error.message}`);
        process.exit(1);
      }

      if (!topics || topics.length === 0) {
        console.log("No topics found.");
      } else {
        for (const topic of topics) {
          console.log(
            `  [${topic.id}] ${topic.name} (${topic.slug}) — keywords: ${(topic.keywords || []).join(", ")}`
          );
        }
      }
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

      const { data: topic, error } = await supabase
        .from("topics")
        .insert({ name, slug, keywords: keywordList })
        .select("id, name, slug, keywords")
        .single();

      if (error) {
        console.error(`Failed to create topic: ${error.message}`);
        process.exit(1);
      }

      console.log(
        `Created topic: ${topic.name} (${topic.slug}) — keywords: ${(topic.keywords || []).join(", ")}`
      );
    });
}
