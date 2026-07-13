import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "solid" | "outline" | "outline-secondary" | "outline-neutral";
type Size = "sm" | "md" | "lg" | "bare";

const BASE =
  "inline-flex items-center justify-center gap-2 font-label uppercase tracking-widest font-bold whitespace-nowrap cursor-pointer transition-all duration-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";

const VARIANTS: Record<Variant, string> = {
  solid: "bg-primary text-on-primary hover:bg-primary-container",
  outline: "border border-primary text-primary hover:bg-primary/10",
  "outline-secondary":
    "border border-secondary text-secondary hover:bg-secondary/10",
  "outline-neutral":
    "border border-outline text-on-surface hover:bg-on-surface hover:text-background",
};

// One padding/type scale for every CTA; "bare" leaves sizing to the caller
// (e.g. responsive paddings).
const SIZES: Record<Size, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-6 py-3 text-xs",
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
