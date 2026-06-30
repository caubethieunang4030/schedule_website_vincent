import { Router, type IRouter } from "express";
import { requireAuth } from "../../lib/auth";
import { DashboardController } from "./dashboard.controller";

const router: IRouter = Router();
const controller = new DashboardController();

router.use(requireAuth);

router.get("/dashboard/summary", controller.getSummary.bind(controller));

export default router;
