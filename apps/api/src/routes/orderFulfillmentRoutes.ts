import { Router } from "express";

import { requireStaff } from "../auth/requireStaff";
import { cancelOrderBeverage, completeOrderBeverage } from "../domain/beverageService";
import { cancelOrder, completeOrder, confirmOrderPickup } from "../domain/orderFulfillmentService";
import {
  beverageCancelRequestSchema,
  beverageParamsSchema,
  orderIdParamsSchema
} from "./validators";

export function createOrderFulfillmentRoutes(): Router {
  const router = Router();

  router.post("/orders/:orderId/complete", requireStaff, async (request, response, next) => {
    try {
      const params = orderIdParamsSchema.parse(request.params);
      const order = await completeOrder(params.orderId);
      response.json(order);
    } catch (error) {
      next(error);
    }
  });

  router.post("/orders/:orderId/pickup", requireStaff, async (request, response, next) => {
    try {
      const params = orderIdParamsSchema.parse(request.params);
      const order = await confirmOrderPickup(params.orderId);
      response.json(order);
    } catch (error) {
      next(error);
    }
  });

  router.post("/orders/:orderId/cancel", requireStaff, async (request, response, next) => {
    try {
      const params = orderIdParamsSchema.parse(request.params);
      const order = await cancelOrder(params.orderId);
      response.json(order);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/orders/:orderId/beverages/:beverageId/complete",
    requireStaff,
    async (request, response, next) => {
      try {
        const params = beverageParamsSchema.parse(request.params);
        const order = await completeOrderBeverage(params.orderId, params.beverageId);
        response.json(order);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/orders/:orderId/beverages/:beverageId/cancel",
    requireStaff,
    async (request, response, next) => {
      try {
        const params = beverageParamsSchema.parse(request.params);
        const body = beverageCancelRequestSchema.parse(request.body);
        const order = await cancelOrderBeverage(params.orderId, params.beverageId, body.reason);
        response.json(order);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
