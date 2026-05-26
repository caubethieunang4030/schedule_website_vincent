import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import sessionsRouter from "./sessions";
import feedbackRouter from "./feedback";
import tasksRouter from "./tasks";
import formsRouter from "./forms";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";
import studentsRouter from "./students";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(sessionsRouter);
router.use(feedbackRouter);
router.use(tasksRouter);
router.use(formsRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);
router.use(studentsRouter);

export default router;
