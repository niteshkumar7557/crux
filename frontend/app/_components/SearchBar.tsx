"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { IoMdSearch, IoMdClose } from "react-icons/io";
import api from "@/app/axios";
import { SearchResults } from "@/app/types";

const EMPTY_RESULTS: SearchResults = { statements: [], domains: [], users: [] };

export default function SearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchInput("");
      setResults(EMPTY_RESULTS);
    }
  }, [isOpen]);

  useEffect(() => {
    const query = searchInput.trim();
    if (query.length === 0) {
      setResults(EMPTY_RESULTS);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

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
    <div className="relative flex-1 max-w-3xl w-full lg:min-w-150">
      <div
        onClick={() => setIsOpen(true)}
        className="relative z-10 flex items-center bg-zinc-900 border border-neutral-700 rounded-md transition-colors w-full hover:border-gray-500 cursor-pointer px-4 py-2.5 gap-3">
        <IoMdSearch className="text-xl text-gray-400" />
        <span className="text-sm font-body text-gray-500 w-full text-left">
          Search statements...
        </span>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 sm:pt-32">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-neutral-900/20 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden flex flex-col mx-4 sm:mx-0">
            <div className="flex items-center px-4 py-4 bg-zinc-900">
              <IoMdSearch className="text-gray-400 text-2xl mr-2" />
              <input
                className="flex-1 bg-transparent border-none focus:outline-none text-lg text-white placeholder-gray-500"
                placeholder="Search statements, domains, or users..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoFocus
              />
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <IoMdClose className="text-xl" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {!hasQuery && (
                <div className="px-6 py-12 text-center text-gray-500 text-sm">
                  Start typing to search the arena...
                </div>
              )}

              {hasQuery && isLoading && (
                <div className="px-6 py-12 text-center text-gray-500 text-sm">
                  Searching...
                </div>
              )}

              {hasQuery && !isLoading && hasResults && (
                <div className="py-2">
                  {results.statements.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Statements
                      </div>
                      {results.statements.map((result) => (
                        <Link
                          key={`statement-${result.id}`}
                          href={`/argument/CRX-${result.id}-A`}
                          onClick={() => setIsOpen(false)}
                          className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 text-sm text-gray-300 hover:bg-neutral-800 hover:text-white border-l-2 border-transparent"
                        >
                          <span className="truncate">{result.content}</span>
                          <span className="shrink-0 text-xs text-gray-500 uppercase tracking-wider">
                            {result.domain}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {results.domains.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Domains
                      </div>
                      {results.domains.map((result) => (
                        <Link
                          key={`domain-${result.domain}`}
                          href={`/archive?domain=${encodeURIComponent(result.domain)}`}     // crux-future: Updated the href to include the domain as a query parameter for better routing
                          onClick={() => setIsOpen(false)}
                          className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 text-sm text-gray-300 hover:bg-neutral-800 hover:text-white border-l-2 border-transparent"
                        >
                          <span className="truncate">{result.domain}</span>
                          <span className="shrink-0 text-xs text-gray-500">
                            {result.statementCount} statements
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {results.users.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Users
                      </div>
                      {results.users.map((result) => (
                        <Link
                          key={`user-${result.id}`}
                          href={`/profile/${result.id}`}
                          onClick={() => setIsOpen(false)}
                          className="w-full text-left px-4 py-3 flex items-center space-x-3 text-sm text-gray-300 hover:bg-neutral-800 hover:text-white border-l-2 border-transparent"
                        >
                          <span className="truncate">@{result.username}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {hasQuery && !isLoading && !hasResults && (
                <div className="px-6 py-12 text-center text-gray-500 text-sm">
                  No results found for "<span className="text-gray-300">{searchInput}</span>"
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
