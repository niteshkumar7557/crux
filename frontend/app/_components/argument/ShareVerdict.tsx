"use client";

import { useState } from "react";
import { LuShare2, LuCheck } from "react-icons/lu";

const ShareVerdict = ({ url, title }: { url: string; title: string }) => {
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
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share this verdict"
      className="flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.2em] text-outline hover:text-on-surface transition-colors cursor-pointer"
    >
      {copied ? (
        <>
          <LuCheck className="text-tertiary" /> Link copied
        </>
      ) : (
        <>
          <LuShare2 /> Share
        </>
      )}
    </button>
  );
};

export default ShareVerdict;
