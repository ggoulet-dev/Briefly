import type { Command } from "commander";
import { supabase } from "../config/database.js";
import { fetchFeed, type Source } from "../services/rss/feedFetcher.js";

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
        const { data: source, error } = await supabase
          .from("sources")
          .insert({ name, feed_url: feedUrl, url })
          .select("id")
          .single();

        if (error) {
          console.error(`Failed to create source: ${error.message}`);
          process.exit(1);
        }

        if (topicSlugs) {
          const slugs = topicSlugs.split(",").map((s) => s.trim());
          const { data: topics } = await supabase
            .from("topics")
            .select("id, slug")
            .in("slug", slugs);

          if (topics) {
            for (const topic of topics) {
              await supabase
                .from("source_topics")
                .insert({ source_id: source.id, topic_id: topic.id });
            }
            console.log(
              `Created source "${name}" (id: ${source.id}) linked to: ${topics.map((t) => t.slug).join(", ")}`
            );
          }
        } else {
          console.log(`Created source "${name}" (id: ${source.id})`);
        }
      }
    );

  program
    .command("sources:list")
    .description("List all sources")
    .action(async () => {
      const { data: sources, error } = await supabase
        .from("sources")
        .select("id, name, feed_url, active, source_topics(topic_id, topics(slug))")
        .order("id");

      if (error) {
        console.error(`Failed to list sources: ${error.message}`);
        process.exit(1);
      }

      if (!sources || sources.length === 0) {
        console.log("No sources found.");
      } else {
        for (const source of sources) {
          const topicEntries = (source.source_topics || []) as unknown as { topics: { slug: string } }[];
          const topics = topicEntries
            .map((st) => st.topics?.slug)
            .filter(Boolean)
            .join(", ") || "none";
          const status = source.active ? "active" : "inactive";
          console.log(
            `  [${source.id}] ${source.name} (${status}) — topics: ${topics}`
          );
          console.log(`         Feed: ${source.feed_url}`);
        }
      }
    });

  program
    .command("sources:link")
    .description("Link a source to topics")
    .argument("<id>", "Source ID")
    .argument("<topic_slugs>", "Comma-separated topic slugs")
    .action(async (id: string, topicSlugs: string) => {
      const sourceId = parseInt(id, 10);
      const { data: source } = await supabase
        .from("sources")
        .select("id, name")
        .eq("id", sourceId)
        .single();

      if (!source) {
        console.error(`Source not found: ${id}`);
        process.exit(1);
      }

      const slugs = topicSlugs.split(",").map((s) => s.trim());
      const { data: topics } = await supabase
        .from("topics")
        .select("id, slug")
        .in("slug", slugs);

      if (!topics || topics.length === 0) {
        console.error(`No matching topics found for: ${topicSlugs}`);
        process.exit(1);
      }

      for (const topic of topics) {
        const { error } = await supabase
          .from("source_topics")
          .upsert(
            { source_id: sourceId, topic_id: topic.id },
            { onConflict: "source_id,topic_id" }
          );
        if (error) {
          console.error(`Failed to link to ${topic.slug}: ${error.message}`);
        }
      }

      console.log(
        `Linked "${source.name}" to: ${topics.map((t) => t.slug).join(", ")}`
      );
    });

  program
    .command("sources:test-fetch")
    .description("Test fetching a single source")
    .argument("<id>", "Source ID")
    .action(async (id: string) => {
      const { data: source } = await supabase
        .from("sources")
        .select("*")
        .eq("id", parseInt(id, 10))
        .single();

      if (!source) {
        console.error(`Source not found: ${id}`);
        process.exit(1);
      }

      console.log(`Testing fetch for: ${source.name}`);
      const result = await fetchFeed(source as Source);

      if (result.error) {
        console.error(`Error: ${result.error}`);
      } else {
        console.log(`New: ${result.newArticles}, Skipped: ${result.skipped}`);
      }
    });
}
