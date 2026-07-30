import { Router } from "express";
import { checkEligibleMotion } from "../controllers/ai.controller.js";
import { llmLimiter } from "../middlewares/rateLimit.js";

const aiRoutes = Router();

aiRoutes.post("/motion", llmLimiter, checkEligibleMotion);

export default aiRoutes;
