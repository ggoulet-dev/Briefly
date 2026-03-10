import { useSources } from "../lib/hooks";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { formatDistanceToNow } from "date-fns";

export function Sources() {
  const { data: sources, isLoading } = useSources();

  return (
    <div>
      <PageHeader title="Sources" description="RSS feed sources powering your pipeline" />

      {isLoading ? (
        <Spinner />
      ) : !sources?.length ? (
        <EmptyState message="No sources configured" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((s) => (
            <div key={s.id} className="card flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-200">{s.name}</h3>
                <span
                  className={`badge ${s.active ? "badge-green" : "badge-red"}`}
                >
                  {s.active ? "Active" : "Inactive"}
                </span>
              </div>

              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 truncate text-xs text-blue-400/70 hover:text-blue-400"
              >
                {s.url}
              </a>

              <div className="mt-auto space-y-1.5 border-t border-zinc-800/50 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Last fetched</span>
                  <span className="text-zinc-400">
                    {s.last_fetched_at
                      ? formatDistanceToNow(new Date(s.last_fetched_at), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Failures</span>
                  <span
                    className={
                      s.fetch_failures > 0 ? "text-red-400" : "text-zinc-400"
                    }
                  >
                    {s.fetch_failures}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
