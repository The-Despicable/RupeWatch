"use client";

import { useEffect, useState } from "react";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  sourceIcon: string;
  publishedAt: string;
  category: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse flex gap-4 p-4 rounded-2xl bg-surface-container-high">
      <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-surface-container-lowest rounded w-3/4" />
        <div className="h-3 bg-surface-container-lowest rounded w-full" />
        <div className="h-3 bg-surface-container-lowest rounded w-1/2" />
      </div>
    </div>
  );
}

interface NewsSectionProps {
  /** Max articles to show */
  limit?: number;
  /** Optional category filter passed to /api/news */
  category?: string;
  /** Show compact single-column list instead of grid */
  compact?: boolean;
  /** Section title */
  title?: string;
}

export default function NewsSection({
  limit = 6,
  category,
  compact = false,
  title = "Market News",
}: NewsSectionProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadNews() {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (category) params.set("category", category);
      const res = await fetch(`/api/news?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setNews(data);
      setLastUpdated(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
    // Refresh every 5 minutes
    const interval = setInterval(loadNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [limit, category]);

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold font-headline text-on-surface">
            {title}
          </h3>
          {lastUpdated && (
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              Updated {timeAgo(lastUpdated.toISOString())}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadNews}
            disabled={loading}
            className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <span
              className={`material-symbols-outlined text-lg ${loading ? "animate-spin" : ""}`}
            >
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-sm mb-4">
          <span className="material-symbols-outlined text-lg">wifi_off</span>
          <span>Could not load news. RSS feeds may be temporarily unavailable.</span>
          <button
            onClick={loadNews}
            className="ml-auto font-bold underline text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className={compact ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
          {Array.from({ length: compact ? 4 : 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* News grid / list */}
      {!loading && !error && (
        <div
          className={
            compact
              ? "space-y-2"
              : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          }
        >
          {news.length === 0 && (
            <p className="text-on-surface-variant text-sm col-span-3">
              No news available right now. Check back shortly.
            </p>
          )}

          {news.map((item) => (
            <a
              key={item.url}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex gap-4 p-4 rounded-2xl bg-surface-container-high border border-outline-variant/5 hover:border-primary-container/30 hover:bg-surface-container-highest transition-all duration-200 ${
                compact ? "items-center" : "flex-col"
              }`}
            >
              {/* Source badge + meta */}
              <div className={`flex items-center gap-3 ${compact ? "flex-shrink-0" : ""}`}>
                <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary-container font-black text-xs flex-shrink-0">
                  {item.sourceIcon}
                </div>
                {compact && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface line-clamp-2 group-hover:text-primary-container transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-on-surface-variant">
                        {item.source}
                      </span>
                      <span className="text-[10px] text-on-surface-variant/50">•</span>
                      <span className="text-[10px] text-on-surface-variant">
                        {timeAgo(item.publishedAt)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card layout (non-compact) */}
              {!compact && (
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-primary-container bg-primary-container/10 px-2 py-0.5 rounded-full">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">
                      {item.source}
                    </span>
                    <span className="text-[10px] text-on-surface-variant/50 ml-auto">
                      {timeAgo(item.publishedAt)}
                    </span>
                  </div>
                  <h4 className="font-bold text-on-surface text-sm leading-snug line-clamp-2 group-hover:text-primary-container transition-colors mb-2">
                    {item.title}
                  </h4>
                  {item.summary && (
                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-1 text-primary-container text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    Read more
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </div>
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
