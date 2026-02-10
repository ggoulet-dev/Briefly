import { program } from "commander";
import { registerUserCommands } from "./users.js";
import { registerSourceCommands } from "./sources.js";
import { registerTopicCommands } from "./topics.js";
import { registerArticleCommands } from "./articles.js";
import { registerBriefingCommands } from "./briefings.js";
import { registerDiscordCommands } from "./discord.js";

program
  .name("briefly")
  .description("Briefly — AI-Powered Daily News Summarization Platform")
  .version("1.0.0");

registerUserCommands(program);
registerSourceCommands(program);
registerTopicCommands(program);
registerArticleCommands(program);
registerBriefingCommands(program);
registerDiscordCommands(program);

program.parse();
