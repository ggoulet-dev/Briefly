import type { Command } from "commander";
import { supabase } from "../config/database.js";

export function registerUserCommands(program: Command): void {
  program
    .command("users:create")
    .description("Create a new user")
    .argument("<email>", "User email address")
    .argument("[name]", "User name")
    .action(async (email: string, name?: string) => {
      const { data: user, error } = await supabase
        .from("users")
        .insert({ email, name: name || null })
        .select("id, email")
        .single();

      if (error) {
        console.error(`Failed to create user: ${error.message}`);
        process.exit(1);
      }

      console.log(`Created user: ${user.email} (id: ${user.id})`);
    });

  program
    .command("users:list")
    .description("List all users with their topics")
    .action(async () => {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, email, active, user_topics(topic_id, topics(slug))")
        .order("id");

      if (error) {
        console.error(`Failed to list users: ${error.message}`);
        process.exit(1);
      }

      if (!users || users.length === 0) {
        console.log("No users found.");
      } else {
        for (const user of users) {
          const topicEntries = (user.user_topics || []) as unknown as { topics: { slug: string } }[];
          const topics = topicEntries
            .map((ut) => ut.topics?.slug)
            .filter(Boolean)
            .join(", ") || "none";
          const status = user.active ? "active" : "inactive";
          console.log(
            `  [${user.id}] ${user.email} (${status}) — topics: ${topics}`
          );
        }
      }
    });

  program
    .command("users:subscribe")
    .description("Subscribe a user to topics")
    .argument("<email>", "User email")
    .argument("<topic_slugs>", "Comma-separated topic slugs")
    .action(async (email: string, topicSlugs: string) => {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (!user) {
        console.error(`User not found: ${email}`);
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
        const { error } = await supabase.from("user_topics").upsert(
          { user_id: user.id, topic_id: topic.id, priority: 0 },
          { onConflict: "user_id,topic_id" }
        );
        if (error) {
          console.error(`Failed to subscribe to ${topic.slug}: ${error.message}`);
        }
      }

      console.log(
        `Subscribed ${email} to: ${topics.map((t) => t.slug).join(", ")}`
      );
    });
}
