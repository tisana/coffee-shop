import { createServer } from "node:http";

import { createApp } from "./app";
import { closeDatabase } from "./storage/db";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

const server = createServer(createApp());

server.listen(port, host, () => {
  console.warn(`API listening on http://${host}:${port}`);
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  console.warn(`${signal} received. Shutting down API.`);

  server.close(async (error?: Error) => {
    await closeDatabase();

    if (error) {
      console.error("HTTP server shutdown failed.", error);
      process.exit(1);
    }

    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
