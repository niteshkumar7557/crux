import { Router } from "express";
import {
  registerLike,
  removeLike,
  listMyLikes,
} from "../controllers/like.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

const likeRoutes = Router();

likeRoutes.post("/", authMiddleware, registerLike);
likeRoutes.delete("/", authMiddleware, removeLike);
likeRoutes.get("/mine/:argumentId", authMiddleware, listMyLikes);

export default likeRoutes;
