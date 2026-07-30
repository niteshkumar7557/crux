// The canonical, indexable URL for a debate. Same DebateView as /motion/[id] — the
// slug carries the claim for search engines and the trailing id does the lookup.

import DebateView from "@/app/_components/motion/DebateView";
import { buildDebateMetadata } from "@/app/_utils/debateMeta";
import { idFromSlug } from "@/app/_utils/slugify";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return buildDebateMetadata(idFromSlug(slug));
}

const page = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const id = idFromSlug(slug);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <DebateView id={id} />;
};

export default page;
