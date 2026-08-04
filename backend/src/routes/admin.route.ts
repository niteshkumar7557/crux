// Admin only — requireRole guards the whole group.

import { Router } from "express";
import {
  togglePin,
  setMotd,
  broadcastPreview,
  sendBroadcast,
} from "../controllers/admin.controller.js";
import { listBlocks, liftBlock } from "../controllers/block.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.js";

const adminRoutes = Router();

adminRoutes.use(authMiddleware, requireRole("admin"));

adminRoutes.post("/pin/:id", togglePin);
adminRoutes.post("/motd/:id", setMotd);
adminRoutes.get("/blocks", listBlocks);
adminRoutes.post("/blocks/:id/lift", liftBlock);

adminRoutes.get("/broadcast/preview", broadcastPreview);
adminRoutes.post("/broadcast", sendBroadcast);

export default adminRoutes;
