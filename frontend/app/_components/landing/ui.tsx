"use client";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { HTMLAttributes, ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------------- helpers */

export const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fade-and-rise every [data-reveal] inside the scope as it scrolls in.
 *  Call inside a section's useGSAP. Respects reduced motion. */
export const initReveals = (scope: HTMLElement | null) => {
  if (!scope) return;
  const targets = gsap.utils.toArray<HTMLElement>("[data-reveal]", scope);
  if (prefersReduced()) {
    gsap.set(targets, { autoAlpha: 1 });
    return;
  }
  targets.forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 30 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        delay: Number(el.dataset.revealDelay ?? 0),
        scrollTrigger: { trigger: el, start: "top 86%", once: true },
      },
    );
  });
};

/* ---------------------------------------------------------------- pieces */

export const PillButton = ({
  href,
  children,
  variant = "solid",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "solid" | "outline";
  className?: string;
}) => (
  <Link
    href={href}
    className={`inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-label text-xs font-medium uppercase tracking-[0.22em] transition-all duration-200 hover:-translate-y-0.5 ${
      variant === "solid"
        ? "bg-ink text-paper hover:opacity-90"
        : "border border-ink-faint text-ink hover:bg-ink-wash"
    } ${className}`}
  >
    {children}
  </Link>
);

export const Eyebrow = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <p
    className={`flex items-center gap-3 font-label text-[0.68rem] font-medium uppercase tracking-[0.3em] text-ink-soft ${className}`}
  >
    <span aria-hidden className="h-px w-8 bg-ink-faint" />
    {children}
  </p>
);

/** Section header: eyebrow + big display headline. */
export const SectionHead = ({
  kicker,
  title,
  center = false,
  className = "",
}: {
  kicker: string;
  title: ReactNode;
  center?: boolean;
  className?: string;
}) => (
  <header className={`${center ? "flex flex-col items-center text-center" : ""} ${className}`}>
    <Eyebrow className={center ? "justify-center" : ""}>{kicker}</Eyebrow>
    <h2
      data-reveal
      className="display-type mt-5 text-[clamp(2.4rem,6vw,4.6rem)] text-ink"
    >
      {title}
    </h2>
  </header>
);

/** A serif italic aside inside a display headline. */
export const Serif = ({ children }: { children: ReactNode }) => (
  <span className="font-headline lowercase italic tracking-normal">
    {children}
  </span>
);

/** Specimen plate: engraving on its own sheet of cream paper. The sheet stays
 *  cream in dark mode — the archive at night. `arch` tops portrait plates
 *  with the arena-door arch.
 *
 *  The caption sits *below* the sheet rather than on it. A flat cream strip
 *  with no engraving on it is the brightest thing on a dark page, and it read
 *  as a glare rather than a label; on the page's own paper it stays a label in
 *  both modes. */
export const Plate = ({
  src,
  alt,
  caption,
  arch = false,
  priority = false,
  sizes = "(min-width: 1024px) 40vw, 90vw",
  className = "",
  imgClassName = "",
  ...rest
}: {
  src: string;
  alt: string;
  caption?: string;
  arch?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  imgClassName?: string;
} & HTMLAttributes<HTMLElement>) => (
  <figure {...rest} className={className}>
    <div
      className={`overflow-hidden border border-[#24413440] bg-plate ${
        arch ? "plate-arch" : ""
      }`}
    >
      <Image
        src={src}
        alt={alt}
        width={1024}
        height={1024}
        priority={priority}
        sizes={sizes}
        className={`engraving h-auto w-full ${imgClassName}`}
      />
    </div>
    {caption && (
      <figcaption className="mt-3.5 text-center font-label text-[0.62rem] uppercase tracking-[0.28em] text-ink-soft">
        {caption}
      </figcaption>
    )}
  </figure>
);

/** Standard section shell — consistent rhythm, optional band background. */
export const Section = ({
  id,
  band = false,
  children,
  className = "",
}: {
  id?: string;
  band?: boolean;
  children: ReactNode;
  className?: string;
}) => (
  <section
    id={id}
    className={`${band ? "bg-band" : ""} px-6 py-24 md:px-10 md:py-36 ${className}`}
  >
    <div className="mx-auto w-full max-w-6xl">{children}</div>
  </section>
);
