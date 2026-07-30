// Admin only — requireRole guards the whole group.

import { Router } from "express";
import { togglePin, setMotd } from "../controllers/admin.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.js";

const adminRoutes = Router();

adminRoutes.use(authMiddleware, requireRole("admin"));

adminRoutes.post("/pin/:id", togglePin);
adminRoutes.post("/motd/:id", setMotd);

export default adminRoutes;
