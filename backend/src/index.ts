import "./instrument.js";
import app from "./app.js";
import config from "./config/index.js";
import pool from "./db/index.js";
import logger from "./lib/logger.js";
import { startConclusionPoller } from "./jobs/conclusion.js";
import { startFeaturingPoller } from "./jobs/featuring.js";
import { startSeasonRolloverPoller } from "./jobs/seasonRollover.js";

async function start() {
  try {
    // Loud on boot rather than silent forever: without the shared secret,
    // nothing proves a request came through the CDN, so anything that reaches
    // this origin directly can forge CF-Connecting-IP and slip every rate
    // limit — including the one guarding login. See middlewares/rateLimit.ts.
    if (config.node_env === "production" && !config.edge_secret) {
      logger.warn(
        "EDGE_SECRET is not set — client IPs cannot be verified, so requests " +
          "that bypass the CDN can forge their rate-limit identity",
      );
    }

    await pool.query("SELECT 1");
    logger.info("Database connected");

    // "::" binds every interface, IPv6 and IPv4 alike. Required: the platform's
    // private network resolves service hostnames to IPv6, so an IPv4-only bind
    // makes this API unreachable from the frontend (502s) while looking healthy.
    app.listen(config.server_port, "::", () => {
      logger.info({ port: config.server_port }, "server up");

      startConclusionPoller();
      startFeaturingPoller();
      startSeasonRolloverPoller();
    });
  } catch (err) {
    logger.fatal({ err }, "Failed to connect to database");
    process.exit(1);
  }
}

start();