import { Router } from "express";
import {
  getArguments,
  postAffirmativeArgument,
  postNegativeArgument,
} from "../controllers/argument.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { llmLimiter } from "../middlewares/rateLimit.js";

// Mounted at /motion, so `:id` is always the MOTION these arguments belong to.
// Nesting is the point: a flat /argument/:id would take a motion id and lie
// about it — exactly the confusion this rename exists to remove.
const argumentRoutes = Router();

argumentRoutes.get("/:id/arguments", getArguments);

// Posting argues as YOU — identity comes from the verified token, never the
// body (closes the impersonation gap in CODEBASE_GUIDE §9). Auth first so the
// limiter can key by user id.
argumentRoutes.post(
  "/:id/arguments/affirmative",
  authMiddleware,
  llmLimiter,
  postAffirmativeArgument,
);
argumentRoutes.post(
  "/:id/arguments/negative",
  authMiddleware,
  llmLimiter,
  postNegativeArgument,
);

export default argumentRoutes;
