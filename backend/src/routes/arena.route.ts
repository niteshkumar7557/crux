import { Router } from "express";
import {
  getPrimaryCardData,
  getLeaderboardData,
  getNewestCardData,
  getSeasonLeaderboard,
  getSidebarData,
  getSitemapData,
  getStatements,
  getSecondaryCardsData,
} from "../controllers/arena.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { toggleVote, getVote } from "../controllers/vote.controller.js";

const arenaRoutes = Router();

arenaRoutes.get("/active/primary", getPrimaryCardData);
arenaRoutes.get("/active/secondary", getSecondaryCardsData);
arenaRoutes.get("/active/newest", getNewestCardData);
arenaRoutes.get("/sidebar", getSidebarData);
arenaRoutes.get("/leaderboard", getLeaderboardData);
arenaRoutes.get("/leaderboard/season", getSeasonLeaderboard);
arenaRoutes.get("/statements", getStatements);
arenaRoutes.get("/sitemap", getSitemapData);
arenaRoutes.post("/vote/:id", authMiddleware, toggleVote);
arenaRoutes.get("/vote/:id", authMiddleware, getVote);

export default arenaRoutes;
