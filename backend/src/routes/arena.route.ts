import { Router } from "express";
import {
  getActiveCardData,
  getLeaderboardData,
  getNewestCardData,
  getSidebarData,
  getStatements,
  getTrendingCardData,
} from "../controllers/arena.controller.js";

const arenaRoutes = Router();

arenaRoutes.get("/active/main", getActiveCardData);
arenaRoutes.get("/active/trending", getTrendingCardData);
arenaRoutes.get("/active/newest", getNewestCardData);
arenaRoutes.get("/sidebar", getSidebarData);
arenaRoutes.get("/leaderboard", getLeaderboardData);
arenaRoutes.get("/statements", getStatements);

export default arenaRoutes;
