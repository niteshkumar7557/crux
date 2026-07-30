// One JSON line per event to stdout; pretty-printed outside production.

import { pino } from "pino";
import config from "../config/index.js";

const logger = pino({
  level: config.log_level,
  ...(config.node_env === "production"
    ? {}
    : { transport: { target: "pino-pretty" } }),
});

export default logger;
