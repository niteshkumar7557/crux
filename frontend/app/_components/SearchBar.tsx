"use client";
import { useState, useEffect } from "react";
import { IoMdSearch, IoMdClose } from "react-icons/io";

const data = [
  "Statement 1",
  "Statement 2",
  "Statement 3",
  "Statement 4",
  "Statement 5",
  "Statement 6",
];

export default function SearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<string []>([]);

  useEffect(() => {
    if (!isOpen) {
      setSearchInput("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim().length > 0) {
        const filtered = data.filter((statement) =>
        statement.toLowerCase().includes(searchInput.toLowerCase())).slice(0, 6);
        setResults(filtered);
      } 
      else {
        setResults([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchInput]);

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
                placeholder="Search statements..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <IoMdClose className="text-xl" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {searchInput.trim().length === 0 && (
                <div className="px-6 py-12 text-center text-gray-500 text-sm">
                  Start typing to search the arena...
                </div>
              )} 
              {searchInput.trim().length > 0 && results.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Statements
                  </div>
                  {results.map((result, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-4 py-3 flex items-center space-x-3 text-sm text-gray-300 hover:bg-neutral-800 hover:text-white border-l-2 border-transparent"
                      onClick={() => setIsOpen(false)}
                      >
                      <span className="truncate">{result}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchInput.trim().length > 0 && results.length === 0 && (
                <div className="px-6 py-12 text-center text-gray-500 text-sm">
                  No statements found for "<span className="text-gray-300">{searchInput}</span>"
                </div>
              )}
            </div>  
          </div>
        </div>
    )}
    </div>
  );
}