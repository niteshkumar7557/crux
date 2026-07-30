// The braced door — the arena arch with the two cases crossed inside it, reaching
// the walls. The bracing is structure, not ornament: a symmetric X floating clear of
// the frame reads as a checkbox cross. If it is ever redrawn, the braces must keep
// touching the arch. See design-system.md §7.

import type { SVGProps } from "react";

export const ARCH_PATH = "M4 21.2V11a8 8 0 0 1 16 0v10.2";
export const ARCH_SOLID = "M4 21.4V11a8 8 0 0 1 16 0v10.4z";
export const BRACE_A = "M5.2 20.2L18.4 9.4";
export const BRACE_B = "M18.8 20.2L5.6 9.4";

const STROKE = 1.7;

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

const Logo = ({
  size = 28,
  wordClassName = "text-2xl",
  className = "",
}: {
  size?: number;
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
