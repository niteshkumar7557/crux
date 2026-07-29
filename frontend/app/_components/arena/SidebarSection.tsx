import Link from "next/link";
import type { ReactNode } from "react";

// The sidebar's three modules all wore the same hand-built header. One shell
// now: rule-and-eyebrow on the left, a quiet link out on the right, hairline
// under the whole thing. Rows below it are divided by rules rather than boxed
// as cards — a sidebar of stacked cards competes with the feed's cards for
// attention, and the feed should win.
const SidebarSection = ({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: { label: string; href: string };
  children: ReactNode;
  className?: string;
}) => (
  <section className={className}>
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-faint pb-3">
      <h2 className="flex items-center gap-2 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
        <span aria-hidden className="h-px w-8 bg-ink-faint" />
        {title}
      </h2>
      {action && (
        <Link
          href={action.href}
          className="font-label text-[0.58rem] uppercase tracking-[0.22em] text-ink-soft transition-colors hover:text-ink"
        >
          {action.label}
        </Link>
      )}
    </div>
    {children}
  </section>
);

export default SidebarSection;
