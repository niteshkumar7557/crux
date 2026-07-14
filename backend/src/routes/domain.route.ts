import { Router } from "express";
import { getDomains } from "../controllers/domain.controller.js";

const domainRoutes = Router();

domainRoutes.get("/", getDomains);

export default domainRoutes;
