import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

interface FeedArticle {
  id: number;
  title: string;
  url: string;
  summary: string | null;
  published_at: string | null;
  created_at: string;
  source_id: number;
  sources: { name: string } | null;
}

interface FeedSection {
  topicName: string;
  topicEmoji: string | null;
  articles: FeedArticle[];
}

interface HomeFeed {
  sections: FeedSection[];
  favoritesSection: FeedSection | null;
  stats: {
    subscribedTopics: number;
    favoritedSources: number;
    totalArticles: number;
    latestBriefingDate: string | null;
  };
}

function useHomeFeed(userId: number | undefined) {
  return useQuery({
    queryKey: ["home-feed", userId],
    queryFn: async (): Promise<HomeFeed> => {
      // 1. Get subscribed topics
      const { data: userTopics } = await supabase
        .from("user_topics")
        .select("topic_id, topics(id, name, slug, emoji)")
        .eq("user_id", userId!);

      const topicMap = new Map<number, { name: string; slug: string; emoji: string | null }>();
      for (const ut of userTopics ?? []) {
        const t = ut.topics as unknown as { id: number; name: string; slug: string; emoji: string | null };
        if (t) topicMap.set(t.id, t);
      }

      // 2. Get source IDs linked to subscribed topics
      const topicIds = Array.from(topicMap.keys());
      let topicSourceIds = new Set<number>();
      const sourceToTopics = new Map<number, number[]>();

      if (topicIds.length > 0) {
        const { data: st } = await supabase
          .from("source_topics")
          .select("source_id, topic_id")
          .in("topic_id", topicIds);

        for (const row of st ?? []) {
          topicSourceIds.add(row.source_id);
          const existing = sourceToTopics.get(row.source_id) ?? [];
          existing.push(row.topic_id);
          sourceToTopics.set(row.source_id, existing);
        }
      }

      // 3. Get favorited source IDs
      const { data: userSources } = await supabase
        .from("user_sources")
        .select("source_id")
        .eq("user_id", userId!);

      const favSourceIds = new Set((userSources ?? []).map((us) => us.source_id));

      // 4. Union source IDs
      const allSourceIds = new Set([...topicSourceIds, ...favSourceIds]);

      // 5. Get latest briefing
      const { data: latestBriefing } = await supabase
        .from("briefings")
        .select("briefing_date")
        .eq("user_id", userId!)
        .order("briefing_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (allSourceIds.size === 0) {
        return {
          sections: [],
          favoritesSection: null,
          stats: {
            subscribedTopics: topicIds.length,
            favoritedSources: favSourceIds.size,
            totalArticles: 0,
            latestBriefingDate: latestBriefing?.briefing_date ?? null,
          },
        };
      }

      // 6. Fetch recent articles
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: articles } = await supabase
        .from("articles")
        .select("id, title, url, summary, published_at, created_at, source_id, sources(name)")
        .eq("summary_status", "completed")
        .gte("created_at", cutoff)
        .in("source_id", Array.from(allSourceIds))
        .order("created_at", { ascending: false })
        .limit(100);

      const arts = (articles ?? []) as unknown as FeedArticle[];

      // 7. Group by topic
      const sectionMap = new Map<number, FeedArticle[]>();
      const usedArticleIds = new Set<number>();
      const favOnlyArticles: FeedArticle[] = [];

      for (const a of arts) {
        const topicIdsForSource = sourceToTopics.get(a.source_id);
        if (topicIdsForSource) {
          for (const tid of topicIdsForSource) {
            const list = sectionMap.get(tid) ?? [];
            list.push(a);
            sectionMap.set(tid, list);
            usedArticleIds.add(a.id);
          }
        }
      }

      for (const a of arts) {
        if (favSourceIds.has(a.source_id) && !usedArticleIds.has(a.id)) {
          favOnlyArticles.push(a);
        }
      }

      const sections: FeedSection[] = [];
      for (const [tid, topicArts] of sectionMap) {
        const topic = topicMap.get(tid);
        if (!topic) continue;
        sections.push({
          topicName: topic.name,
          topicEmoji: topic.emoji,
          articles: topicArts.slice(0, 10),
        });
      }

      return {
        sections,
        favoritesSection: favOnlyArticles.length > 0
          ? { topicName: "Favorites", topicEmoji: "★", articles: favOnlyArticles.slice(0, 10) }
          : null,
        stats: {
          subscribedTopics: topicIds.length,
          favoritedSources: favSourceIds.size,
          totalArticles: arts.length,
          latestBriefingDate: latestBriefing?.briefing_date ?? null,
        },
      };
    },
    enabled: !!userId,
  });
}

export function Home() {
  const { user } = useAuth();
  const { data: feed, isLoading } = useHomeFeed(user?.id);

  if (isLoading) return <Spinner />;

  const greeting = `${getGreeting()}, ${user?.name ?? "there"}`;
  const stats = feed?.stats;
  const hasFeed = (feed?.sections.length ?? 0) > 0 || feed?.favoritesSection;

  return (
    <div>
      <PageHeader title={greeting} description="Your personalized news feed" />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Subscribed Topics"
          value={stats?.subscribedTopics ?? 0}
          accent="blue"
        />
        <StatCard
          label="Favorited Sources"
          value={stats?.favoritedSources ?? 0}
          accent="yellow"
        />
        <StatCard
          label="Articles Today"
          value={stats?.totalArticles ?? 0}
          accent="green"
        />
        <StatCard
          label="Latest Briefing"
          value={stats?.latestBriefingDate ?? "None yet"}
          accent="blue"
        />
      </div>

      {!hasFeed ? (
        <EmptyState message="Subscribe to topics or favorite sources to see your personalized feed." />
      ) : (
        <div className="space-y-8">
          {feed!.sections.map((section) => (
            <FeedSectionBlock key={section.topicName} section={section} />
          ))}
          {feed!.favoritesSection && (
            <FeedSectionBlock section={feed!.favoritesSection} />
          )}
        </div>
      )}
    </div>
  );
}

function FeedSectionBlock({ section }: { section: FeedSection }) {
  const [expanded, setExpanded] = useState(false);
  const COLLAPSED_COUNT = 5;
  const hasMore = section.articles.length > COLLAPSED_COUNT;
  const visible = expanded ? section.articles : section.articles.slice(0, COLLAPSED_COUNT);

  // Group articles by date for dividers
  let lastDateLabel = "";

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
        {section.topicEmoji && <span className="text-base">{section.topicEmoji}</span>}
        {section.topicName}
        <span className="text-xs text-zinc-600">({section.articles.length})</span>
      </h2>
      <div className="space-y-3">
        {visible.map((a) => {
          const dateStr = a.published_at ?? a.created_at;
          const dateLabel = getDateLabel(dateStr);
          const showDivider = dateLabel !== lastDateLabel;
          lastDateLabel = dateLabel;

          return (
            <div key={a.id}>
              {showDivider && (
                <div className="flex items-center gap-3 pt-2 pb-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
                    {dateLabel}
                  </span>
                  <div className="h-px flex-1 bg-zinc-800/60" />
                </div>
              )}
              <div className="flex items-start gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3">
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
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-3">
                      {a.summary}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-600">
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-400">
                      {(a.sources as unknown as { name: string })?.name}
                    </span>
                    <span>&middot;</span>
                    <span>
                      {a.published_at
                        ? formatDistanceToNow(new Date(a.published_at), { addSuffix: true })
                        : formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          {expanded
            ? "Show less"
            : `Show ${section.articles.length - COLLAPSED_COUNT} more`}
        </button>
      )}
    </div>
  );
}
