import { Router } from "express";
import {
  getActiveCardData,
  getLeaderboardData,
  getNewestCardData,
  getSidebarData,
  getSitemapData,
  getStatements,
  getTrendingCardData,
} from "../controllers/arena.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { toggleVote, getVote } from "../controllers/vote.controller.js";

const arenaRoutes = Router();

arenaRoutes.get("/active/main", getActiveCardData);
arenaRoutes.get("/active/trending", getTrendingCardData);
arenaRoutes.get("/active/newest", getNewestCardData);
arenaRoutes.get("/sidebar", getSidebarData);
arenaRoutes.get("/leaderboard", getLeaderboardData);
arenaRoutes.get("/statements", getStatements);
arenaRoutes.get("/sitemap", getSitemapData);
arenaRoutes.post("/vote/:id", authMiddleware, toggleVote);
arenaRoutes.get("/vote/:id", authMiddleware, getVote);

export default arenaRoutes;
