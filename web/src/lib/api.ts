import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

async function post<T = unknown>(url: string): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(url, { method: "POST", headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

// ── Source actions ──────────────────────────────────────

export function useFetchSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: number) =>
      post<{ newArticles: number; skipped: number }>(
        `/api/sources/${sourceId}/fetch`
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["articles"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useFetchAllSources() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      post<{ sources: number; newArticles: number; skipped: number; errors: number }>(
        "/api/sources/fetch-all"
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["articles"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// ── Article actions ────────────────────────────────────

export function useSummarizeAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      post<{ processed: number; failed: number }>("/api/articles/summarize-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["articles"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["article-timeline"] });
    },
  });
}

export function useSummarizeArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (articleId: number) =>
      post(`/api/articles/${articleId}/summarize`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["articles"] });
      qc.invalidateQueries({ queryKey: ["article"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useFetchArticleContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (articleId: number) =>
      post<{ hasContent: boolean }>(`/api/articles/${articleId}/fetch-content`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["article"] });
    },
  });
}

// ── Pipeline actions ───────────────────────────────────

export function useFetchAndSummarize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      post<{ fetched: number; summarized: number; failed: number }>(
        "/api/pipeline/fetch-and-summarize"
      ),
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

// ── Briefing actions ───────────────────────────────────

export function useCompileBriefings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      post<{ compiled: number }>("/api/briefings/compile"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["briefings"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// ── Discord actions ────────────────────────────────────

export function usePostToDiscord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post<{ posted: number }>("/api/discord/post"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
