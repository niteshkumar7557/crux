"use client";

import { useEffect, useRef, useState } from "react";
import { LuLink, LuCheck, LuDownload } from "react-icons/lu";

const ACTION =
  "flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.2em] text-outline hover:text-on-surface transition-colors cursor-pointer";

/** How long the button stays on "Copied!" before returning to "Link". */
const COPIED_MS = 2000;

/**
 * Two ways to take a verdict with you. The certificate is the artefact — a
 * dated PNG naming the winner, the MVP and the author — and the link is for
 * sending somebody to the argument itself. `certificateHref` is omitted while
 * a debate is live, since there is nothing to certify yet.
 *
 * The link is a plain copy on every device. The native share sheet used to
 * pre-empt it on mobile, which meant the same button did two different things
 * depending on the browser and gave no feedback when it opened a sheet.
 */
const ShareVerdict = ({
  url,
  certificateHref,
}: {
  url: string;
  certificateHref?: string;
}) => {
  const [copied, setCopied] = useState(false);

  // Timer id lives across renders so a second click restarts the window
  // instead of letting the first timeout cut the second one short.
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
      // Denied permission, or an insecure origin — say nothing rather than
      // claim a copy that did not happen.
      return;
    }
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
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
        onClick={handleCopy}
        aria-label="Copy a link to this verdict"
        className={ACTION}
      >
        {copied ? (
          <>
            <LuCheck className="text-tertiary" /> Copied!
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
