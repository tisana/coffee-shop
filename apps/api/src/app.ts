import cookieParser from "cookie-parser";
import csrf from "csurf";
import express, { type Express } from "express";

import { createAuthRoutes } from "./routes/authRoutes";
import { errorHandler } from "./routes/errors";
import { createMenuRoutes } from "./routes/menuRoutes";
import { createLoyaltyCustomerRoutes } from "./routes/loyaltyCustomerRoutes";
import { createOrderFulfillmentRoutes } from "./routes/orderFulfillmentRoutes";
import { createOrderHistoryRoutes } from "./routes/orderHistoryRoutes";
import { createOrderRoutes } from "./routes/orderRoutes";
import { createQueueRoutes } from "./routes/queueRoutes";
import { createQueueSubmissionRoutes } from "./routes/queueSubmissionRoutes";
import { createReportRoutes } from "./routes/reportRoutes";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(
    csrf({
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/"
      },
      value: (request) => request.header("X-CSRF-Token") ?? ""
    })
  );

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.use(createAuthRoutes());
  app.use(createMenuRoutes());
  app.use(createLoyaltyCustomerRoutes());
  app.use(createOrderRoutes());
  app.use(createOrderHistoryRoutes());
  app.use(createQueueSubmissionRoutes());
  app.use(createOrderFulfillmentRoutes());
  app.use(createQueueRoutes());
  app.use(createReportRoutes());
  app.use(errorHandler);

  return app;
}
