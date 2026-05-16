import { Router } from "express";

import { requireStaff } from "../auth/requireStaff";
import { claimQueuedOrder } from "../domain/queueClaimService";
import { listActiveQueueOrders } from "../domain/queueService";
import { badRequest } from "./errors";

export function createQueueRoutes(): Router {
  const router = Router();

  router.get("/queue/orders", requireStaff, async (_request, response, next) => {
    try {
      const orders = await listActiveQueueOrders();
      response.json({ orders });
    } catch (error) {
      next(error);
    }
  });

  router.post("/queue/orders/:orderId/claim", requireStaff, async (request, response, next) => {
    try {
      const staff = request.staff;

      if (!staff) {
        throw new Error("Staff middleware did not attach staff.");
      }

      const { orderId } = request.params;

      if (typeof orderId !== "string") {
        throw badRequest("Order id is required.");
      }

      const order = await claimQueuedOrder(orderId, staff.id);
      response.json(order);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
