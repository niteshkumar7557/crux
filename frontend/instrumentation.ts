// Server-side Sentry init. Inert without a DSN.

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled:
        process.env.NODE_ENV === "production" &&
        !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
