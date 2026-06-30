import { Router, type IRouter } from "express";
import tasksRouter from "./tasks/tasks.routes";

const router: IRouter = Router();

router.use(tasksRouter);

export default router;
