import { Router, type IRouter } from "express";
import notificationsRouter from "./notifications/notifications.routes";
import dashboardRouter from "./dashboard/dashboard.routes";

const router: IRouter = Router();

router.use(notificationsRouter);
router.use(dashboardRouter);

export default router;
