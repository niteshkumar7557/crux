import { Router } from "express";
import { togglePin, setDotd } from "../controllers/admin.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.js";

const adminRoutes = Router();

// Guard the whole router, not each route: a future admin endpoint added
// without its own guard would otherwise ship wide open.
adminRoutes.use(authMiddleware, requireRole("admin"));

adminRoutes.post("/pin/:id", togglePin);
adminRoutes.post("/dotd/:id", setDotd);

export default adminRoutes;
