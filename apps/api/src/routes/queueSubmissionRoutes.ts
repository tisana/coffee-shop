import { Router } from "express";

import { requireStaff } from "../auth/requireStaff";
import { submitOrderToQueue } from "../domain/queueSubmissionService";
import { orderIdParamsSchema } from "./validators";

export function createQueueSubmissionRoutes(): Router {
  const router = Router();

  router.post("/orders/:orderId/queue", requireStaff, async (request, response, next) => {
    try {
      const params = orderIdParamsSchema.parse(request.params);
      const order = await submitOrderToQueue(params.orderId);
      response.json(order);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
