// Must be imported before anything else so Sentry can instrument requires.
import * as Sentry from "@sentry/node";
import config from "./config/index.js";

if (config.node_env === "production" && config.sentry_dsn) {
  Sentry.init({ dsn: config.sentry_dsn, tracesSampleRate: 0 });
}
