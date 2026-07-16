"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { LuSearch, LuX } from "react-icons/lu";
import api from "@/app/axios";
import { SearchResults } from "@/app/types";
import { slugifyDomain } from "@/app/_utils/domainSlug";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";

const EMPTY_RESULTS: SearchResults = { statements: [], domains: [], users: [] };

export default function SearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Modal open choreography only — results re-render every debounce tick and
  // must never animate per keystroke.
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
    { dependencies: [isOpen], scope: rootRef },
  );

  // State resets live in the handlers (not effects) so renders never cascade.
  function close() {
    setIsOpen(false);
    setSearchInput("");
    setResults(EMPTY_RESULTS);
    setIsLoading(false);
  }

  function handleInputChange(value: string) {
    setSearchInput(value);
    if (value.trim().length === 0) {
      setResults(EMPTY_RESULTS);
      setIsLoading(false);
    } else {
      setIsLoading(true);
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

  const hasQuery = searchInput.trim().length > 0;
  const hasResults =
    results.statements.length > 0 ||
    results.domains.length > 0 ||
    results.users.length > 0;

  return (
    <div
      ref={rootRef}
      className="relative flex-1 min-w-0 max-w-3xl flex justify-end md:justify-start"
    >
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Search"
        className="md:hidden p-2 text-outline hover:text-primary-container transition-colors cursor-pointer"
      >
        <LuSearch className="text-2xl" />
      </button>
      <button
        onClick={() => setIsOpen(true)}
        className="relative z-10 hidden md:flex items-center bg-surface-container-low border border-outline-variant transition-colors w-full hover:border-outline cursor-pointer px-4 py-2.5 gap-3"
      >
        <LuSearch className="text-xl text-outline" />
        <span className="text-sm font-body text-outline w-full text-left">
          Search statements...
        </span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 sm:pt-32"
          onKeyDown={(e) => e.key === "Escape" && close()}
        >
          <div
            data-search-backdrop
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          <div
            data-search-panel
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            className="relative w-full max-w-2xl bg-surface-container-lowest/20 border border-outline-variant rounded-xl shadow-2xl overflow-hidden flex flex-col mx-4 sm:mx-0"
          >
            <div className="flex items-center px-4 py-4 bg-surface-container-low border-b border-transparent focus-within:border-primary/50 transition-colors">
              <LuSearch className="text-outline text-2xl mr-2" />
              <input
                className="flex-1 bg-transparent border-none focus:outline-none text-lg text-on-surface placeholder:text-outline"
                placeholder="Search statements, domains, or users..."
                aria-label="Search statements, domains, or users"
                value={searchInput}
                onChange={(e) => handleInputChange(e.target.value)}
                autoFocus
              />
              <button
                onClick={close}
                aria-label="Close search"
                className="p-1 text-outline hover:text-on-surface hover:bg-surface-container-high"
              >
                <LuX className="text-xl" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {!hasQuery && (
                <div className="px-6 py-12 text-center text-outline text-sm">
                  Start typing to search the arena...
                </div>
              )}

              {hasQuery && isLoading && (
                <div className="px-6 py-12 text-center text-outline text-sm">
                  Searching...
                </div>
              )}

              {hasQuery && !isLoading && hasResults && (
                <div className="py-2">
                  {results.statements.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-outline uppercase tracking-wider">
                        Statements
                      </div>
                      {results.statements.map((result) => (
                        <Link
                          key={`statement-${result.id}`}
                          href={`/argument/CRX-${result.id}-A`}
                          onClick={close}
                          className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border-l-2 border-transparent"
                        >
                          <span className="truncate">{result.content}</span>
                          <span className="shrink-0 text-xs text-outline uppercase tracking-wider">
                            {result.domain}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {results.domains.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-outline uppercase tracking-wider">
                        Domains
                      </div>
                      {results.domains.map((result) => (
                        <Link
                          key={`domain-${result.domain}`}
                          href={`/domain?q=${slugifyDomain(result.domain)}`}
                          onClick={close}
                          className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border-l-2 border-transparent"
                        >
                          <span className="truncate">{result.domain}</span>
                          <span className="shrink-0 text-xs text-outline">
                            {result.statementCount} statements
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {results.users.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-outline uppercase tracking-wider">
                        Users
                      </div>
                      {results.users.map((result) => (
                        <Link
                          key={`user-${result.id}`}
                          href={`/profile/${result.id}`}
                          onClick={close}
                          className="w-full text-left px-4 py-3 flex items-center space-x-3 text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border-l-2 border-transparent"
                        >
                          <span className="truncate">@{result.username}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {hasQuery && !isLoading && !hasResults && (
                <div className="px-6 py-12 text-center text-outline text-sm">
                  No results found for &ldquo;
                  <span className="text-on-surface">{searchInput}</span>&rdquo;
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
