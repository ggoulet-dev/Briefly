import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"]! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create default topics
  const news = await prisma.topic.upsert({
    where: { slug: "news" },
    update: {},
    create: {
      name: "News",
      slug: "news",
      description: "General news and current events",
      keywords: ["news", "breaking", "current events", "actualité"],
    },
  });

  const politics = await prisma.topic.upsert({
    where: { slug: "politics" },
    update: {},
    create: {
      name: "Politics",
      slug: "politics",
      description: "Political news and government affairs",
      keywords: ["politics", "government", "election", "politique", "gouvernement"],
    },
  });

  const tech = await prisma.topic.upsert({
    where: { slug: "tech" },
    update: {},
    create: {
      name: "Technology",
      slug: "tech",
      description: "Technology news and innovation",
      keywords: ["technology", "tech", "AI", "software", "technologie"],
    },
  });

  const science = await prisma.topic.upsert({
    where: { slug: "science" },
    update: {},
    create: {
      name: "Science",
      slug: "science",
      description: "Science and environment news",
      keywords: ["science", "research", "environment", "climat", "recherche"],
    },
  });

  console.log("Created topics:", { news, politics, tech, science });

  // Create default source: Radio-Canada
  const radioCanada = await prisma.source.upsert({
    where: { feedUrl: "https://ici.radio-canada.ca/info/rss/info/a-la-une" },
    update: {},
    create: {
      name: "Radio-Canada - À la une",
      url: "https://ici.radio-canada.ca",
      feedUrl: "https://ici.radio-canada.ca/info/rss/info/a-la-une",
      active: true,
      sourceTopics: {
        create: { topicId: news.id },
      },
    },
  });

  console.log("Created source:", radioCanada);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
