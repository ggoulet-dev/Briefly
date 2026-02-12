import type { Command } from "commander";

const COMMANDS: Record<string, { cmd: string; desc: string }[]> = {
  Users: [
    { cmd: "users:create <email> [name]", desc: "Create a new user" },
    { cmd: "users:list", desc: "List all users with their topics" },
    { cmd: "users:subscribe <email> <slugs>", desc: "Subscribe a user to topics (comma-separated slugs)" },
  ],
  Sources: [
    { cmd: "sources:add <name> <feed_url> <url> [slugs]", desc: "Add an RSS source, optionally linked to topics" },
    { cmd: "sources:list", desc: "List all sources" },
    { cmd: "sources:link <id> <slugs>", desc: "Link a source to topics" },
    { cmd: "sources:test-fetch <id>", desc: "Test fetching a single source" },
  ],
  Topics: [
    { cmd: "topics:create <name> <slug> [keywords]", desc: "Create a new topic" },
    { cmd: "topics:list", desc: "List all topics" },
  ],
  Articles: [
    { cmd: "articles:fetch [-s <id>]", desc: "Fetch articles from all feeds (or one source)" },
    { cmd: "articles:summarize", desc: "Summarize all pending articles with AI" },
    { cmd: "articles:summarize-one <id>", desc: "Summarize a single article by ID" },
    { cmd: "articles:list [-s <status>] [-l <n>]", desc: "List articles by summary status" },
    { cmd: "articles:stats", desc: "Show article statistics" },
  ],
  Briefings: [
    { cmd: "briefings:stats", desc: "Show briefing statistics" },
  ],
  Discord: [
    { cmd: "discord:post", desc: "Post recent news summaries to Discord" },
  ],
};

export function registerHelpCommand(program: Command): void {
  program
    .command("help")
    .description("Show all available commands grouped by category")
    .action(() => {
      console.log();
      console.log("Briefly — AI-Powered Daily News Summarization Platform");
      console.log();

      for (const [group, cmds] of Object.entries(COMMANDS)) {
        console.log(`  ${group}:`);
        for (const { cmd, desc } of cmds) {
          console.log(`    pnpm cli ${cmd}`);
          console.log(`      ${desc}`);
        }
        console.log();
      }

      console.log("  Data flow:");
      console.log("    sources → articles:fetch → articles:summarize → discord:post");
      console.log();
      console.log("  Background worker:");
      console.log("    pnpm worker        Start the BullMQ worker (requires Redis)");
      console.log();
    });
}
