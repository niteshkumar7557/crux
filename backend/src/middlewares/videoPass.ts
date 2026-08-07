// The shared-password gate on every public video-debate route.
//
// A disabled link is not a rule: the pages are unlisted, but this is what actually
// withholds the manifest, the rulings and the verdict.

import type { NextFunction, Request, Response } from "express";
import config from "../config/index.js";
import { VIDEO_PASS_COOKIE, videoPassAccepted } from "../video-debates/access.logic.js";

// Named, not anonymous: routeGuards.test.ts asserts this name on every route.
export function requireVideoPass(req: Request, res: Response, next: NextFunction) {
  if (videoPassAccepted(req.cookies?.[VIDEO_PASS_COOKIE], config.jwt_secret)) return next();
  // Identical to a wrong password, so a misconfigured deployment says nothing.
  return res.status(401).json({ error: "video_pass_required" });
}
