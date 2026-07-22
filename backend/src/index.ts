import app from "./app.js";
import config from "./config/index.js";
import { startConclusionPoller } from "./jobs/conclusion.js";
import { startFeaturingPoller } from "./jobs/featuring.js";
import { startSeasonRolloverPoller } from "./jobs/seasonRollover.js";

app.listen(config.server_port, () => {
  console.log(`Server is up and running on ${config.server_port}...`);
  startConclusionPoller();
  startFeaturingPoller();
  startSeasonRolloverPoller();
});
