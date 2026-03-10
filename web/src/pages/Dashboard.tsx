import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useStats, useArticleTimeline, useArticles } from "../lib/hooks";
import { useFetchAndSummarize, usePostToDiscord } from "../lib/api";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { ActionButton } from "../components/ActionButton";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { useToast } from "../components/Toast";
import { formatDistanceToNow } from "date-fns";

export function Dashboard() {
  const stats = useStats();
  const timeline = useArticleTimeline();
  const recentArticles = useArticles("completed", 8);
  const fetchAndSummarize = useFetchAndSummarize();
  const postDiscord = usePostToDiscord();
  const { toast } = useToast();

  if (stats.isLoading) return <Spinner />;

  const s = stats.data!;

  return (
    <div>
      <PageHeader title="Dashboard" description="Admin overview of your news pipeline">
        <ActionButton
          onClick={() =>
            fetchAndSummarize.mutate(undefined, {
              onSuccess: (d) =>
                toast(
                  `Fetched ${d.fetched} articles, summarized ${d.summarized}`,
                  "success"
                ),
              onError: (e) => toast(e.message, "error"),
            })
          }
          loading={fetchAndSummarize.isPending}
        >
          Fetch & Summarize
        </ActionButton>
        <ActionButton
          variant="secondary"
          onClick={() =>
            postDiscord.mutate(undefined, {
              onSuccess: (d) =>
                toast(`Posted ${d.posted} articles to Discord`, "success"),
              onError: (e) => toast(e.message, "error"),
            })
          }
          loading={postDiscord.isPending}
        >
          Post to Discord
        </ActionButton>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Articles"
          value={s.totalArticles}
          sub={`${s.completedArticles} summarized`}
          accent="blue"
        />
        <StatCard
          label="Pending"
          value={s.pendingArticles}
          sub={s.failedArticles > 0 ? `${s.failedArticles} failed` : undefined}
          accent={s.pendingArticles > 0 ? "yellow" : "green"}
        />
        <StatCard
          label="Sources"
          value={s.activeSources}
          sub={`${s.totalSources} total`}
          accent="green"
        />
        <StatCard
          label="Briefings"
          value={s.sentBriefings}
          sub={`${s.totalBriefings} total`}
          accent="blue"
        />
      </div>

      {/* Chart */}
      <div className="card mt-6">
        <h2 className="mb-4 text-sm font-medium text-zinc-400">
          Articles — Last 7 Days
        </h2>
        {timeline.isLoading ? (
          <Spinner />
        ) : !timeline.data?.length ? (
          <p className="py-8 text-center text-sm text-zinc-600">
            No articles in the last 7 days
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={timeline.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#71717a", fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#a1a1aa" }}
              />
              <Bar
                dataKey="articles"
                name="Fetched"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="summarized"
                name="Summarized"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent articles */}
      <div className="card mt-6">
        <h2 className="mb-4 text-sm font-medium text-zinc-400">
          Recent Summaries
        </h2>
        {recentArticles.isLoading ? (
          <Spinner />
        ) : (
          <div className="space-y-3">
            {recentArticles.data?.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-zinc-200 hover:text-blue-400 transition-colors"
                  >
                    {a.title}
                  </a>
                  {a.summary && (
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                      {a.summary}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-600">
                    <span>
                      {(a.sources as unknown as { name: string })?.name}
                    </span>
                    <span>·</span>
                    <span>
                      {a.published_at
                        ? formatDistanceToNow(new Date(a.published_at), {
                            addSuffix: true,
                          })
                        : "Unknown date"}
                    </span>
                  </div>
                </div>
                <StatusBadge status={a.summary_status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
