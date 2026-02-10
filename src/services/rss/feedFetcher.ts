import Parser from "rss-parser";
import { createHash } from "crypto";
import { supabase } from "../../config/database.js";

const parser = new Parser();

export interface Source {
  id: number;
  name: string;
  url: string;
  feed_url: string;
  active: boolean;
  last_fetched_at: string | null;
  etag: string | null;
  last_modified: string | null;
  fetch_failures: number;
}

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
    if (source.last_modified) headers["If-Modified-Since"] = source.last_modified;

    const response = await fetch(source.feed_url, { headers });

    // 304 Not Modified — nothing new
    if (response.status === 304) {
      await supabase
        .from("sources")
        .update({ last_fetched_at: new Date().toISOString() })
        .eq("id", source.id);
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

      const { error } = await supabase.from("articles").insert({
        source_id: source.id,
        title: item.title,
        url: item.link,
        author: item.creator || item.author || null,
        content: item.contentSnippet || item.content || null,
        published_at: item.isoDate ? new Date(item.isoDate).toISOString() : null,
        guid: item.guid || item.link,
        content_hash: contentHash,
      });

      if (error) {
        // Unique constraint violation — article already exists
        if (error.code === "23505") {
          result.skipped++;
        } else {
          throw new Error(error.message);
        }
      } else {
        result.newArticles++;
      }
    }

    // Update source metadata
    await supabase
      .from("sources")
      .update({
        last_fetched_at: new Date().toISOString(),
        etag: newEtag,
        last_modified: newLastModified,
        fetch_failures: 0,
      })
      .eq("id", source.id);

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    result.error = message;

    // Increment failure counter
    await supabase
      .from("sources")
      .update({
        fetch_failures: source.fetch_failures + 1,
        last_fetched_at: new Date().toISOString(),
      })
      .eq("id", source.id);

    return result;
  }
}
