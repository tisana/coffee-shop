import { Router } from "express";

import { requireStaff } from "../auth/requireStaff";
import { createOrderForStaff } from "../domain/orderCreationService";
import { notImplementedHandler } from "./errors";
import { createOrderRequestSchema } from "./validators";

export function createOrderRoutes(): Router {
  const router = Router();

  router.post("/orders", requireStaff, async (request, response, next) => {
    try {
      const body = createOrderRequestSchema.parse(request.body);
      const staff = request.staff;

      if (!staff) {
        throw new Error("Staff middleware did not attach staff.");
      }

      const order = await createOrderForStaff(staff.id, body);
      response.status(201).json(order);
    } catch (error) {
      next(error);
    }
  });

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

  return router;
}
