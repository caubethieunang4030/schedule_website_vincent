import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../../lib/auth";
import { FeedbackController } from "./feedback.controller";

const router: IRouter = Router();
const controller = new FeedbackController();

router.use(requireAuth);

router.get(
  "/feedback/aggregate",
  requireRole("faculty", "organizer", "admin"),
  controller.getFeedbackAggregate.bind(controller)
);
router.get("/sessions/:id/feedback", controller.getSessionFeedback.bind(controller));
router.post("/sessions/:id/feedback", controller.createSessionFeedback.bind(controller));

export default router;
