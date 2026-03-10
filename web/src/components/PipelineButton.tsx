import { useState, useRef, useEffect } from "react";
import { useFetchAllSources, useSummarizeAll } from "../lib/api";
import { useToast } from "./Toast";

type PipelineAction = "fetch-and-summarize" | "fetch-only" | "summarize-only";

const actions: { key: PipelineAction; label: string; description: string }[] = [
  {
    key: "fetch-and-summarize",
    label: "Fetch & Summarize",
    description: "Fetch new articles then summarize them",
  },
  {
    key: "fetch-only",
    label: "Fetch Only",
    description: "Fetch new articles from all sources",
  },
  {
    key: "summarize-only",
    label: "Summarize Pending",
    description: "Summarize articles waiting in queue",
  },
];

export function PipelineButton() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fetchAll = useFetchAllSources();
  const summarizeAll = useSummarizeAll();
  const { toast } = useToast();

  const isRunning = fetchAll.isPending || summarizeAll.isPending;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function run(action: PipelineAction) {
    setOpen(false);

    try {
      if (action === "fetch-only" || action === "fetch-and-summarize") {
        setStep("Fetching feeds…");
        const fetchResult = await fetchAll.mutateAsync();

        if (action === "fetch-only") {
          setStep(null);
          toast(
            `Fetched ${fetchResult.newArticles} new articles from ${fetchResult.sources} sources` +
              (fetchResult.errors > 0 ? ` (${fetchResult.errors} errors)` : ""),
            fetchResult.errors > 0 ? "error" : "success"
          );
          return;
        }

        // fetch-and-summarize: show intermediate result, then summarize
        if (fetchResult.newArticles > 0) {
          toast(`Fetched ${fetchResult.newArticles} new articles`, "success");
        }

        setStep(
          fetchResult.newArticles > 0
            ? `Summarizing ${fetchResult.newArticles} articles…`
            : "Summarizing pending articles…"
        );
      } else {
        setStep("Summarizing pending articles…");
      }

      const sumResult = await summarizeAll.mutateAsync();
      setStep(null);
      toast(
        `Summarized ${sumResult.processed} articles` +
          (sumResult.failed > 0 ? `, ${sumResult.failed} failed` : ""),
        sumResult.failed > 0 ? "error" : "success"
      );
    } catch (err: unknown) {
      setStep(null);
      toast(err instanceof Error ? err.message : "Pipeline failed", "error");
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex">
        {/* Main button */}
        <button
          onClick={() => run("fetch-and-summarize")}
          disabled={isRunning}
          className="inline-flex items-center gap-1.5 rounded-l-lg bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white transition-all hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {step ?? "Fetch & Summarize"}
        </button>

        {/* Dropdown toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={isRunning}
          className="inline-flex items-center rounded-r-lg border-l border-blue-700 bg-blue-600 px-2 py-1.5 text-sm text-white transition-all hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-64 rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl">
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={() => run(a.key)}
              className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-zinc-700"
            >
              <span className="text-sm font-medium text-zinc-200">{a.label}</span>
              <span className="text-xs text-zinc-500">{a.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
