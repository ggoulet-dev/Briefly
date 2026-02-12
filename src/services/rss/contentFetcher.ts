import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { logger } from "../../config/logger.js";

const MAX_CONTENT_LENGTH = 5000;
const MAX_REDIRECTS = 10;

/**
 * Follows redirects manually while accumulating Set-Cookie headers,
 * which breaks cookie-gated redirect loops (e.g. TVA Sports / Qub).
 */
async function fetchWithCookies(
  url: string,
  timeout: number,
): Promise<Response> {
  const cookies: Map<string, string> = new Map();
  let currentUrl = url;

  for (let i = 0; i < MAX_REDIRECTS; i++) {
    const cookieHeader = [...cookies.values()].join("; ");
    const response = await fetch(currentUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Briefly/1.0; +https://briefly.app)",
        Accept: "text/html",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      redirect: "manual",
      signal: AbortSignal.timeout(timeout),
    });

    // Collect cookies from the response
    const setCookies = response.headers.getSetCookie();
    for (const sc of setCookies) {
      const pair = sc.split(";")[0]; // "name=value"
      const eqIdx = pair.indexOf("=");
      if (eqIdx > 0) {
        cookies.set(pair.slice(0, eqIdx).trim(), pair.trim());
      }
    }

    // If not a redirect, return the final response
    if (response.status < 300 || response.status >= 400 || !response.headers.get("location")) {
      return response;
    }

    // Resolve the next URL (handles relative redirects)
    currentUrl = new URL(response.headers.get("location")!, currentUrl).href;
  }

  throw new Error(`Too many redirects (>${MAX_REDIRECTS})`);
}

export async function fetchArticleContent(url: string): Promise<string | null> {
  try {
    const response = await fetchWithCookies(url, 15000);

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
