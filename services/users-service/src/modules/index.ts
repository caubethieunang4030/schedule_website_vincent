import { Router, type IRouter } from "express";
import usersRouter from "./users/users.routes";
import studentsRouter from "./students/students.routes";

const router: IRouter = Router();

router.use(usersRouter);
router.use(studentsRouter);

export default router;
