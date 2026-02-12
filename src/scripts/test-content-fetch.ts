import { fetchArticleContent } from "../services/rss/contentFetcher.js";

const url = process.argv[2];

if (!url) {
  console.error("Usage: pnpm tsx src/scripts/test-content-fetch.ts <url>");
  process.exit(1);
}

console.log(`Fetching content from: ${url}\n`);

const content = await fetchArticleContent(url);

if (content) {
  console.log(`--- Extracted content (${content.length} chars) ---\n`);
  console.log(content);
} else {
  console.log("No content could be extracted.");
}
