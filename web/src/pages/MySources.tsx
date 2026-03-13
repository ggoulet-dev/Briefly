import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { useSources } from "../lib/hooks";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { formatDistanceToNow } from "date-fns";

export function MySources() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: sources, isLoading: sourcesLoading } = useSources();

  // Fetch source-topic mappings
  const { data: sourceTopics } = useQuery({
    queryKey: ["source-topics-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("source_topics")
        .select("source_id, topics(name, emoji)");
      if (error) throw error;
      const map = new Map<number, { name: string; emoji: string | null }[]>();
      for (const st of data ?? []) {
        const topic = st.topics as unknown as { name: string; emoji: string | null };
        if (!topic) continue;
        const list = map.get(st.source_id) ?? [];
        list.push(topic);
        map.set(st.source_id, list);
      }
      return map;
    },
    enabled: !!user,
  });

  // Fetch article counts per source (last 7 days)
  const { data: articleCounts } = useQuery({
    queryKey: ["source-article-counts"],
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("articles")
        .select("source_id")
        .gte("created_at", weekAgo);
      if (error) throw error;
      const counts = new Map<number, number>();
      for (const a of data ?? []) {
        counts.set(a.source_id, (counts.get(a.source_id) ?? 0) + 1);
      }
      return counts;
    },
    enabled: !!user,
  });

  // Fetch user's favorited sources
  const { data: favorited, isLoading: favLoading } = useQuery({
    queryKey: ["user-sources", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_sources")
        .select("source_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set(data.map((d) => d.source_id));
    },
    enabled: !!user,
  });

  const favorite = useMutation({
    mutationFn: async (sourceId: number) => {
      const { error } = await supabase
        .from("user_sources")
        .insert({ user_id: user!.id, source_id: sourceId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-sources"] });
      qc.invalidateQueries({ queryKey: ["home-feed"] });
      toast("Source favorited!", "success");
    },
    onError: (e) => toast(e.message, "error"),
  });

  const unfavorite = useMutation({
    mutationFn: async (sourceId: number) => {
      const { error } = await supabase
        .from("user_sources")
        .delete()
        .eq("user_id", user!.id)
        .eq("source_id", sourceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-sources"] });
      qc.invalidateQueries({ queryKey: ["home-feed"] });
      toast("Source unfavorited", "info");
    },
    onError: (e) => toast(e.message, "error"),
  });

  const isLoading = sourcesLoading || favLoading;
  const activeSources = sources?.filter((s) => s.active) ?? [];

  return (
    <div>
      <PageHeader
        title="My Sources"
        description="Browse and favorite news sources"
      />

      {isLoading ? (
        <Spinner />
      ) : !activeSources.length ? (
        <EmptyState message="No sources available" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeSources.map((s) => {
            const isFav = favorited?.has(s.id) ?? false;
            const topics = sourceTopics?.get(s.id) ?? [];
            const count = articleCounts?.get(s.id) ?? 0;
            return (
              <div key={s.id} className="card">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-200">
                    {s.name}
                  </h3>
                  <button
                    onClick={() =>
                      isFav ? unfavorite.mutate(s.id) : favorite.mutate(s.id)
                    }
                    disabled={favorite.isPending || unfavorite.isPending}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xl transition-colors ${
                      isFav
                        ? "text-yellow-400 hover:bg-yellow-400/10 hover:text-yellow-300"
                        : "text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400"
                    }`}
                    title={isFav ? "Unfavorite" : "Favorite"}
                  >
                    {isFav ? "★" : "☆"}
                  </button>
                </div>

                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2 block truncate text-xs text-zinc-500 hover:text-blue-400 transition-colors"
                >
                  {s.url}
                </a>

                {topics.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {topics.map((t) => (
                      <span
                        key={t.name}
                        className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400"
                      >
                        {t.emoji && `${t.emoji} `}{t.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 text-[11px] text-zinc-600">
                  <span>
                    {s.last_fetched_at
                      ? `Fetched ${formatDistanceToNow(new Date(s.last_fetched_at), { addSuffix: true })}`
                      : "Never fetched"}
                  </span>
                  {count > 0 && (
                    <>
                      <span>&middot;</span>
                      <span>{count} article{count !== 1 ? "s" : ""} this week</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
