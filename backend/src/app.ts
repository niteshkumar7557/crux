import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./config/index.js";
import { PUBLIC_DIR } from "./lib/avatars.js";
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
import adminRoutes from "./routes/admin.route.js";
import { globalLimiter, clientIp } from "./middlewares/rateLimit.js";
import { pinoHttp } from "pino-http";
import * as Sentry from "@sentry/node";
import logger from "./lib/logger.js";
import pool from "./db/index.js";
import { makeHealthHandler } from "./lib/health.js";

const app = express();

// middlewares
app.use(helmet());
app.use(
  cors({
    origin: config.client_url,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(express.static(PUBLIC_DIR));

// After static (avatars don't spend budget), before every API route.
app.use(globalLimiter);

// One JSON line per request; /health is noise (polled every few seconds).
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

// routes
app.get("/health", makeHealthHandler(() => pool.query("SELECT 1")));
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
app.use("/admin", adminRoutes);

// After all routes; a no-op when init() didn't run (dev, CI, no DSN).
Sentry.setupExpressErrorHandler(app);

export default app;
