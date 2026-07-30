// Every debate, at its canonical /debate/[slug] URL.
//
// <lastmod> is the only hint here Google still acts on — it schedules recrawls by
// it. changeFrequency and priority are ignored, and stay only because they cost
// nothing. A concluded debate is frozen at closes_at; a live one is genuinely
// changing as arguments land, so it reports now and keeps earning recrawls.

import type { MetadataRoute } from "next";
import serverApi from "@/app/axios.server";
import { debateSlug } from "@/app/_utils/slugify";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Without this Next prerenders the sitemap at build time — the axios call is not a
// tracked fetch, so nothing tells it the data moves — and every debate created
// after a deploy stays out of the file until the next rebuild. An hour is well
// inside how often Google refetches it.
export const revalidate = 3600;

interface SitemapRow {
  id: number;
  content: string;
  content_keyword: string;
  status?: string;
  created_at?: string;
  closes_at?: string;
}

/** A usable Date, or undefined — never an Invalid Date, which serialises to null. */
function asDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? undefined : new Date(ms);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/arena`, changeFrequency: "hourly", priority: 0.9 },
    // The bare path, not ?q=all — submitting a parameterised URL when an
    // equivalent clean one renders the same page just splits the signal.
    { url: `${SITE}/domain`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/archive`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE}/leaderboard`, changeFrequency: "daily", priority: 0.5 },
    { url: `${SITE}/rules`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];

  let rows: SitemapRow[] = [];
  try {
    const { data } = await serverApi.get("/arena/sitemap");
    if (Array.isArray(data)) rows = data;
  } catch (error) {
    console.error("Failed to build sitemap:", error);
  }

  const debates: MetadataRoute.Sitemap = rows.map((r) => ({
    url: `${SITE}/debate/${debateSlug(String(r.content), Number(r.id))}`,
    lastModified:
      r.status === "concluded"
        ? (asDate(r.closes_at) ?? asDate(r.created_at) ?? now)
        : now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  // Every keyword here belongs to a motion that exists, so no topic hub listed
  // can be empty. A direct hit on a keyword with nothing left is handled by the
  // page's own noindex, not here.
  const topics: MetadataRoute.Sitemap = Array.from(
    new Set(rows.map((r) => r.content_keyword).filter(Boolean)),
  ).map((kw) => ({
    url: `${SITE}/topic/${encodeURIComponent(String(kw))}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [...staticUrls, ...debates, ...topics];
}
