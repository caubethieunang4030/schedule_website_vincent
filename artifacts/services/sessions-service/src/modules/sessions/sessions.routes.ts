import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../../lib/auth";
import { SessionsController } from "./sessions.controller";

const router: IRouter = Router();
const controller = new SessionsController();

router.use(requireAuth);

router.get("/sessions", controller.listSessions.bind(controller));
router.post(
  "/sessions",
  requireRole("faculty", "organizer", "admin"),
  controller.createSession.bind(controller)
);
router.get("/sessions/export/calendar", controller.exportCalendar.bind(controller));
router.get("/sessions/:id", controller.getSessionById.bind(controller));
router.patch(
  "/sessions/:id",
  requireRole("faculty", "organizer", "admin"),
  controller.updateSession.bind(controller)
);
router.delete(
  "/sessions/:id",
  requireRole("faculty", "organizer", "admin"),
  controller.deleteSession.bind(controller)
);

router.post("/sessions/:id/register", controller.registerSession.bind(controller));
router.delete("/sessions/:id/register", controller.unregisterSession.bind(controller));
router.post("/sessions/:id/checkin", controller.checkinSession.bind(controller));
router.get("/sessions/:id/attendance", controller.getAttendance.bind(controller));

router.get("/me/registrations", controller.getMyRegistrations.bind(controller));

export default router;
