import { useState } from "react";
import { useBriefings, useBriefingDetail } from "../lib/hooks";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";

export function MyBriefings() {
  const { data: briefings, isLoading } = useBriefings();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (selectedId) {
    return (
      <MyBriefingReader id={selectedId} onBack={() => setSelectedId(null)} />
    );
  }

  return (
    <div>
      <PageHeader
        title="My Briefings"
        description="Your compiled daily briefings"
      />

      {isLoading ? (
        <Spinner />
      ) : !briefings?.length ? (
        <EmptyState message="No briefings yet. Subscribe to topics to start receiving briefings." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Articles</th>
              </tr>
            </thead>
            <tbody>
              {briefings.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className="border-b border-zinc-800/50 cursor-pointer transition-colors hover:bg-zinc-800/30"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-200">
                    {b.briefing_date}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-400">
                    {b.article_count}
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

function MyBriefingReader({
  id,
  onBack,
}: {
  id: number;
  onBack: () => void;
}) {
  const { data: briefing, isLoading } = useBriefingDetail(id);

  if (isLoading) return <Spinner />;
  if (!briefing) return null;

  const sections = new Map<
    string,
    { slug: string; articles: typeof briefing.briefing_articles }
  >();
  for (const ba of briefing.briefing_articles ?? []) {
    const existing = sections.get(ba.topic_slug);
    if (existing) {
      existing.articles.push(ba);
    } else {
      sections.set(ba.topic_slug, { slug: ba.topic_slug, articles: [ba] });
    }
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        &larr; Back to briefings
      </button>

      <div className="max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-zinc-100">
            {briefing.briefing_date}
          </h1>
          <StatusBadge status={briefing.status} />
        </div>

        {Array.from(sections.values()).map(({ slug, articles }) => (
          <div key={slug} className="mb-6">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
              {slug}
            </h2>
            <div className="space-y-3">
              {articles
                .sort((a, b) => a.position - b.position)
                .map((ba) => {
                  const art = ba.articles as unknown as {
                    id: number;
                    title: string;
                    url: string;
                    summary: string | null;
                    author: string | null;
                    sources: { name: string } | null;
                  };
                  return (
                    <div
                      key={art.id}
                      className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4"
                    >
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-zinc-200 hover:text-blue-400 transition-colors"
                      >
                        {art.title}
                      </a>
                      {art.summary && (
                        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                          {art.summary}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-600">
                        {art.sources && <span>{art.sources.name}</span>}
                        {art.author && (
                          <>
                            <span>&middot;</span>
                            <span>{art.author}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
