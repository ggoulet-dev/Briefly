import type { Article } from "../../../generated/prisma/client.js";

export function buildSystemPrompt(): string {
  return `You are a news summarizer. Your job is to create concise, informative summaries of news articles.

Rules:
- Write the summary in the same language as the original article.
- Keep summaries to 2-3 sentences (max 100 words).
- Focus on the key facts: who, what, when, where, why.
- Be neutral and factual — no opinions or editorializing.
- If the article content is too short or unclear, summarize what is available.`;
}

export function buildUserPrompt(article: Article): string {
  const parts = [`Title: ${article.title}`];

  if (article.author) {
    parts.push(`Author: ${article.author}`);
  }

  if (article.content) {
    parts.push(`Content: ${article.content}`);
  }

  parts.push("\nPlease provide a concise summary of this article.");

  return parts.join("\n");
}
