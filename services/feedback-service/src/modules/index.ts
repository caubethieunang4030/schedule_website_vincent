import { Router, type IRouter } from "express";
import feedbackRouter from "./feedback/feedback.routes";
import formsRouter from "./forms/forms.routes";

const router: IRouter = Router();

router.use(feedbackRouter);
router.use(formsRouter);

export default router;
