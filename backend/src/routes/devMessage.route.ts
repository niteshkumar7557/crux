import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { dmLimiter } from "../middlewares/rateLimit.js";
import {
  listMessages,
  sendDevMessage,
  markMessagesRead,
} from "../controllers/devMessage.controller.js";

const devMessageRoutes = Router();

devMessageRoutes.get("/", authMiddleware, listMessages);
devMessageRoutes.post("/", authMiddleware, dmLimiter, sendDevMessage);
devMessageRoutes.post("/read", authMiddleware, markMessagesRead);

export default devMessageRoutes;
