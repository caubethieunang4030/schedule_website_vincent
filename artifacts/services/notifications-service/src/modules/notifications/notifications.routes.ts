import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../../lib/auth";
import { NotificationsController } from "./notifications.controller";

const router: IRouter = Router();
const controller = new NotificationsController();

router.use(requireAuth);

router.get("/notifications", controller.listNotifications.bind(controller));
router.post(
  "/notifications",
  requireRole("faculty", "organizer", "admin"),
  controller.createNotification.bind(controller)
);

export default router;
