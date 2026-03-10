import type { Command } from "commander";
import { supabase } from "../config/database.js";

export function registerUserCommands(program: Command): void {
  program
    .command("users:create")
    .description("Create a new user via Supabase Auth")
    .argument("<email>", "User email address")
    .argument("[name]", "User name")
    .option("--password <password>", "User password (min 6 characters)")
    .option("--role <role>", "User role (admin or user)", "user")
    .action(async (email: string, name: string | undefined, opts: { password?: string; role?: string }) => {
      if (!opts.password) {
        console.error("--password is required for creating auth users");
        process.exit(1);
      }

      if (opts.role && !["admin", "user"].includes(opts.role)) {
        console.error("Role must be 'admin' or 'user'");
        process.exit(1);
      }

      // Create the auth user (trigger will auto-create public.users row)
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password: opts.password,
          email_confirm: true,
          user_metadata: { name: name || null },
        });

      if (authError) {
        console.error(`Failed to create auth user: ${authError.message}`);
        process.exit(1);
      }

      // Set role if admin
      if (opts.role === "admin") {
        const { error: roleError } = await supabase
          .from("users")
          .update({ role: "admin" })
          .eq("auth_id", authData.user.id);

        if (roleError) {
          console.error(`User created but failed to set role: ${roleError.message}`);
          process.exit(1);
        }
      }

      // Update name if provided (trigger may have already set it)
      if (name) {
        await supabase
          .from("users")
          .update({ name })
          .eq("auth_id", authData.user.id);
      }

      console.log(
        `Created user: ${email} (auth_id: ${authData.user.id}, role: ${opts.role ?? "user"})`
      );
    });

  program
    .command("users:set-role")
    .description("Set user role (admin or user)")
    .argument("<email>", "User email")
    .argument("<role>", "Role: admin or user")
    .action(async (email: string, role: string) => {
      if (!["admin", "user"].includes(role)) {
        console.error("Role must be 'admin' or 'user'");
        process.exit(1);
      }

      const { data: user, error: findError } = await supabase
        .from("users")
        .select("id, email, role")
        .eq("email", email)
        .single();

      if (findError || !user) {
        console.error(`User not found: ${email}`);
        process.exit(1);
      }

      const { error } = await supabase
        .from("users")
        .update({ role })
        .eq("id", user.id);

      if (error) {
        console.error(`Failed to update role: ${error.message}`);
        process.exit(1);
      }

      console.log(`Updated ${email}: role ${user.role} → ${role}`);
    });

  program
    .command("users:list")
    .description("List all users with their topics")
    .action(async () => {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, email, active, role, user_topics(topic_id, topics(slug))")
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
            `  [${user.id}] ${user.email} (${status}, ${user.role ?? "user"}) — topics: ${topics}`
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
