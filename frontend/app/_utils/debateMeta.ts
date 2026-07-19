import type { Metadata } from "next";
import serverApi from "@/app/axios.server";
import { truncate } from "@/app/_components/argument/verdictCard";
import { debateSlug } from "@/app/_utils/slugify";

// §11 SEO: shared metadata for a debate, canonicalised to /debate/<slug> so both
// the /argument/CRX-… and /debate/… routes consolidate onto one indexable URL.
// The OG image reuses the existing /argument OG generator.
export async function buildDebateMetadata(id: number): Promise<Metadata> {
  if (!Number.isInteger(id) || id <= 0) return {};
  try {
    const { data } = await serverApi.get(`/argument/${id}`);
    const row = data?.data;
    if (!row) return {};
    const claim = truncate(String(row.content), 70);
    const description =
      row.status === "concluded"
        ? `Verdict in. ${truncate(String(row.verdict_text ?? "The debate has settled."), 160)}`
        : "Live debate — the clock is running. Read both cases and pick a side.";
    const canonical = `/debate/${debateSlug(String(row.content), Number(row.id))}`;
    return {
      title: claim,
      description,
      alternates: { canonical },
      openGraph: {
        title: claim,
        description,
        url: canonical,
        images: [`/argument/CRX-${id}-A/opengraph-image`],
      },
      twitter: { card: "summary_large_image" },
    };
  } catch {
    return {};
  }
}
