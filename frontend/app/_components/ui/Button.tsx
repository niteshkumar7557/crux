// The pill — one of the system's two non-square shapes. Hover LIFTS, never scales:
// nothing here has the depth to justify being pressed into the page.
// See design-system.md §5.

import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant =
  | "solid"
  | "outline"
  | "for"
  | "against"
  | "outline-secondary"
  | "outline-neutral";

type Size = "sm" | "md" | "lg" | "bare";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-label uppercase tracking-[0.22em] font-medium whitespace-nowrap cursor-pointer transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0";

const VARIANTS: Record<Variant, string> = {
  solid: "bg-ink text-paper hover:opacity-90",
  outline: "border border-ink-faint text-ink hover:bg-ink-wash",
  for: "border border-side-for/50 text-side-for hover:bg-side-for/10",
  against: "border border-side-against/50 text-side-against hover:bg-side-against/10",
  "outline-secondary":
    "border border-side-against/50 text-side-against hover:bg-side-against/10",
  "outline-neutral": "border border-ink-faint text-ink-soft hover:bg-ink-wash",
};

const SIZES: Record<Size, string> = {
  sm: "px-5 py-2.5 text-[0.65rem]",
  md: "px-7 py-3 text-xs",
  lg: "px-10 py-4 text-sm",
  bare: "",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  href?: string;
  children: ReactNode;
};

const Button = ({
  variant = "solid",
  size = "md",
  href,
  className = "",
  children,
  ...rest
}: ButtonProps) => {
  const classes = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
};

export default Button;
