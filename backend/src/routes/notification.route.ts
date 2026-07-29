import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  listNotifications,
  markRead,
  clearNotifications,
} from "../controllers/notification.controller.js";

const notificationRoutes = Router();

notificationRoutes.get("/", authMiddleware, listNotifications);
notificationRoutes.post("/read", authMiddleware, markRead);
notificationRoutes.delete("/", authMiddleware, clearNotifications);

export default notificationRoutes;
