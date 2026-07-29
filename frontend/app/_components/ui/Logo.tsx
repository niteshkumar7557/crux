import type { SVGProps } from "react";

// The Crux mark — "the braced door".
//
// The arena arch, with the two cases crossed inside it so that they reach the
// walls: the crossing is the bracing that holds the door up, not a symbol laid
// on top of it. That anchoring is the whole point. An earlier draft floated a
// small symmetric X clear of the frame, which is the anatomy of a checkbox
// cross — it read as "closed" and "denied" rather than as two cases meeting.
//
// One ink throughout: everything is `currentColor`, so the mark is forest on
// cream in light, cream on green-black in dark, and correct anywhere it is
// dropped without needing a variant (design-system.md §4 — the imagery in this
// system is monochrome without exception).

/** The arch, as an outline. Springs at y=11, apex at y=3, feet at y=21.2. */
export const ARCH_PATH = "M4 21.2V11a8 8 0 0 1 16 0v10.2";
/** The same arch as a closed shape, for the filled icon. */
export const ARCH_SOLID = "M4 21.4V11a8 8 0 0 1 16 0v10.4z";
/** The two braces. They run corner-to-wall, deliberately reaching the frame. */
export const BRACE_A = "M5.2 20.2L18.4 9.4";
export const BRACE_B = "M18.8 20.2L5.6 9.4";

const STROKE = 1.7;

/** The outlined mark. Hairline weight, to sit with the rest of the system. */
export const LogoMark = ({
  size = 28,
  ...rest
}: { size?: number } & SVGProps<SVGSVGElement>) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={STROKE}
    strokeLinecap="round"
    aria-hidden="true"
    {...rest}
  >
    <path d={ARCH_PATH} />
    <path d={BRACE_A} />
    <path d={BRACE_B} />
  </svg>
);

// The filled variant, for favicons and app icons — a hairline dies at 16px over
// a background we don't control, and platform icon masks round the corners off
// anything that overruns its box.
//
// The mask id is a constant rather than a generated one. Every instance renders
// byte-identical mask content, so duplicate ids on a page resolve to the same
// shape either way; a useId would force this into a client component for no
// visual difference.
export const LogoSolid = ({
  size = 28,
  ...rest
}: { size?: number } & SVGProps<SVGSVGElement>) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    {...rest}
  >
    <mask id="crux-brace">
      <rect width="24" height="24" fill="#fff" />
      <path
        d={`${BRACE_A} ${BRACE_B}`}
        stroke="#000"
        strokeWidth={STROKE + 0.45}
        strokeLinecap="round"
      />
    </mask>
    <path d={ARCH_SOLID} fill="currentColor" mask="url(#crux-brace)" />
  </svg>
);

/** Mark + wordmark. The wordmark stays Newsreader italic — it is already one of
 *  the system's three faces and reads well; only the mark is new.
 *
 *  The nudge on the wordmark is what makes the two read as one lockup.
 *  `items-center` centres the two *boxes*, but "Crux" has no descender, so its
 *  ink sits high in its line box while the arch's ink is centred in its own —
 *  aligned boxes left the mark's feet hanging below the baseline. Newsreader's
 *  ascent and descent sum to exactly 1em, so the correction is a constant
 *  0.103em of the wordmark's own size and holds at every scale. */
const Logo = ({
  size = 28,
  wordClassName = "text-2xl",
  className = "",
}: {
  size?: number;
  /** Sizing for the wordmark, so a caller can tune the lockup in place. */
  wordClassName?: string;
  className?: string;
}) => (
  <span className={`inline-flex items-center gap-2 ${className}`}>
    <LogoMark size={size} />
    <span
      className={`translate-y-[0.103em] font-headline italic tracking-tighter leading-none ${wordClassName}`}
    >
      Crux
    </span>
  </span>
);

export default Logo;
