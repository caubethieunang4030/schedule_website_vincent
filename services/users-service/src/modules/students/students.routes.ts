import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../../lib/auth";
import { StudentsController } from "./students.controller";

const router: IRouter = Router();
const controller = new StudentsController();

router.use(requireAuth);

router.get(
  "/students",
  requireRole("faculty", "organizer", "admin"),
  controller.listStudents.bind(controller)
);
router.post(
  "/students",
  requireRole("faculty", "organizer", "admin"),
  controller.importStudents.bind(controller)
);
router.delete(
  "/students/:id",
  requireRole("faculty", "organizer", "admin"),
  controller.deleteStudent.bind(controller)
);

export default router;
