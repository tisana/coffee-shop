import { Router } from "express";

import type {
  ReportOrdersQuery,
  ReportPeriodType,
  ReportSalesQuery
} from "@coffee-shop/shared/contracts/api";
import type { OrderStatus } from "@coffee-shop/shared/domain/types";

import { requireStaff } from "../auth/requireStaff";
import { getReportOrders, getSalesReport } from "../domain/reportingService";
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

  router.get("/reports/orders", requireStaff, async (request, response, next) => {
    try {
      const query = reportOrdersQuerySchema.parse(request.query);
      const report = await getReportOrders(toReportOrdersQuery(query));
      response.json(report);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function toReportOrdersQuery(parsed: {
  startDate?: string | undefined;
  endDate?: string | undefined;
  period?: ReportPeriodType | undefined;
  statuses?: OrderStatus[] | undefined;
  menuCategoryId?: string | undefined;
  menuItemId?: string | undefined;
  periodKey?: string | undefined;
  combinationKey?: string | undefined;
}): ReportOrdersQuery {
  const query: ReportOrdersQuery = toReportSalesQuery(parsed);

  if (parsed.periodKey !== undefined) {
    query.periodKey = parsed.periodKey;
  }

  if (parsed.combinationKey !== undefined) {
    query.combinationKey = parsed.combinationKey;
  }

  return query;
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
