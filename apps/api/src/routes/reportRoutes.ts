import { Router } from "express";

import type { ReportPeriodType, ReportSalesQuery } from "@coffee-shop/shared/contracts/api";
import type { OrderStatus } from "@coffee-shop/shared/domain/types";

import { requireStaff } from "../auth/requireStaff";
import { getSalesReport } from "../domain/reportingService";
import { notImplementedHandler } from "./errors";
import { reportOrdersQuerySchema, reportSalesQuerySchema } from "./validators";

export function createReportRoutes(): Router {
  const router = Router();

  router.get("/reports/sales", requireStaff, async (request, response, next) => {
    try {
      const query = reportSalesQuerySchema.parse(request.query);
      const report = await getSalesReport(toReportSalesQuery(query));
      response.json(report);
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

function toReportSalesQuery(parsed: {
  startDate?: string | undefined;
  endDate?: string | undefined;
  period?: ReportPeriodType | undefined;
  statuses?: OrderStatus[] | undefined;
  menuCategoryId?: string | undefined;
  menuItemId?: string | undefined;
}): ReportSalesQuery {
  const query: ReportSalesQuery = {};

  if (parsed.startDate !== undefined) {
    query.startDate = parsed.startDate;
  }

  if (parsed.endDate !== undefined) {
    query.endDate = parsed.endDate;
  }

  if (parsed.period !== undefined) {
    query.period = parsed.period;
  }

  if (parsed.statuses !== undefined) {
    query.statuses = parsed.statuses;
  }

  if (parsed.menuCategoryId !== undefined) {
    query.menuCategoryId = parsed.menuCategoryId;
  }

  if (parsed.menuItemId !== undefined) {
    query.menuItemId = parsed.menuItemId;
  }

  return query;
}
