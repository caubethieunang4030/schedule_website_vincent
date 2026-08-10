import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] || "8083";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err?: any) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Feedback Service listening");
});
