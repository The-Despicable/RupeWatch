import { NextRequest, NextResponse } from "next/server";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  sourceIcon: string;
  publishedAt: string;
  category: string;
}

const RSS_FEEDS = [
  {
    url: "https://economictimes.indiatimes.com/markets/rss.cms",
    source: "Economic Times",
    sourceIcon: "ET",
    category: "Markets",
  },
  {
    url: "https://www.business-standard.com/rss/markets-106.rss",
    source: "Business Standard",
    sourceIcon: "BS",
    category: "Markets",
  },
  {
    url: "https://www.moneycontrol.com/rss/latestnews.xml",
    source: "Moneycontrol",
    sourceIcon: "MC",
    category: "Finance",
  },
];

// ---------------------------------------------------------------------------
// Strategy 1 (PRIMARY): rss2json.com proxy
// Bypasses User-Agent/IP blocks on server-side fetch in dev + prod.
// Free tier: 1000 req/day, no API key needed.
// ---------------------------------------------------------------------------
async function fetchViaRss2Json(
  feed: (typeof RSS_FEEDS)[0]
): Promise<NewsItem[]> {
  const proxyUrl =
    `https://api.rss2json.com/v1/api.json` +
    `?rss_url=${encodeURIComponent(feed.url)}&count=10`;

  const res = await fetch(proxyUrl, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`rss2json HTTP ${res.status}`);

  const data = await res.json();
  if (data.status !== "ok" || !Array.isArray(data.items)) {
    throw new Error(`rss2json error: ${data.message ?? "unknown"}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.items.map((item: any): NewsItem => {
    const raw = (item.description ?? item.content ?? "") as string;
    const summary = raw
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .slice(0, 160)
      .trim();

    return {
      id: Buffer.from(`${item.link ?? ""}-${item.title ?? ""}`.slice(0, 50))
        .toString("base64")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 16) + "-" + (item.title ?? "").replace(/\s+/g, "-").slice(0, 10),
      title: (item.title ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"'),
      summary: summary || "Read the full article for details.",
      url: item.link ?? "#",
      source: feed.source,
      sourceIcon: feed.sourceIcon,
      publishedAt: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date().toISOString(),
      category: feed.category,
    };
  });
}

// ---------------------------------------------------------------------------
// Strategy 2 (FALLBACK): direct XML fetch
// ---------------------------------------------------------------------------
function extractTag(xml: string, tag: string): string {
  const cdata = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`,
    "i"
  ).exec(xml);
  if (cdata) return cdata[1].trim();

  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
  if (plain) return plain[1].trim();

  return "";
}

function parseRSS(xml: string, feed: (typeof RSS_FEEDS)[0]): NewsItem[] {
  const results: NewsItem[] = [];

  for (const block of xml.split(/<item[\s>]/i).slice(1)) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link") || extractTag(block, "guid");
    if (!title || !link) continue;

    const description =
      extractTag(block, "description") || extractTag(block, "summary");
    const pubDate =
      extractTag(block, "pubDate") || extractTag(block, "dc:date");

    const summary = description
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .slice(0, 160)
      .trim();

    results.push({
      id: Buffer.from(link).toString("base64").slice(0, 16),
      title: title.replace(/&amp;/g, "&").replace(/&quot;/g, '"'),
      summary: summary || "Read the full article for details.",
      url: link,
      source: feed.source,
      sourceIcon: feed.sourceIcon,
      publishedAt: pubDate
        ? new Date(pubDate).toISOString()
        : new Date().toISOString(),
      category: feed.category,
    });
  }

  return results;
}

async function fetchDirect(feed: (typeof RSS_FEEDS)[0]): Promise<NewsItem[]> {
  const res = await fetch(feed.url, {
    next: { revalidate: 300 },
    headers: { "User-Agent": "RupeWatch/1.0" },
  });
  if (!res.ok) throw new Error(`Direct fetch HTTP ${res.status}`);
  return parseRSS(await res.text(), feed);
}

// ---------------------------------------------------------------------------
// Strategy 3 (OPTIONAL UPGRADE): Finnhub
// Auto-activates when FINNHUB_API_KEY is set in .env.local
// ---------------------------------------------------------------------------
async function fetchFinnhub(): Promise<NewsItem[]> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${key}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await res.json()).slice(0, 20).map((item: any): NewsItem => ({
      id: String(item.id),
      title: item.headline ?? "",
      summary: (item.summary ?? "").slice(0, 160),
      url: item.url ?? "#",
      source: item.source ?? "Finnhub",
      sourceIcon: (item.source ?? "FH").slice(0, 2).toUpperCase(),
      publishedAt: new Date(item.datetime * 1000).toISOString(),
      category: item.category ?? "Finance",
    }));
  } catch {
    return [];
  }
}

function sortAndDedupe(items: NewsItem[]): NewsItem[] {
  return items
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .filter(
      (item, idx, arr) =>
        arr.findIndex(
          (x) =>
            x.title.slice(0, 40).toLowerCase() ===
            item.title.slice(0, 40).toLowerCase()
        ) === idx
    );
}

// ---------------------------------------------------------------------------
// GET /api/news?limit=12&category=Markets
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "12"), 30);
  const categoryFilter = searchParams.get("category") ?? "";

  // Finnhub takes priority if key is set
  const finnhubItems = await fetchFinnhub();
  if (finnhubItems.length > 0) {
    const filtered = categoryFilter
      ? finnhubItems.filter((i) =>
          i.category.toLowerCase().includes(categoryFilter.toLowerCase())
        )
      : finnhubItems;
    return NextResponse.json(filtered.slice(0, limit), {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
    });
  }

  // Try rss2json proxy first, fall back to direct per-feed
  const feedResults = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        return await fetchViaRss2Json(feed);
      } catch (proxyErr) {
        console.warn(
          `[news] rss2json failed for ${feed.source}, trying direct:`,
          proxyErr
        );
        return await fetchDirect(feed);
      }
    })
  );

  const allItems: NewsItem[] = [];
  for (const result of feedResults) {
    if (result.status === "fulfilled") allItems.push(...result.value);
    else console.error("[news] Feed completely failed:", result.reason);
  }

  const sorted = sortAndDedupe(allItems);
  const filtered = categoryFilter
    ? sorted.filter((i) =>
        i.category.toLowerCase().includes(categoryFilter.toLowerCase())
      )
    : sorted;

  return NextResponse.json(filtered.slice(0, limit), {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
  });
}
