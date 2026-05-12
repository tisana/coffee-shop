import cookieParser from "cookie-parser";
import express, { type Express } from "express";

import { createAuthRoutes } from "./routes/authRoutes";
import { errorHandler } from "./routes/errors";
import { createMenuRoutes } from "./routes/menuRoutes";
import { createOrderRoutes } from "./routes/orderRoutes";
import { createQueueRoutes } from "./routes/queueRoutes";
import { createQueueSubmissionRoutes } from "./routes/queueSubmissionRoutes";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.use(createAuthRoutes());
  app.use(createMenuRoutes());
  app.use(createOrderRoutes());
  app.use(createQueueSubmissionRoutes());
  app.use(createQueueRoutes());
  app.use(errorHandler);

  return app;
}
