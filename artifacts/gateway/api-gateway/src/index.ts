import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { pino } from "pino";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

app.use(cors({ credentials: true, origin: true }));

// Routing proxies for microservices
app.use(
  "/api/users",
  createProxyMiddleware({
    target: "http://localhost:8081/api/users",
    changeOrigin: true,
  })
);

app.use(
  "/api/me",
  createProxyMiddleware({
    target: "http://localhost:8081/api/me",
    changeOrigin: true,
  })
);

app.use(
  "/api/students",
  createProxyMiddleware({
    target: "http://localhost:8081/api/students",
    changeOrigin: true,
  })
);

app.use(
  "/api/sessions",
  createProxyMiddleware({
    target: "http://localhost:8082/api/sessions",
    changeOrigin: true,
  })
);

app.use(
  "/api/me/registrations",
  createProxyMiddleware({
    target: "http://localhost:8082/api/me/registrations",
    changeOrigin: true,
  })
);

app.use(
  "/api/feedback",
  createProxyMiddleware({
    target: "http://localhost:8083/api/feedback",
    changeOrigin: true,
  })
);

app.use(
  "/api/forms",
  createProxyMiddleware({
    target: "http://localhost:8083/api/forms",
    changeOrigin: true,
  })
);

app.use(
  "/api/tasks",
  createProxyMiddleware({
    target: "http://localhost:8084/api/tasks",
    changeOrigin: true,
  })
);

app.use(
  "/api/notifications",
  createProxyMiddleware({
    target: "http://localhost:8085/api/notifications",
    changeOrigin: true,
  })
);

app.use(
  "/api/dashboard",
  createProxyMiddleware({
    target: "http://localhost:8085/api/dashboard",
    changeOrigin: true,
  })
);

// Health check directly at the gateway level
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

const port = Number(process.env.PORT) || 8080;
app.listen(port, (err?: any) => {
  if (err) {
    logger.error({ err }, "Gateway failed to start");
    process.exit(1);
  }
  logger.info({ port }, "API Gateway running");
});
