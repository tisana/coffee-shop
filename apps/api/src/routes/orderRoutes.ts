import { Router } from "express";

import { requireStaff } from "../auth/requireStaff";
import { createOrderForStaff } from "../domain/orderCreationService";
import { createOrderWithLoyaltyRequestSchema } from "./validators";

export function createOrderRoutes(): Router {
  const router = Router();

  router.post("/orders", requireStaff, async (request, response, next) => {
    try {
      const body = createOrderWithLoyaltyRequestSchema.parse(request.body);
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

  return router;
}
