"use client";

// Share and certificate actions on a concluded debate.

import { useEffect, useRef, useState } from "react";
import { LuLink, LuCheck, LuDownload } from "react-icons/lu";

const ACTION =
  "flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.2em] text-ink-soft hover:text-ink transition-colors cursor-pointer";

const COPIED_MS = 2000;

// Read at click time, not at render: the theme toggle stamps <html data-theme>
// without this component hearing about it.
function certificateUrl(href: string): string {
  const dark =
    typeof document !== "undefined" &&
    document.documentElement.dataset.theme === "dark";
  return dark ? `${href}?theme=dark` : href;
}

const ShareVerdict = ({
  url,
  certificateHref,
}: {
  url: string;
  certificateHref?: string;
}) => {
  const [copied, setCopied] = useState(false);

  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  return (
    <span className="flex items-center gap-5">
      {certificateHref && (
        <a
          href={certificateHref}
          download
          aria-label="Download this verdict as a certificate image"
          className={ACTION}
          onClick={(e) => {
            // The plain href is the no-JS fallback and stays light. The route
            // sends Content-Disposition: attachment, so assigning location
            // downloads without navigating away.
            e.preventDefault();
            window.location.href = certificateUrl(certificateHref);
          }}
        >
          <LuDownload /> Certificate
        </a>
      )}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy a link to this verdict"
        className={ACTION}
      >
        {copied ? (
          <>
            <LuCheck className="text-laurel" /> Copied!
          </>
        ) : (
          <>
            <LuLink /> Link
          </>
        )}
      </button>
    </span>
  );
};

export default ShareVerdict;
