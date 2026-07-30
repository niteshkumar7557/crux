// A debate by id. Renders the shared DebateView; /debate/[slug] is the canonical alias.

import DebateView from "@/app/_components/motion/DebateView";
import { buildDebateMetadata } from "@/app/_utils/debateMeta";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: rawId } = await params;
  return buildDebateMetadata(Number(rawId.split("-")[1]));
}

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id: rawId } = await params;
  const id = Number(rawId.split("-")[1]);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <DebateView id={id} />;
};

export default page;
