import { Router } from "express";
import {
  getPrimaryCardData,
  getLeaderboardData,
  getSeasonLeaderboard,
  getSidebarData,
  getSitemapData,
  getMotions,
  getSecondaryCardsData,
} from "../controllers/arena.controller.js";

const arenaRoutes = Router();

arenaRoutes.get("/active/primary", getPrimaryCardData);
arenaRoutes.get("/active/secondary", getSecondaryCardsData);
arenaRoutes.get("/sidebar", getSidebarData);
arenaRoutes.get("/leaderboard", getLeaderboardData);
arenaRoutes.get("/leaderboard/season", getSeasonLeaderboard);
arenaRoutes.get("/motions", getMotions);
arenaRoutes.get("/sitemap", getSitemapData);

export default arenaRoutes;
