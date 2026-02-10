import type { Command } from "commander";
import { prisma } from "../config/database.js";
import { compileBriefingForUser } from "../services/briefings/compiler.js";
import { sendBriefingEmail } from "../services/email/briefingMailer.js";

export function registerBriefingCommands(program: Command): void {
  program
    .command("briefings:send-now")
    .description("Compile and send a briefing to a user immediately")
    .argument("<email>", "User email address")
    .action(async (email: string) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.error(`User not found: ${email}`);
        process.exit(1);
      }

      console.log(`Compiling briefing for ${email}...`);
      const compiled = await compileBriefingForUser(user);

      if (!compiled) {
        console.log("No articles available for briefing.");
        await prisma.$disconnect();
        return;
      }

      console.log(
        `Sending briefing with ${compiled.sections.length} topic(s)...`
      );
      await sendBriefingEmail(user, compiled);

      // Mark as sent
      await prisma.briefing.update({
        where: { id: compiled.briefingId },
        data: { status: "sent", sentAt: new Date() },
      });

      console.log(`Briefing sent to ${email}`);
      await prisma.$disconnect();
    });

  program
    .command("briefings:stats")
    .description("Show briefing statistics")
    .action(async () => {
      const total = await prisma.briefing.count();
      const sent = await prisma.briefing.count({
        where: { status: "sent" },
      });
      const failed = await prisma.briefing.count({
        where: { status: "failed" },
      });
      const pending = await prisma.briefing.count({
        where: { status: "pending" },
      });

      console.log("Briefing statistics:");
      console.log(`  Total:   ${total}`);
      console.log(`  Sent:    ${sent}`);
      console.log(`  Failed:  ${failed}`);
      console.log(`  Pending: ${pending}`);

      await prisma.$disconnect();
    });
}
