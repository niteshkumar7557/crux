"use client";
import { useEffect } from "react";
import { LuRotateCcw } from "react-icons/lu";
import Button from "./_components/ui/Button";

const Error = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative min-h-[70vh] flex items-center justify-center px-6 overflow-hidden">
      <div className="absolute inset-0 technical-grid -z-10 pointer-events-none"></div>
      <div className="max-w-xl w-full border-l-2 border-secondary bg-surface-container-low p-10 md:p-14 text-center">
        <span className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary block mb-4">
          System Fault
        </span>
        <h1 className="font-headline italic text-4xl md:text-5xl text-on-surface leading-tight mb-4">
          The Arena Faltered
        </h1>
        <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-10">
          Something went wrong on our side while loading this page. Your
          arguments are safe — try again in a moment.
        </p>
        <Button size="lg" onClick={reset}>
          Try Again
          <LuRotateCcw className="text-lg" />
        </Button>
        {error.digest && (
          <p className="mt-8 font-label text-[9px] uppercase tracking-widest text-outline">
            Ref: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
};

export default Error;
