import { useTopics } from "../lib/hooks";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";

export function Topics() {
  const { data: topics, isLoading } = useTopics();

  return (
    <div>
      <PageHeader title="Topics" description="Content categories for organizing articles" />

      {isLoading ? (
        <Spinner />
      ) : !topics?.length ? (
        <EmptyState message="No topics created" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => (
            <div key={t.id} className="card">
              <div className="mb-1 flex items-center gap-2">
                {t.emoji && <span className="text-lg">{t.emoji}</span>}
                <h3 className="text-sm font-medium text-zinc-200">{t.name}</h3>
              </div>

              <p className="mb-3 text-xs text-zinc-500">
                {t.description ?? "No description"}
              </p>

              {t.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
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

              <div className="mt-3 border-t border-zinc-800/50 pt-2">
                <span className="font-mono text-[11px] text-zinc-600">
                  /{t.slug}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
