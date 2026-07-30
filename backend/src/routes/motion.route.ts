import { Router } from "express";
import {
  addNewMotion,
  getMotionById,
} from "../controllers/motion.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { llmLimiter } from "../middlewares/rateLimit.js";

const motionRoutes = Router();

motionRoutes.post("/", authMiddleware, llmLimiter, addNewMotion);
motionRoutes.get("/:id", getMotionById);

export default motionRoutes;
