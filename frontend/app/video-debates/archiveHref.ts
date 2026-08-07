// The archive's only query parameter is the page, and page one stays out of it so
// /video-debates is always the canonical path.

export const VIDEO_DEBATE_ARCHIVE = "/video-debates";

export function videoDebateArchiveHref(page = 1): string {
  return page > 1 ? `${VIDEO_DEBATE_ARCHIVE}?page=${page}` : VIDEO_DEBATE_ARCHIVE;
}

export function parseArchivePage(raw: string | undefined): number {
  if (raw === undefined || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}
