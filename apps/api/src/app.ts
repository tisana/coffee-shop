import cookieParser from "cookie-parser";
import express, { Router, type Express } from "express";

import { requireStaff } from "./auth/requireStaff";
import { errorHandler, notImplementedHandler } from "./routes/errors";

function createPlannedRoutes(): Router {
  const router = Router();

  router.post("/auth/login", notImplementedHandler);
  router.post("/auth/logout", requireStaff, notImplementedHandler);
  router.get("/staff/session", requireStaff, (request, response) => {
    response.json(request.staff);
  });

  router.get("/menu/categories", requireStaff, notImplementedHandler);
  router.post("/menu/items", requireStaff, notImplementedHandler);
  router.patch("/menu/items/:itemId", requireStaff, notImplementedHandler);

  router.post("/orders", requireStaff, notImplementedHandler);
  router.post("/orders/:orderId/queue", requireStaff, notImplementedHandler);
  router.get("/orders/history", requireStaff, notImplementedHandler);
  router.post("/orders/:orderId/complete", requireStaff, notImplementedHandler);
  router.post("/orders/:orderId/pickup", requireStaff, notImplementedHandler);
  router.post("/orders/:orderId/cancel", requireStaff, notImplementedHandler);
  router.post(
    "/orders/:orderId/beverages/:beverageId/complete",
    requireStaff,
    notImplementedHandler
  );
  router.post(
    "/orders/:orderId/beverages/:beverageId/cancel",
    requireStaff,
    notImplementedHandler
  );

  router.get("/queue/orders", requireStaff, notImplementedHandler);
  router.post("/queue/orders/:orderId/claim", requireStaff, notImplementedHandler);

  return router;
}

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.use(createPlannedRoutes());
  app.use(errorHandler);

  return app;
}
