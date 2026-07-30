import { Router } from "express";
import {
  addNewUser,
  generateNewAccess,
  getUserInfo,
  loginUser,
  logoutUser,
} from "../controllers/users.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { authLimiter } from "../middlewares/rateLimit.js";

const userRoutes = Router();

userRoutes.post("/register", authLimiter, addNewUser);
userRoutes.post("/login", authLimiter, loginUser);

userRoutes.post("/refresh", generateNewAccess);

userRoutes.get("/me", authMiddleware, getUserInfo);
userRoutes.post("/logout", authMiddleware, logoutUser);

export default userRoutes;
