import Parser from "rss-parser";
import { createHash } from "crypto";
import { prisma } from "../../config/database.js";
import type { Source } from "../../../generated/prisma/client.js";

const parser = new Parser();

export interface FetchResult {
  source: Source;
  newArticles: number;
  skipped: number;
  error?: string;
}

export async function fetchFeed(source: Source): Promise<FetchResult> {
  const result: FetchResult = { source, newArticles: 0, skipped: 0 };

  try {
    // Build request with conditional headers
    const headers: Record<string, string> = {};
    if (source.etag) headers["If-None-Match"] = source.etag;
    if (source.lastModified) headers["If-Modified-Since"] = source.lastModified;

    const response = await fetch(source.feedUrl, { headers });

    // 304 Not Modified — nothing new
    if (response.status === 304) {
      await prisma.source.update({
        where: { id: source.id },
        data: { lastFetchedAt: new Date() },
      });
      return result;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    const feed = await parser.parseString(xml);

    // Store conditional headers for next fetch
    const newEtag = response.headers.get("etag") || null;
    const newLastModified = response.headers.get("last-modified") || null;

    for (const item of feed.items) {
      if (!item.link || !item.title) {
        result.skipped++;
        continue;
      }

      const contentHash = item.content
        ? createHash("sha256").update(item.content).digest("hex")
        : null;

      try {
        await prisma.article.create({
          data: {
            sourceId: source.id,
            title: item.title,
            url: item.link,
            author: item.creator || item.author || null,
            content: item.contentSnippet || item.content || null,
            publishedAt: item.isoDate ? new Date(item.isoDate) : null,
            guid: item.guid || item.link,
            contentHash,
          },
        });
        result.newArticles++;
      } catch (err: unknown) {
        // Unique constraint violation — article already exists
        if (
          err instanceof Error &&
          "code" in err &&
          (err as { code: string }).code === "P2002"
        ) {
          result.skipped++;
        } else {
          throw err;
        }
      }
    }

    // Update source metadata
    await prisma.source.update({
      where: { id: source.id },
      data: {
        lastFetchedAt: new Date(),
        etag: newEtag,
        lastModified: newLastModified,
        fetchFailures: 0,
      },
    });

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    result.error = message;

    // Increment failure counter
    await prisma.source.update({
      where: { id: source.id },
      data: {
        fetchFailures: { increment: 1 },
        lastFetchedAt: new Date(),
      },
    });

    return result;
  }
}
