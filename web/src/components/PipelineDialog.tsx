import { useState, useEffect } from "react";
import { useSources, useStats } from "../lib/hooks";
import { useRunPipeline, type PipelineResult } from "../lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PipelineDialog({ open, onClose }: Props) {
  const sources = useSources();
  const stats = useStats();
  const pipeline = useRunPipeline();

  // Options state
  const [selectedSources, setSelectedSources] = useState<number[]>([]);
  const [summarize, setSummarize] = useState(true);
  const [includeFailed, setIncludeFailed] = useState(false);
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [limit, setLimit] = useState(20);

  // Result state
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setResult(null);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const allSources = sources.data ?? [];
  const allSelected = selectedSources.length === 0;
  const failedCount = stats.data?.failedArticles ?? 0;
  const pendingCount = stats.data?.pendingArticles ?? 0;

  function toggleSource(id: number) {
    setSelectedSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedSources([]);
  }

  async function run() {
    setResult(null);
    setError(null);
    try {
      const res = await pipeline.mutateAsync({
        sourceIds: selectedSources.length > 0 ? selectedSources : undefined,
        summarize,
        includeFailed,
        summarizeLimit: limitEnabled ? limit : undefined,
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Pipeline failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!pipeline.isPending ? onClose : undefined}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Run Pipeline
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Fetch articles and summarize them
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={pipeline.isPending}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-5">
          {/* Source picker */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-sm font-medium text-zinc-300">
                Sources
              </label>
              <button
                onClick={selectAll}
                className={`text-xs transition-colors ${
                  allSelected
                    ? "text-blue-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                All sources
              </button>
            </div>
            <div className="space-y-1">
              {allSources.map((s) => {
                const checked = allSelected || selectedSources.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                      checked
                        ? "border-blue-500/40 bg-blue-500/5"
                        : "border-zinc-800 bg-zinc-800/30 hover:border-zinc-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSource(s.id)}
                      className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500/30 focus:ring-offset-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-zinc-200">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                      {s.fetch_failures > 0 && (
                        <span className="text-amber-500">
                          {s.fetch_failures} failures
                        </span>
                      )}
                      {!s.active && (
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-500">
                          inactive
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Summarize options */}
          <section className="space-y-3">
            <label className="text-sm font-medium text-zinc-300">
              Summarization
            </label>

            {/* Toggle summarize */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={summarize}
                onChange={(e) => setSummarize(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500/30 focus:ring-offset-0"
              />
              <div>
                <span className="text-sm text-zinc-200">
                  Summarize after fetching
                </span>
                {pendingCount > 0 && (
                  <span className="ml-2 text-xs text-zinc-500">
                    {pendingCount} pending
                  </span>
                )}
              </div>
            </label>

            {/* Retry failed */}
            {summarize && (
              <label className="flex items-center gap-3 cursor-pointer ml-6">
                <input
                  type="checkbox"
                  checked={includeFailed}
                  onChange={(e) => setIncludeFailed(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500/30 focus:ring-offset-0"
                />
                <div>
                  <span className="text-sm text-zinc-200">
                    Retry failed articles
                  </span>
                  {failedCount > 0 && (
                    <span className="ml-2 text-xs text-amber-500">
                      {failedCount} failed
                    </span>
                  )}
                </div>
              </label>
            )}

            {/* Limit */}
            {summarize && (
              <div className="ml-6 flex items-center gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={limitEnabled}
                    onChange={(e) => setLimitEnabled(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500/30 focus:ring-offset-0"
                  />
                  <span className="text-sm text-zinc-200">Limit to</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  disabled={!limitEnabled}
                  className="w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-sm text-zinc-200 disabled:opacity-40 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                />
                <span className="text-sm text-zinc-400">articles</span>
              </div>
            )}
          </section>

          {/* Results panel */}
          {(result || error) && (
            <section className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
              <h3 className="text-sm font-medium text-zinc-300">Results</h3>

              {error && (
                <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}

              {result && (
                <>
                  {/* Fetch results per source */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Fetch
                    </span>
                    {result.fetch.sources.map((s) => (
                      <div
                        key={s.sourceId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-zinc-300">{s.sourceName}</span>
                        <div className="flex items-center gap-3 text-xs">
                          {s.error ? (
                            <span className="text-red-400">Error</span>
                          ) : (
                            <>
                              <span className="text-emerald-400">
                                +{s.newArticles} new
                              </span>
                              {s.skipped > 0 && (
                                <span className="text-zinc-600">
                                  {s.skipped} skipped
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-zinc-800 pt-1.5 text-sm font-medium">
                      <span className="text-zinc-400">Total</span>
                      <span className="text-zinc-200">
                        {result.fetch.totalNew} new articles
                      </span>
                    </div>
                  </div>

                  {/* Summarize results */}
                  {result.summarize && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Summarization
                      </span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-emerald-400">
                          {result.summarize.processed} summarized
                        </span>
                        {result.summarize.failed > 0 && (
                          <span className="text-red-400">
                            {result.summarize.failed} failed
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-3">
          <button
            onClick={onClose}
            disabled={pipeline.isPending}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button
              onClick={run}
              disabled={pipeline.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pipeline.isPending && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {pipeline.isPending
                ? summarize
                  ? "Fetching & Summarizing..."
                  : "Fetching..."
                : "Run"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
