import { Router } from "express";

import type { OrderHistoryQuery } from "@coffee-shop/shared/contracts/api";

import { requireStaff } from "../auth/requireStaff";
import { listCurrentDayOrderHistory } from "../domain/orderHistoryService";
import { historyQuerySchema } from "./validators";

export function createOrderHistoryRoutes(): Router {
  const router = Router();

  router.get("/orders/history", requireStaff, async (request, response, next) => {
    try {
      const parsedQuery = historyQuerySchema.parse(request.query);
      const query: OrderHistoryQuery = {};

      if (parsedQuery.dailyOrderNumber !== undefined) {
        query.dailyOrderNumber = parsedQuery.dailyOrderNumber;
      }

      if (parsedQuery.status !== undefined) {
        query.status = parsedQuery.status;
      }

      if (parsedQuery.pickupName !== undefined) {
        query.pickupName = parsedQuery.pickupName;
      }

      const orders = await listCurrentDayOrderHistory(query);

      response.json({ orders });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
