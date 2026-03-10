import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";

// ── Stats ──────────────────────────────────────────────

export interface DashboardStats {
  totalArticles: number;
  pendingArticles: number;
  completedArticles: number;
  failedArticles: number;
  totalSources: number;
  activeSources: number;
  totalUsers: number;
  totalTopics: number;
  totalBriefings: number;
  sentBriefings: number;
}

export function useStats() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const [articles, sources, users, topics, briefings] = await Promise.all([
        supabase.from("articles").select("summary_status"),
        supabase.from("sources").select("active"),
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("topics").select("id", { count: "exact", head: true }),
        supabase.from("briefings").select("status"),
      ]);

      const arts = articles.data ?? [];
      const srcs = sources.data ?? [];
      const brfs = briefings.data ?? [];

      return {
        totalArticles: arts.length,
        pendingArticles: arts.filter((a) => a.summary_status === "pending").length,
        completedArticles: arts.filter((a) => a.summary_status === "completed").length,
        failedArticles: arts.filter((a) => a.summary_status === "failed").length,
        totalSources: srcs.length,
        activeSources: srcs.filter((s) => s.active).length,
        totalUsers: users.count ?? 0,
        totalTopics: topics.count ?? 0,
        totalBriefings: brfs.length,
        sentBriefings: brfs.filter((b) => b.status === "sent").length,
      };
    },
    enabled: !!session,
  });
}

// ── Articles ───────────────────────────────────────────

export interface Article {
  id: number;
  title: string;
  url: string;
  author: string | null;
  summary: string | null;
  summary_status: string;
  published_at: string | null;
  created_at: string;
  source_id: number;
  sources: { name: string } | null;
}

export function useArticles(
  status?: string,
  limit = 50,
  offset = 0,
  searchQuery?: string
) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["articles", status, limit, offset, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("articles")
        .select("id, title, url, author, summary, summary_status, published_at, created_at, source_id, sources(name)")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (status && status !== "all") {
        query = query.eq("summary_status", status);
      }

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Article[];
    },
    enabled: !!session,
  });
}

export function useArticle(id: number) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["article", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*, sources(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Article & { content: string | null };
    },
    enabled: !!session && id > 0,
  });
}

// ── Sources ────────────────────────────────────────────

export interface Source {
  id: number;
  name: string;
  url: string;
  feed_url: string;
  active: boolean;
  last_fetched_at: string | null;
  fetch_failures: number;
  created_at: string;
}

export function useSources() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sources")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Source[];
    },
    enabled: !!session,
  });
}

// ── Topics ─────────────────────────────────────────────

export interface Topic {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  emoji: string | null;
  keywords: string[];
  created_at: string;
}

export function useTopics() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Topic[];
    },
    enabled: !!session,
  });
}

// ── Users ──────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  name: string | null;
  active: boolean;
  timezone: string;
  delivery_hour: number;
  role: string;
  created_at: string;
}

export function useUsers() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as User[];
    },
    enabled: !!session,
  });
}

// ── Briefings ──────────────────────────────────────────

export interface Briefing {
  id: number;
  user_id: number;
  briefing_date: string;
  status: string;
  compiled_at: string | null;
  sent_at: string | null;
  article_count: number;
  created_at: string;
  users: { email: string; name: string | null } | null;
}

export function useBriefings(limit = 50) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["briefings", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefings")
        .select("*, users(email, name)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Briefing[];
    },
    enabled: !!session,
  });
}

export interface BriefingDetail {
  id: number;
  briefing_date: string;
  status: string;
  article_count: number;
  users: { email: string; name: string | null } | null;
  briefing_articles: {
    position: number;
    topic_slug: string;
    articles: {
      id: number;
      title: string;
      url: string;
      summary: string | null;
      author: string | null;
      sources: { name: string } | null;
    };
  }[];
}

export function useBriefingDetail(id: number) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["briefing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefings")
        .select(
          "id, briefing_date, status, article_count, users(email, name), briefing_articles(position, topic_slug, articles(id, title, url, summary, author, sources(name)))"
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as BriefingDetail;
    },
    enabled: !!session && id > 0,
  });
}

// ── Article stats over time (for chart) ────────────────

export function useArticleTimeline() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["article-timeline"],
    queryFn: async () => {
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data, error } = await supabase
        .from("articles")
        .select("created_at, summary_status")
        .gte("created_at", sevenDaysAgo)
        .order("created_at");

      if (error) throw error;

      // Group by day
      const days = new Map<string, { date: string; articles: number; summarized: number }>();
      for (const a of data ?? []) {
        const day = a.created_at.split("T")[0];
        const entry = days.get(day) ?? { date: day, articles: 0, summarized: 0 };
        entry.articles++;
        if (a.summary_status === "completed") entry.summarized++;
        days.set(day, entry);
      }

      return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!session,
  });
}
