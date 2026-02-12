import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { logger } from "../../config/logger.js";

const MAX_CONTENT_LENGTH = 5000;

export async function fetchArticleContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Briefly/1.0; +https://briefly.app)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      logger.warn(`Failed to fetch article: HTTP ${response.status}`, { url });
      return null;
    }

    const html = await response.text();
    const { document } = parseHTML(html);
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article?.textContent) return null;

    // Trim to reasonable length for the LLM
    const text = article.textContent.replace(/\s+/g, " ").trim();
    return text.length > MAX_CONTENT_LENGTH
      ? text.slice(0, MAX_CONTENT_LENGTH) + "..."
      : text;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Failed to extract article content: ${message}`, { url });
    return null;
  }
}
