import { Router, type IRouter } from "express";
import sessionsRouter from "./sessions/sessions.routes";

const router: IRouter = Router();

router.use(sessionsRouter);

export default router;
