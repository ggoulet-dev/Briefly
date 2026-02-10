import type { Command } from "commander";
import { postToDiscord } from "../services/discord/poster.js";

export function registerDiscordCommands(program: Command): void {
  program
    .command("discord:post")
    .description("Post recent news summaries to Discord")
    .action(async () => {
      console.log("Posting news to Discord...");
      const { posted } = await postToDiscord();

      if (posted === 0) {
        console.log("No articles to post.");
      } else {
        console.log(`Posted ${posted} topic embed(s) to Discord.`);
      }
    });
}
