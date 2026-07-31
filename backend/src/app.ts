// The Express app: middleware order, then every route group.
// /health is mounted ABOVE the rate limiter so user traffic can never starve the
// platform's own liveness probe. See codebase-guide.md §10.

import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./config/index.js";
import { PRESETS_DIR, PUBLIC_DIR } from "./lib/avatars.js";
import userRoutes from "./routes/user.route.js";
import motionRoutes from "./routes/motion.route.js";
import argumentRoutes from "./routes/argument.route.js";
import arenaRoutes from "./routes/arena.route.js";
import aiRoutes from "./routes/ai.route.js";
import likeRoutes from "./routes/like.route.js";
import profileRoutes from "./routes/profile.route.js";
import searchRoutes from "./routes/search.route.js";
import avatarRoutes from "./routes/avatar.route.js";
import domainRoutes from "./routes/domain.route.js";
import notificationRoutes from "./routes/notification.route.js";
import devMessageRoutes from "./routes/devMessage.route.js";
import adminRoutes from "./routes/admin.route.js";
import { globalLimiter, clientIp } from "./middlewares/rateLimit.js";
import { pinoHttp } from "pino-http";
import * as Sentry from "@sentry/node";
import logger from "./lib/logger.js";
import pool from "./db/index.js";
import { makeHealthHandler } from "./lib/health.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.client_url,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
// Preset art is mutable behind a permanent URL. The ids stay stable so a stored
// avatar keeps resolving, which means redesigning a preset ships new bytes at the
// old address — and every cache in front keys on that address alone, so it serves
// the previous release's art until its own TTL lapses. Uploads have the opposite
// shape (unique keys, immutable — see avatarStorage.ts), so only presets need this.
app.use(
  express.static(PUBLIC_DIR, {
    setHeaders: (res, filePath) => {
      if (filePath.startsWith(PRESETS_DIR)) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }),
);

// Above the limiter, deliberately. Unverified traffic shares one bucket, so a
// flood arriving off-edge would exhaust it — and a starved liveness probe cycles
// a perfectly healthy container. It costs one SELECT 1.
app.get("/health", makeHealthHandler(() => pool.query("SELECT 1")));

// After static (avatars spend no budget), before every API route.
app.use(globalLimiter);

app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === "/health" },
    customProps: (req) => ({
      clientIp: clientIp(req as any),
      userId: (req as any).user?.id,
    }),
    serializers: {
      req: (req: any) => ({ method: req.method, url: req.url }),
      res: (res: any) => ({ status: res.statusCode }),
    },
  }),
);

app.use("/user", userRoutes);
app.use("/motion", motionRoutes);
// Arguments live under the motion they belong to: /motion/:id/arguments.
app.use("/motion", argumentRoutes);
app.use("/arena", arenaRoutes);
app.use("/ai", aiRoutes);
app.use("/like", likeRoutes);
app.use("/profile", profileRoutes);
app.use("/search", searchRoutes);
app.use("/domains", domainRoutes);
app.use("/avatar", avatarRoutes);
app.use("/notifications", notificationRoutes);
app.use("/messages", devMessageRoutes);
app.use("/admin", adminRoutes);

Sentry.setupExpressErrorHandler(app);

export default app;
