import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import usersRouter from "../../services/users-service/src/modules/index";
import sessionsRouter from "../../services/sessions-service/src/modules/index";
import feedbackRouter from "../../services/feedback-service/src/modules/index";
import tasksRouter from "../../services/tasks-service/src/modules/index";
import notificationsRouter from "../../services/notifications-service/src/modules/index";
import { errorHandler } from "../../services/users-service/src/middlewares/errorHandler";

const app: Express = express();

app.use((req, _res, next) => {
  if (req.url.startsWith("/api/api/")) {
    req.url = req.url.replace("/api/api", "/api");
  }
  next();
});

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.CLERK_PUBLISHABLE_KEY) {
  app.use("/api", clerkMiddleware());
}

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", service: "api-unified" });
});

app.use("/api", usersRouter);
app.use("/api", sessionsRouter);
app.use("/api", feedbackRouter);
app.use("/api", tasksRouter);
app.use("/api", notificationsRouter);

const publicDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../apps/summit/dist/public",
);
console.log("static dir", publicDir, fs.existsSync(publicDir));
app.use(express.static(publicDir));
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }
  if (req.path.startsWith("/api")) {
    next();
    return;
  }
  res.sendFile(path.join(publicDir, "index.html"), (err) => {
    if (err) next(err);
  });
});

app.use(errorHandler);

export default app;
