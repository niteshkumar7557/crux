// Boot: prove the database is reachable, log which storage and relay modes are
// live, then serve and start the four pollers. Binds "::" — the private network
// resolves to IPv6, and an IPv4-only bind 502s while looking healthy.

import "./instrument.js";
import app from "./app.js";
import config from "./config/index.js";
import pool from "./db/index.js";
import logger from "./lib/logger.js";
import { startConclusionPoller } from "./jobs/conclusion.js";
import { startFeaturingPoller } from "./jobs/featuring.js";
import { startSeasonRolloverPoller } from "./jobs/seasonRollover.js";
import { startTelegramPoller } from "./jobs/telegram.js";
import { avatarStore } from "./controllers/avatar.controller.js";

async function start() {
  try {
    // Loud on boot rather than silent forever: without the shared secret,
    // anything reaching this origin directly can forge its rate-limit identity
    // and slip every limiter, including the one guarding login.
    if (config.node_env === "production" && !config.edge_secret) {
      logger.warn(
        "EDGE_SECRET is not set — client IPs cannot be verified, so requests " +
          "that bypass the CDN can forge their rate-limit identity",
      );
    }

    await pool.query("SELECT 1");
    logger.info("Database connected");

    // Which store the uploads land in is invisible until someone uploads one,
    // and "local" in production means they vanish on the next deploy.
    logger.info({ store: avatarStore.kind }, "avatar storage");

    app.listen(config.server_port, "::", () => {
      logger.info({ port: config.server_port }, "server up");

      startConclusionPoller();
      startFeaturingPoller();
      startSeasonRolloverPoller();
      startTelegramPoller();
    });
  } catch (err) {
    logger.fatal({ err }, "Failed to connect to database");
    process.exit(1);
  }
}

start();
