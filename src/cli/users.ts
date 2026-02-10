import type { Command } from "commander";
import { prisma } from "../config/database.js";
import { generateMagicLink } from "../services/auth/magicLinkGenerator.js";
import { sendMagicLinkEmail } from "../services/email/authMailer.js";

export function registerUserCommands(program: Command): void {
  program
    .command("users:create")
    .description("Create a user and send a magic link")
    .argument("<email>", "User email address")
    .argument("[name]", "User name")
    .action(async (email: string, name?: string) => {
      const user = await prisma.user.create({
        data: { email, name },
      });
      console.log(`Created user: ${user.email} (id: ${user.id})`);

      const token = await generateMagicLink(user);
      await sendMagicLinkEmail(user, token);
      console.log(`Magic link sent to ${user.email}`);

      await prisma.$disconnect();
    });

  program
    .command("users:list")
    .description("List all users with their topics")
    .action(async () => {
      const users = await prisma.user.findMany({
        include: {
          userTopics: { include: { topic: true } },
        },
        orderBy: { id: "asc" },
      });

      if (users.length === 0) {
        console.log("No users found.");
      } else {
        for (const user of users) {
          const topics = user.userTopics.map((ut) => ut.topic.slug).join(", ") || "none";
          const status = user.active ? "active" : "inactive";
          console.log(
            `  [${user.id}] ${user.email} (${status}) — topics: ${topics}`
          );
        }
      }

      await prisma.$disconnect();
    });

  program
    .command("users:subscribe")
    .description("Subscribe a user to topics")
    .argument("<email>", "User email")
    .argument("<topic_slugs>", "Comma-separated topic slugs")
    .action(async (email: string, topicSlugs: string) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.error(`User not found: ${email}`);
        process.exit(1);
      }

      const slugs = topicSlugs.split(",").map((s) => s.trim());
      const topics = await prisma.topic.findMany({
        where: { slug: { in: slugs } },
      });

      if (topics.length === 0) {
        console.error(`No matching topics found for: ${topicSlugs}`);
        process.exit(1);
      }

      for (const topic of topics) {
        await prisma.userTopic.upsert({
          where: {
            userId_topicId: { userId: user.id, topicId: topic.id },
          },
          update: {},
          create: {
            userId: user.id,
            topicId: topic.id,
            priority: 0,
          },
        });
      }

      console.log(
        `Subscribed ${email} to: ${topics.map((t) => t.slug).join(", ")}`
      );

      await prisma.$disconnect();
    });
}
