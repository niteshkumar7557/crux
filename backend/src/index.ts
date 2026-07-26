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
    await pool.query("SELECT 1");
    logger.info("Database connected");

    app.listen(config.server_port, () => {
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