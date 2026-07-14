import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./config/index.js";
import { PUBLIC_DIR } from "./lib/avatars.js";
import userRoutes from "./routes/user.route.js";
import argumentRoutes from "./routes/argument.route.js";
import commentRoutes from "./routes/comment.route.js";
import arenaRoutes from "./routes/arena.route.js";
import aiRoutes from "./routes/ai.route.js";
import likeRoutes from "./routes/like.route.js";
import profileRoutes from "./routes/profile.route.js";
import searchRoutes from "./routes/search.route.js";
import avatarRoutes from "./routes/avatar.route.js";
import domainRoutes from "./routes/domain.route.js";

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

// routes
app.get("/health", (req, res) => res.sendStatus(200));
app.use("/user", userRoutes);
app.use("/argument", argumentRoutes);
app.use("/comment", commentRoutes);
app.use("/arena", arenaRoutes);
app.use("/ai", aiRoutes);
app.use("/like", likeRoutes);
app.use("/profile", profileRoutes);
app.use("/search", searchRoutes);
app.use("/domains", domainRoutes);
app.use("/avatar", avatarRoutes);

export default app;
