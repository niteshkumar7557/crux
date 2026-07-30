// Sentry, imported first in index.ts so it wraps everything. Inert without a DSN.

import * as Sentry from "@sentry/node";
import config from "./config/index.js";

if (config.node_env === "production" && config.sentry_dsn) {
  Sentry.init({ dsn: config.sentry_dsn, tracesSampleRate: 0 });
}
