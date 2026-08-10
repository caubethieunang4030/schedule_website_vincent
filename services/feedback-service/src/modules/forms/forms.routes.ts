import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../../lib/auth";
import { FormsController } from "./forms.controller";

const router: IRouter = Router();
const controller = new FormsController();

router.use(requireAuth);

router.get("/forms", controller.listForms.bind(controller));
router.post(
  "/forms",
  requireRole("faculty", "organizer", "admin"),
  controller.createForm.bind(controller)
);
router.get("/forms/:id", controller.getFormById.bind(controller));
router.post("/forms/:id/responses", controller.submitFormResponse.bind(controller));
router.get("/forms/:id/responses", controller.listFormResponses.bind(controller));

export default router;
