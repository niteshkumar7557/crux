import { pino } from "pino";
import config from "../config/index.js";

// One JSON line per event to stdout; Docker collects, rotation is compose's
// job (Task 9). pino-pretty only outside production.
const logger = pino({
  level: config.log_level,
  ...(config.node_env === "production"
    ? {}
    : { transport: { target: "pino-pretty" } }),
});

export default logger;
