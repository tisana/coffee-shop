import { Router } from "express";

import { requireStaff } from "../auth/requireStaff";
import { notImplementedHandler } from "./errors";

export function createQueueRoutes(): Router {
  const router = Router();

  router.get("/queue/orders", requireStaff, notImplementedHandler);
  router.post("/queue/orders/:orderId/claim", requireStaff, notImplementedHandler);

  return router;
}
