// Shared sidebar section shell.

import Link from "next/link";
import type { ReactNode } from "react";

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
  <section className={`px-4 ${className}`}>
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
