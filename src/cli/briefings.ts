import type { Command } from "commander";
import { supabase } from "../config/database.js";

export function registerBriefingCommands(program: Command): void {
  program
    .command("briefings:stats")
    .description("Show briefing statistics")
    .action(async () => {
      const { count: total } = await supabase
        .from("briefings")
        .select("*", { count: "exact", head: true });

      const { count: sent } = await supabase
        .from("briefings")
        .select("*", { count: "exact", head: true })
        .eq("status", "sent");

      const { count: failed } = await supabase
        .from("briefings")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed");

      const { count: pending } = await supabase
        .from("briefings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      console.log("Briefing statistics:");
      console.log(`  Total:   ${total ?? 0}`);
      console.log(`  Sent:    ${sent ?? 0}`);
      console.log(`  Failed:  ${failed ?? 0}`);
      console.log(`  Pending: ${pending ?? 0}`);
    });
}
