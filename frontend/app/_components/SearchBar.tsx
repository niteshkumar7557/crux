"use client";

// Debounced search across motions, domains and users.
//
// The panel is square, the field and the result rows are pills — the third
// rounded exception in the system, recorded in design-system.md §5. A result row
// is a single-line control, and at that radius a single-line row IS a pill; it
// does not generalise to anything taller.

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PiMagnifyingGlass,
  PiScales,
  PiStack,
  PiUser,
  PiX,
} from "react-icons/pi";
import api from "@/app/axios";
import { SearchResults } from "@/app/types";
import { slugifyDomain } from "@/app/_utils/domainSlug";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";
import Portal from "@/app/_components/ui/Portal";

const EMPTY_RESULTS: SearchResults = { motions: [], domains: [], users: [] };

type Group = "Motions" | "Domains" | "People";

type Row = {
  key: string;
  group: Group;
  href: string;
  label: string;
  meta: string | null;
};

const GROUP_ICON: Record<Group, typeof PiScales> = {
  Motions: PiScales,
  Domains: PiStack,
  People: PiUser,
};

// One flat list drives both the render and the arrow keys, so the highlighted row
// and the row Enter opens can never be two different rows.
function toRows(results: SearchResults): Row[] {
  return [
    ...results.motions.map((r) => ({
      key: `motion-${r.id}`,
      group: "Motions" as const,
      href: `/motion/CRX-${r.id}-A`,
      label: r.content,
      meta: r.domain,
    })),
    ...results.domains.map((r) => ({
      key: `domain-${r.domain}`,
      group: "Domains" as const,
      href: `/domain?q=${slugifyDomain(r.domain)}`,
      label: r.domain,
      meta: `${r.motionCount} motions`,
    })),
    ...results.users.map((r) => ({
      key: `user-${r.id}`,
      group: "People" as const,
      href: `/profile/${r.username}`,
      label: `@${r.username}`,
      meta: null,
    })),
  ];
}

const Message = ({ children }: { children: React.ReactNode }) => (
  <p className="px-6 py-14 text-center font-label text-[0.68rem] uppercase tracking-[0.22em] text-ink-soft">
    {children}
  </p>
);

