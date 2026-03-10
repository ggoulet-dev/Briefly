import { useState } from "react";
import { useArticles } from "../lib/hooks";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { formatDistanceToNow } from "date-fns";
import { ArticleDetail } from "../components/ArticleDetail";

const STATUSES = ["all", "completed", "pending", "processing", "failed"] as const;

export function Articles() {
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: articles, isLoading } = useArticles(status, 100, 0, search || undefined);

  if (selectedId) {
    return <ArticleDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div>
      <PageHeader title="Articles" description="All fetched articles and their summaries" />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                status === s
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <Spinner />
      ) : !articles?.length ? (
        <EmptyState message="No articles found" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Published</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30 cursor-pointer"
                >
                  <td className="max-w-md px-4 py-3">
                    <p className="truncate font-medium text-zinc-200">{a.title}</p>
                    {a.summary && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {a.summary}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                    {(a.sources as unknown as { name: string })?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.summary_status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                    {a.published_at
                      ? formatDistanceToNow(new Date(a.published_at), { addSuffix: true })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
