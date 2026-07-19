import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  listNotifications,
  markRead,
} from "../controllers/notification.controller.js";

const notificationRoutes = Router();

notificationRoutes.get("/", authMiddleware, listNotifications);
notificationRoutes.post("/read", authMiddleware, markRead);

export default notificationRoutes;
