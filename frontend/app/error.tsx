"use client";

// Route error boundary.
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
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
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="relative min-h-[70vh] flex items-center justify-center px-6 overflow-hidden">
      <div className="max-w-xl w-full border border-side-against/40 bg-band p-10 md:p-14 text-center">
        <span className="font-label text-[10px] uppercase tracking-[0.3em] text-side-against block mb-4">
          System Fault
        </span>
        <h1 className="display-type text-[clamp(1.9rem,4vw,2.8rem)] text-ink mb-5">
          The Arena Faltered
        </h1>
        <p className="font-body text-sm text-ink-soft leading-relaxed mb-10">
          Something went wrong on our side while loading this page. Your
          arguments are safe — try again in a moment.
        </p>
        <Button size="lg" onClick={reset}>
          Try Again
          <LuRotateCcw className="text-lg" />
        </Button>
        {error.digest && (
          <p className="mt-8 font-label text-[9px] uppercase tracking-widest text-ink-soft">
            Ref: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
};

export default Error;
