import { Router, type IRouter } from "express";
import { requireAuth } from "../../lib/auth";
import { UsersController } from "./users.controller";

const router: IRouter = Router();
const controller = new UsersController();

router.use(requireAuth);

router.get("/me", controller.getMe.bind(controller));
router.patch("/me", controller.updateMe.bind(controller));
router.get("/users", controller.listUsers.bind(controller));

export default router;
