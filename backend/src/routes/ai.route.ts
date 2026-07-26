import { Router } from "express";
import { checkEligibleStatement } from "../controllers/ai.controller.js";
import { llmLimiter } from "../middlewares/rateLimit.js";

const aiRoutes = Router();

// Eligibility check is deliberately pre-login, so this keys by IP.
aiRoutes.post("/statement", llmLimiter, checkEligibleStatement);

export default aiRoutes;
