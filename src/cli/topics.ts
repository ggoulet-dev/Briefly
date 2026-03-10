import type { Command } from "commander";
import { supabase } from "../config/database.js";

export function registerTopicCommands(program: Command): void {
  program
    .command("topics:list")
    .description("List all topics")
    .action(async () => {
      const { data: topics, error } = await supabase
        .from("topics")
        .select("id, name, slug, emoji, keywords")
        .order("id");

      if (error) {
        console.error(`Failed to list topics: ${error.message}`);
        process.exit(1);
      }

      if (!topics || topics.length === 0) {
        console.log("No topics found.");
      } else {
        for (const topic of topics) {
          const emojiPrefix = topic.emoji ? `${topic.emoji} ` : "";
          console.log(
            `  [${topic.id}] ${emojiPrefix}${topic.name} (${topic.slug}) — keywords: ${(topic.keywords || []).join(", ")}`
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
    .option("-e, --emoji <emoji>", "Emoji for the topic (e.g. 🤖)")
    .action(async (name: string, slug: string, keywords: string | undefined, opts: { emoji?: string }) => {
      const keywordList = keywords
        ? keywords.split(",").map((k) => k.trim())
        : [];

      const { data: topic, error } = await supabase
        .from("topics")
        .insert({ name, slug, keywords: keywordList, emoji: opts.emoji ?? null })
        .select("id, name, slug, emoji, keywords")
        .single();

      if (error) {
        console.error(`Failed to create topic: ${error.message}`);
        process.exit(1);
      }

      const emojiPrefix = topic.emoji ? `${topic.emoji} ` : "";
      console.log(
        `Created topic: ${emojiPrefix}${topic.name} (${topic.slug}) — keywords: ${(topic.keywords || []).join(", ")}`
      );
    });

  program
    .command("topics:update")
    .description("Update a topic's emoji")
    .argument("<id>", "Topic ID")
    .option("-e, --emoji <emoji>", "Emoji for the topic (e.g. 🤖)")
    .option("-n, --name <name>", "Topic name")
    .action(async (id: string, opts: { emoji?: string; name?: string }) => {
      const updates: Record<string, unknown> = {};
      if (opts.emoji !== undefined) updates.emoji = opts.emoji;
      if (opts.name !== undefined) updates.name = opts.name;

      if (Object.keys(updates).length === 0) {
        console.error("No updates specified. Use --emoji or --name.");
        process.exit(1);
      }

      const { data: topic, error } = await supabase
        .from("topics")
        .update(updates)
        .eq("id", parseInt(id, 10))
        .select("id, name, slug, emoji, keywords")
        .single();

      if (error) {
        console.error(`Failed to update topic: ${error.message}`);
        process.exit(1);
      }

      const emojiPrefix = topic.emoji ? `${topic.emoji} ` : "";
      console.log(
        `Updated topic: ${emojiPrefix}${topic.name} (${topic.slug})`
      );
    });
}
