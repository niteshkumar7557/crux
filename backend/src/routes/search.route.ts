import { Router } from "express";
import { searchAll } from "../controllers/search.controller.js";

const searchRoutes = Router();

searchRoutes.get("/", searchAll);

export default searchRoutes;
