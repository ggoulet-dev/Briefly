import { useArticle } from "../lib/hooks";
import { useSummarizeArticle, useFetchArticleContent } from "../lib/api";
import { StatusBadge } from "./StatusBadge";
import { ActionButton } from "./ActionButton";
import { Spinner } from "./Spinner";
import { useToast } from "./Toast";
import { formatDistanceToNow } from "date-fns";

export function ArticleDetail({
  id,
  onBack,
}: {
  id: number;
  onBack: () => void;
}) {
  const { data: article, isLoading } = useArticle(id);
  const summarize = useSummarizeArticle();
  const fetchContent = useFetchArticleContent();
  const { toast } = useToast();

  if (isLoading) return <Spinner />;
  if (!article) return null;

  const canSummarize =
    article.summary_status === "pending" || article.summary_status === "failed";

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        ← Back to articles
      </button>

      <div className="card max-w-3xl">
        <div className="mb-3 flex items-center gap-2">
          <StatusBadge status={article.summary_status} />
          <span className="text-xs text-zinc-500">
            {(article.sources as unknown as { name: string })?.name}
          </span>
          {article.author && (
            <>
              <span className="text-xs text-zinc-700">·</span>
              <span className="text-xs text-zinc-500">{article.author}</span>
            </>
          )}
        </div>

        <h1 className="text-lg font-semibold text-zinc-100">{article.title}</h1>

        <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
          <span>
            {article.published_at
              ? formatDistanceToNow(new Date(article.published_at), {
                  addSuffix: true,
                })
              : "Unknown date"}
          </span>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            Open original →
          </a>
        </div>

        {/* Admin actions */}
        <div className="mt-4 flex items-center gap-2">
          {canSummarize && (
            <ActionButton
              size="sm"
              onClick={() =>
                summarize.mutate(id, {
                  onSuccess: () => toast("Article summarized", "success"),
                  onError: (e) => toast(e.message, "error"),
                })
              }
              loading={summarize.isPending}
            >
              Summarize
            </ActionButton>
          )}
          {!article.content && (
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={() =>
                fetchContent.mutate(id, {
                  onSuccess: (d) =>
                    toast(
                      d.hasContent ? "Content fetched" : "No content extracted",
                      d.hasContent ? "success" : "error"
                    ),
                  onError: (e) => toast(e.message, "error"),
                })
              }
              loading={fetchContent.isPending}
            >
              Fetch Content
            </ActionButton>
          )}
        </div>

        {article.summary && (
          <div className="mt-5 rounded-lg border border-blue-500/10 bg-blue-500/5 p-4">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-blue-400/60">
              AI Summary
            </p>
            <p className="text-sm leading-relaxed text-zinc-300">
              {article.summary}
            </p>
          </div>
        )}

        {article.content && (
          <div className="mt-5">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-600">
              Full Content
            </p>
            <div className="max-h-96 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-sm leading-relaxed text-zinc-400">
              {article.content}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
