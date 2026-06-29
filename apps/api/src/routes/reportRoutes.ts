import { Router } from "express";

import { requireStaff } from "../auth/requireStaff";
import { notImplementedHandler } from "./errors";
import { reportOrdersQuerySchema, reportSalesQuerySchema } from "./validators";

export function createReportRoutes(): Router {
  const router = Router();

  router.get("/reports/sales", requireStaff, (request, response, next) => {
    try {
      reportSalesQuerySchema.parse(request.query);
      notImplementedHandler(request, response);
    } catch (error) {
      next(error);
    }
  });

  router.get("/reports/orders", requireStaff, (request, response, next) => {
    try {
      reportOrdersQuerySchema.parse(request.query);
      notImplementedHandler(request, response);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
