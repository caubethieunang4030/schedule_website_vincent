import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import app from "./app";

setGlobalOptions({
  region: "us-central1",
  memory: "512MiB",
  timeoutSeconds: 60,
  maxInstances: 20,
});

export const api = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  app,
);
