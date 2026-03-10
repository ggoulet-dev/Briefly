import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";

interface Topic {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  emoji: string | null;
  keywords: string[];
}

export function MyTopics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Topic[];
    },
    enabled: !!user,
  });

  const { data: subscribed, isLoading: subsLoading } = useQuery({
    queryKey: ["my-subscriptions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_topics")
        .select("topic_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set(data.map((d) => d.topic_id));
    },
    enabled: !!user,
  });

  const subscribe = useMutation({
    mutationFn: async (topicId: number) => {
      const { error } = await supabase
        .from("user_topics")
        .insert({ user_id: user!.id, topic_id: topicId, priority: 0 });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-subscriptions"] });
      toast("Subscribed!", "success");
    },
    onError: (e) => toast(e.message, "error"),
  });

  const unsubscribe = useMutation({
    mutationFn: async (topicId: number) => {
      const { error } = await supabase
        .from("user_topics")
        .delete()
        .eq("user_id", user!.id)
        .eq("topic_id", topicId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-subscriptions"] });
      toast("Unsubscribed", "info");
    },
    onError: (e) => toast(e.message, "error"),
  });

  const isLoading = topicsLoading || subsLoading;

  return (
    <div>
      <PageHeader
        title="My Topics"
        description="Subscribe to topics to receive briefings"
      />

      {isLoading ? (
        <Spinner />
      ) : !topics?.length ? (
        <EmptyState message="No topics available" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => {
            const isSub = subscribed?.has(t.id) ?? false;
            return (
              <div key={t.id} className="card">
                <div className="mb-1 flex items-center gap-2">
                  {t.emoji && <span className="text-lg">{t.emoji}</span>}
                  <h3 className="text-sm font-medium text-zinc-200">
                    {t.name}
                  </h3>
                </div>

                <p className="mb-3 text-xs text-zinc-500">
                  {t.description ?? "No description"}
                </p>

                {t.keywords.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {t.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() =>
                    isSub
                      ? unsubscribe.mutate(t.id)
                      : subscribe.mutate(t.id)
                  }
                  disabled={subscribe.isPending || unsubscribe.isPending}
                  className={`w-full rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    isSub
                      ? "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      : "bg-blue-600 text-white hover:bg-blue-500"
                  }`}
                >
                  {isSub ? "Unsubscribe" : "Subscribe"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
