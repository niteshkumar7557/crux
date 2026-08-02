// Arguments hang off the motion they belong to: /motion/:id/arguments.

import { Router } from "express";
import {
  getArguments,
  postAffirmativeArgument,
  postNegativeArgument,
} from "../controllers/argument.controller.js";
import { authMiddleware, optionalMiddleware } from "../middlewares/auth.js";
import { llmLimiter } from "../middlewares/rateLimit.js";

const argumentRoutes = Router();

argumentRoutes.get("/:id/arguments", optionalMiddleware, getArguments);

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
