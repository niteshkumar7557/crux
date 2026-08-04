import { Router } from "express";
import {
  addNewUser,
  generateNewAccess,
  getUserInfo,
  loginUser,
  logoutUser,
} from "../controllers/users.controller.js";
import {
  abandonGoogleSignup,
  completeGoogleSignup,
  googleAvailability,
  googleCallback,
  googleStatus,
  pendingGoogleSignup,
  snoozeGooglePrompt,
  startGoogleAuth,
  startGoogleLink,
} from "../controllers/googleAuth.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { authLimiter } from "../middlewares/rateLimit.js";

const userRoutes = Router();

userRoutes.post("/register", authLimiter, addNewUser);
userRoutes.post("/login", authLimiter, loginUser);

userRoutes.post("/refresh", generateNewAccess);

// Google sign-in. The two entry points and the signup finisher sit behind the
// same limiter as login — they mint sessions, so they are the same kind of door.
// The callback is deliberately NOT limited: it is Google returning a browser we
// already sent away, and a throttled callback strands a user mid-flow with no
// way to retry. It is protected by the one-use state cookie instead.
userRoutes.get("/auth/google", authLimiter, startGoogleAuth);
userRoutes.get("/auth/google/callback", googleCallback);
userRoutes.post("/auth/google/complete", authLimiter, completeGoogleSignup);
userRoutes.get("/auth/google/pending", pendingGoogleSignup);
userRoutes.post("/auth/google/abandon", abandonGoogleSignup);
userRoutes.get("/auth/google/available", googleAvailability);

userRoutes.post("/auth/google/link", authMiddleware, authLimiter, startGoogleLink);
userRoutes.get("/google/status", authMiddleware, googleStatus);
userRoutes.post("/google/snooze", authMiddleware, snoozeGooglePrompt);

userRoutes.get("/me", authMiddleware, getUserInfo);
userRoutes.post("/logout", authMiddleware, logoutUser);

export default userRoutes;
