import { Router } from "express";

import type {
  ReportOrdersQuery,
  ReportSalesQuery,
  ReportPeriodType
} from "@coffee-shop/shared/contracts/api";
import type { OrderStatus } from "@coffee-shop/shared/domain/types";

import { requireStaff } from "../auth/requireStaff";
import { notImplementedHandler } from "./errors";
import { reportOrdersQuerySchema, reportSalesQuerySchema } from "./validators";

export function createReportRoutes(): Router {
  const router = Router();

  router.get("/reports/sales", requireStaff, (request, response, next) => {
    try {
      const query = toReportSalesQuery(reportSalesQuerySchema.parse(request.query));
      request.query = query as typeof request.query;
      notImplementedHandler(request, response);
    } catch (error) {
      next(error);
    }
  });

  router.get("/reports/orders", requireStaff, (request, response, next) => {
    try {
      const query = toReportOrdersQuery(reportOrdersQuerySchema.parse(request.query));
      request.query = query as typeof request.query;
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

  if (parsed.period !== undefined) {
    query.period = parsed.period;
  }

  if (parsed.statuses !== undefined) {
    query.statuses = parsed.statuses;
  }

  if (parsed.startDate !== undefined) {
    query.startDate = parsed.startDate;
  }

  if (parsed.endDate !== undefined) {
    query.endDate = parsed.endDate;
  }

  if (parsed.menuCategoryId !== undefined) {
    query.menuCategoryId = parsed.menuCategoryId;
  }

  if (parsed.menuItemId !== undefined) {
    query.menuItemId = parsed.menuItemId;
  }

  return query;
}

function toReportOrdersQuery(parsed: ReturnType<typeof reportOrdersQuerySchema.parse>): ReportOrdersQuery {
  const query: ReportOrdersQuery = toReportSalesQuery(parsed);

  if (parsed.periodKey !== undefined) {
    query.periodKey = parsed.periodKey;
  }

  if (parsed.combinationKey !== undefined) {
    query.combinationKey = parsed.combinationKey;
  }

  return query;
}
