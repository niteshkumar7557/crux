// Admin only — requireRole guards the whole group.

import { Router } from "express";
import {
  togglePin,
  setMotd,
  broadcastPreview,
  sendBroadcast,
} from "../controllers/admin.controller.js";
import { listBlocks, liftBlock } from "../controllers/block.controller.js";
import { draftSocialCopy } from "../controllers/social.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.js";

const adminRoutes = Router();

adminRoutes.use(authMiddleware, requireRole("admin"));

adminRoutes.post("/pin/:id", togglePin);
adminRoutes.post("/motd/:id", setMotd);
adminRoutes.get("/blocks", listBlocks);
adminRoutes.post("/blocks/:id/lift", liftBlock);

adminRoutes.get("/broadcast/preview", broadcastPreview);
adminRoutes.post("/broadcast", sendBroadcast);

// The frontend's render route has no JWT secret and should not be given one, so
// it forwards the caller's bearer token here to ask whether it is talking to an
// admin. No logic, so no controller: the router's own guard is the whole answer.
adminRoutes.get("/social/session", (_req, res) => {
  res.status(200).json({ ok: true });
});

adminRoutes.post("/social/copy", draftSocialCopy);

export default adminRoutes;
