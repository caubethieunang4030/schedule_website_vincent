import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../../lib/auth";
import { TasksController } from "./tasks.controller";

const router: IRouter = Router();
const controller = new TasksController();

router.use(requireAuth);

router.get("/tasks", controller.listTasks.bind(controller));
router.post("/tasks", controller.createTask.bind(controller));
router.patch("/tasks/:id", controller.updateTask.bind(controller));
router.delete(
  "/tasks/:id",
  requireRole("faculty", "organizer", "admin"),
  controller.deleteTask.bind(controller)
);
router.get("/tasks/export", controller.exportTasks.bind(controller));

// Checklist sub-item endpoints
router.post("/tasks/:id/checklists", controller.createChecklist.bind(controller));
router.patch("/tasks/:id/checklists/:checklistId", controller.updateChecklist.bind(controller));
router.delete("/tasks/:id/checklists/:checklistId", controller.deleteChecklist.bind(controller));

export default router;
