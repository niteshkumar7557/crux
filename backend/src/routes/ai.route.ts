import { Router } from "express";
import { checkEligibleMotion } from "../controllers/ai.controller.js";
import { llmLimiter } from "../middlewares/rateLimit.js";

const aiRoutes = Router();

// Eligibility check is deliberately pre-login, so this keys by IP.
aiRoutes.post("/motion", llmLimiter, checkEligibleMotion);

export default aiRoutes;