export default function SearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const rows = useMemo(() => toRows(results), [results]);
  const indexByKey = useMemo(
    () => new Map(rows.map((r, i) => [r.key, i])),
    [rows],
  );

  useGSAP(
    () => {
      if (!isOpen) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({ defaults: { ease: "power2.out" } })
          .fromTo(
            "[data-search-backdrop]",
            { opacity: 0 },
            { opacity: 1, duration: 0.2 },
          )
          .fromTo(
            "[data-search-panel]",
            { opacity: 0, scale: 0.98, y: -8 },
            {
              opacity: 1,
              scale: 1,
              y: 0,
              duration: 0.25,
              clearProps: "opacity,transform",
            },
            0.05,
          );
      });
    },
    { dependencies: [isOpen], scope: overlayRef },
  );

  function close() {
    setIsOpen(false);
    setSearchInput("");
    setResults(EMPTY_RESULTS);
    setIsLoading(false);
    setActiveIndex(0);
  }

  function handleInputChange(value: string) {
    setSearchInput(value);
    setActiveIndex(0);
    if (value.trim().length === 0) {
      setResults(EMPTY_RESULTS);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (rows.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + rows.length) % rows.length);
    } else if (e.key === "Enter") {
      const row = rows[activeIndex];
      if (!row) return;
      e.preventDefault();
      close();
      router.push(row.href);
    }
  }

  useEffect(() => {
    const query = searchInput.trim();
    if (query.length === 0) return;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get<SearchResults>("/search", {
          params: { q: query },
          signal: controller.signal,
        });
        setResults(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Search failed:", error);
          setResults(EMPTY_RESULTS);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchInput]);

  // Keeps a row reached by arrow key inside the scroll box.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const hasQuery = searchInput.trim().length > 0;

  return (
    <div className="relative ml-2 flex shrink-0 items-center md:ml-0">
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Search"
        className="md:hidden p-2 text-ink-soft hover:text-ink transition-colors cursor-pointer"
      >
        <PiMagnifyingGlass className="text-2xl" />
      </button>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Search motions, domains and users"
        className="relative z-10 hidden cursor-pointer items-center gap-2 rounded-full border border-ink-faint bg-band px-10 py-2.25 font-label text-[0.62rem] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:bg-ink-wash hover:text-ink md:flex"
      >
        <PiMagnifyingGlass className="text-sm" />
        Search
      </button>

      {isOpen && (
        <Portal>
          <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-start justify-center pt-24 sm:pt-32"
            onKeyDown={handleKeyDown}
          >
            <div
              data-search-backdrop
              className="fixed inset-0 bg-scrim backdrop-blur-md"
              onClick={close}
            />

            <div
              data-search-panel
              role="dialog"
              aria-modal="true"
              aria-label="Search"
              className="relative mx-4 flex w-full max-w-2xl flex-col overflow-hidden border border-ink-faint bg-raised shadow-cast sm:mx-0"
            >
              <div className="p-4">
                <div className="flex items-center gap-3 rounded-full border border-ink-faint bg-band px-5 py-3 transition-colors focus-within:border-ink">
                  <PiMagnifyingGlass className="shrink-0 text-xl text-ink-soft" />
                  <input
                    data-focus-ring="self"
                    className="min-w-0 flex-1 border-none bg-transparent font-body text-base text-ink outline-none placeholder:text-ink-soft"
                    placeholder="Search motions, domains, or people…"
                    aria-label="Search motions, domains, or people"
                    value={searchInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    autoFocus
                  />
                  <button
                    onClick={close}
                    aria-label="Close search"
                    className="shrink-0 cursor-pointer text-ink-soft transition-colors hover:text-ink"
                  >
                    <PiX className="text-lg" />
                  </button>
                </div>
              </div>

              <div ref={listRef} className="max-h-[60vh] overflow-y-auto px-4 pb-4">
                {!hasQuery && <Message>Start typing to search the arena</Message>}

                {hasQuery && isLoading && <Message>Searching…</Message>}

                {hasQuery && !isLoading && rows.length === 0 && (
                  <Message>
                    No results for{" "}
                    <span className="text-ink normal-case tracking-normal">
                      &ldquo;{searchInput}&rdquo;
                    </span>
                  </Message>
                )}

                {hasQuery &&
                  !isLoading &&
                  rows.length > 0 &&
                  (["Motions", "Domains", "People"] as const).map((group) => {
                    const groupRows = rows.filter((r) => r.group === group);
                    if (groupRows.length === 0) return null;
                    const Icon = GROUP_ICON[group];

                    return (
                      <div key={group} className="mb-2 last:mb-0">
                        <div className="flex items-center gap-3 px-3 pb-2 pt-3">
                          <span className="font-label text-[0.6rem] uppercase tracking-[0.26em] text-ink-soft">
                            {group}
                          </span>
                          <span aria-hidden className="h-px grow bg-ink-faint" />
                        </div>
                        <div className="flex flex-col gap-1">
                          {groupRows.map((row) => {
                            const index = indexByKey.get(row.key)!;
                            const active = index === activeIndex;
                            return (
                              <Link
                                key={row.key}
                                href={row.href}
                                onClick={close}
                                onMouseEnter={() => setActiveIndex(index)}
                                data-active={active}
                                aria-current={active ? "true" : undefined}
                                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-left transition-colors ${
                                  active ? "bg-ink-wash" : "hover:bg-ink-wash"
                                }`}
                              >
                                <Icon className="shrink-0 text-base text-ink-soft" />
                                <span className="grow truncate font-body text-sm text-ink">
                                  {row.label}
                                </span>
                                {row.meta && (
                                  <span className="shrink-0 font-label text-[0.6rem] uppercase tracking-[0.18em] text-ink-soft">
                                    {row.meta}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {rows.length > 0 && (
                <div className="hidden items-center gap-4 border-t border-ink-faint px-6 py-2.5 font-label text-[0.58rem] uppercase tracking-[0.2em] text-ink-soft sm:flex">
                  <span>↑↓ Move</span>
                  <span>⏎ Open</span>
                  <span>Esc Close</span>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
