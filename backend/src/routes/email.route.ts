// Email preferences, one-click unsubscribe, and the SES event feed.

import { Router } from "express";
import {
  getEmailPrefs,
  updateEmailPrefs,
  unsubscribeByToken,
} from "../controllers/emailPrefs.controller.js";
import { handleSesEvent } from "../controllers/sesWebhook.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

const emailRoutes = Router();

emailRoutes.get("/prefs", authMiddleware, getEmailPrefs);
emailRoutes.patch("/prefs", authMiddleware, updateEmailPrefs);

// Deliberately unauthenticated, and deliberately answering both verbs: the
// footer link is a GET a human clicks, and List-Unsubscribe-Post is a POST a
// mail provider makes with no session. Requiring a login for either is how an
// unsubscribe becomes a spam complaint.
emailRoutes.get("/unsubscribe/:token", unsubscribeByToken);
emailRoutes.post("/unsubscribe/:token", unsubscribeByToken);

export const webhookRoutes = Router();

// SNS posts with Content-Type text/plain, so this group parses text and the
// handler narrows it. Mounted separately from the API for that reason.
webhookRoutes.post("/ses", handleSesEvent);

export default emailRoutes;
