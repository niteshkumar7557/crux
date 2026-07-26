import { Router } from "express";
import {
  addNewArgument,
  getArgumentById,
} from "../controllers/argument.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { llmLimiter } from "../middlewares/rateLimit.js";

const argumentRoutes = Router();

// Casting a statement creates content AS you and spends two LLM calls —
// token required, identity from the token.
argumentRoutes.post("/", authMiddleware, llmLimiter, addNewArgument);
argumentRoutes.get("/:id", getArgumentById);

export default argumentRoutes;
