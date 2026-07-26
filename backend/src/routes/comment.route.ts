import { Router } from "express";
import {
  getComments,
  postAffirmativeComment,
  postNegativeComment,
} from "../controllers/comment.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { llmLimiter } from "../middlewares/rateLimit.js";

const commentRoutes = Router();

commentRoutes.get("/:id", getComments);

// Posting argues as YOU — identity comes from the verified token, never the
// body (closes the impersonation gap in CODEBASE_GUIDE §9). Auth first so the
// limiter can key by user id.
commentRoutes.post(
  "/affirmative/:id",
  authMiddleware,
  llmLimiter,
  postAffirmativeComment,
);
commentRoutes.post(
  "/negative/:id",
  authMiddleware,
  llmLimiter,
  postNegativeComment,
);

export default commentRoutes;
