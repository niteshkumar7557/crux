import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { dmLimiter } from "../middlewares/rateLimit.js";
import {
  listMessages,
  sendDevMessage,
  markMessagesRead,
} from "../controllers/devMessage.controller.js";

const devMessageRoutes = Router();

// Every route is authenticated: there is no anonymous thread, and the user id
// always comes from the token rather than the request body.
devMessageRoutes.get("/", authMiddleware, listMessages);
// The limiter sits after auth so it can key on the user id, and it guards the
// only route here that writes — and that hits an external API.
devMessageRoutes.post("/", authMiddleware, dmLimiter, sendDevMessage);
devMessageRoutes.post("/read", authMiddleware, markMessagesRead);

export default devMessageRoutes;
