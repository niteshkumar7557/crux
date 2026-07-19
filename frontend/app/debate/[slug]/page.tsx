import DebateView from "@/app/_components/argument/DebateView";
import { buildDebateMetadata } from "@/app/_utils/debateMeta";
import { idFromSlug } from "@/app/_utils/slugify";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// §11: the canonical, claim-slugged debate URL. The trailing "-<id>" is the key.
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
