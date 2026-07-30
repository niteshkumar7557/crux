// Every debate, at its canonical /debate/[slug] URL.

import type { MetadataRoute } from "next";
import serverApi from "@/app/axios.server";
import { debateSlug } from "@/app/_utils/slugify";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/arena`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE}/domain?q=all`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/archive`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE}/leaderboard`, changeFrequency: "daily", priority: 0.5 },
  ];

  let rows: { id: number; content: string; content_keyword: string }[] = [];
  try {
    const { data } = await serverApi.get("/arena/sitemap");
    if (Array.isArray(data)) rows = data;
  } catch (error) {
    console.error("Failed to build sitemap:", error);
  }

  const debates: MetadataRoute.Sitemap = rows.map((r) => ({
    url: `${SITE}/debate/${debateSlug(String(r.content), Number(r.id))}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const topics: MetadataRoute.Sitemap = Array.from(
    new Set(rows.map((r) => r.content_keyword).filter(Boolean)),
  ).map((kw) => ({
    url: `${SITE}/topic/${encodeURIComponent(String(kw))}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [...staticUrls, ...debates, ...topics];
}
