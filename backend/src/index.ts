import "./instrument.js";
import app from "./app.js";
import config from "./config/index.js";
import logger from "./lib/logger.js";
import { startConclusionPoller } from "./jobs/conclusion.js";
import { startFeaturingPoller } from "./jobs/featuring.js";
import { startSeasonRolloverPoller } from "./jobs/seasonRollover.js";

app.listen(config.server_port, () => {
  logger.info({ port: config.server_port }, "server up");
  startConclusionPoller();
  startFeaturingPoller();
  startSeasonRolloverPoller();
});
