"use client";

import { useState } from "react";
import { LuShare2, LuCheck, LuDownload } from "react-icons/lu";

const ACTION =
  "flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.2em] text-outline hover:text-on-surface transition-colors cursor-pointer";

/**
 * Two ways to take a verdict with you. The certificate is the artefact — a
 * dated PNG naming the winner, the MVP and the author — and the link is for
 * sending somebody to the argument itself. `certificateHref` is omitted while
 * a debate is live, since there is nothing to certify yet.
 */
const ShareVerdict = ({
  url,
  title,
  certificateHref,
}: {
  url: string;
  title: string;
  certificateHref?: string;
}) => {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user dismissed the native sheet (AbortError) — no-op
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <span className="flex items-center gap-5">
      {certificateHref && (
        // A plain anchor, not a fetch + blob: the route already answers with
        // Content-Disposition: attachment, so the browser does the saving and
        // the link still works on a middle-click or a right-click "save as".
        <a
          href={certificateHref}
          download
          aria-label="Download this verdict as a certificate image"
          className={ACTION}
        >
          <LuDownload /> Certificate
        </a>
      )}
      <button
        type="button"
        onClick={handleShare}
        aria-label="Share this verdict"
        className={ACTION}
      >
        {copied ? (
          <>
            <LuCheck className="text-tertiary" /> Link copied
          </>
        ) : (
          <>
            <LuShare2 /> Link
          </>
        )}
      </button>
    </span>
  );
};

export default ShareVerdict;
