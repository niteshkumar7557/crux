import * as Sentry from "@sentry/nextjs";

// Inert unless BOTH conditions hold — no DSN in dev or CI means no SDK.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled:
    process.env.NODE_ENV === "production" &&
    !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
});
