import { Router } from "express";
import {
  getProfileActivity,
  getProfileShell,
  getUsernameById,
  updateBio,
} from "../controllers/profile.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

const profileRoutes = Router();

// Order matters: the literal segments must be registered before the
// `:username` wildcard or they never match.
profileRoutes.patch("/bio", authMiddleware, updateBio);
profileRoutes.get("/id/:id", getUsernameById);
profileRoutes.get("/:username/activity", getProfileActivity);
profileRoutes.get("/:username", getProfileShell);

export default profileRoutes;
