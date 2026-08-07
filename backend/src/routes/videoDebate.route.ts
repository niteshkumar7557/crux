import { Router } from "express";
import {
  getVideoDebateBySlug,
  getVideoDebateCaptions,
  getVideoDebateSitemap,
  listVideoDebates,
  postVideoDebateAccess,
  recordVideoPlaybackEvent,
} from "../controllers/videoDebate.controller.js";
import { requireVideoPass } from "../middlewares/videoPass.js";
import { authLimiter } from "../middlewares/rateLimit.js";

const videoDebateRoutes = Router();

// The one open route. authLimiter is AUTH_LIMIT — ten attempts per fifteen
// minutes per IP — because this is a credential endpoint like the others behind it.
videoDebateRoutes.post("/access", authLimiter, postVideoDebateAccess);

videoDebateRoutes.get("/", requireVideoPass, listVideoDebates);
videoDebateRoutes.get("/sitemap", requireVideoPass, getVideoDebateSitemap);
videoDebateRoutes.get("/:slug/captions.vtt", requireVideoPass, getVideoDebateCaptions);
videoDebateRoutes.post("/:slug/playback-events", requireVideoPass, recordVideoPlaybackEvent);
videoDebateRoutes.get("/:slug", requireVideoPass, getVideoDebateBySlug);

export default videoDebateRoutes;
