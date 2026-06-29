import { and, asc, gte, inArray, lte, eq } from "drizzle-orm";

import type {
  OverallReportTotals,
  ReportFilter,
  ReportPeriodSummary,
  ReportPeriodType,
  ReportSalesQuery,
  ReportSalesResponse
} from "@coffee-shop/shared/contracts/api";
import type { Order, OrderBeverage, OrderStatus } from "@coffee-shop/shared/domain/types";

import { db } from "../storage/db";
import { menuItems, orderBeverages, orders } from "../storage/schema";
import { currentBusinessDate } from "./businessDate";
import { mapOrder } from "./orderMapper";

export interface ReportPeriod {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  partial: boolean;
  period: ReportPeriodType;
}

export interface ReportPeriodInput {
  startDate: string;
  endDate: string;
  period: ReportPeriodType;
}

export interface BeverageLineTotalInput {
  priceSnapshot: string;
  quantity: number;
}

export interface SalesReportAggregationInput {
  filter: ReportFilter;
  orders: Order[];
  generatedAt?: string;
  matchingMenuItemIds?: ReadonlySet<string> | undefined;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_REPORT_STATUSES: OrderStatus[] = ["completed", "picked_up"];
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC"
});

export function parseMoney(value: string): number {
  return Number(value);
}

export function addMoney(left: string, right: string): string {
  return (parseMoney(left) + parseMoney(right)).toFixed(2);
}

export function calculateBeverageLineTotal(input: BeverageLineTotalInput): string {
  return (parseMoney(input.priceSnapshot) * input.quantity).toFixed(2);
}

export function compareReportDates(left: string, right: string): number {
  return left.localeCompare(right);
}

export function buildReportPeriods(input: ReportPeriodInput): ReportPeriod[] {
  if (compareReportDates(input.startDate, input.endDate) > 0) {
    return [];
  }

  if (input.period === "daily") {
    return buildDailyPeriods(input.startDate, input.endDate);
  }

  if (input.period === "weekly") {
    return buildWeeklyPeriods(input.startDate, input.endDate);
  }

  return buildMonthlyPeriods(input.startDate, input.endDate);
}

export function normalizeReportFilter(query: ReportSalesQuery): ReportFilter {
  const fallbackDate = query.startDate ?? query.endDate ?? currentBusinessDate();
  const startDate = query.startDate ?? fallbackDate;
  const endDate = query.endDate ?? fallbackDate;

  return {
    startDate,
    endDate,
    period: query.period ?? "daily",
    statuses: query.statuses ?? DEFAULT_REPORT_STATUSES,
    menuCategoryId: query.menuCategoryId ?? null,
    menuItemId: query.menuItemId ?? null
  };
}

export async function getSalesReport(query: ReportSalesQuery): Promise<ReportSalesResponse> {
  const filter = normalizeReportFilter(query);
  const matchingMenuItemIds = await resolveMatchingMenuItemIds(filter);
  const reportOrders = await listReportOrders(filter);

  return aggregateSalesReport({
    filter,
    orders: reportOrders,
    generatedAt: new Date().toISOString(),
    matchingMenuItemIds
  });
}

export function aggregateSalesReport(input: SalesReportAggregationInput): ReportSalesResponse {
  const periods = buildReportPeriods(input.filter).map((period) =>
    summarizePeriod(
      period,
      input.orders,
      input.filter,
      input.matchingMenuItemIds
    )
  );
  const overall = summarizeOrders(input.orders, input.filter, input.matchingMenuItemIds);

  return {
    filters: input.filter,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    overall,
    periods,
    popularItems: [],
    popularCombinations: []
  };
}

async function listReportOrders(filter: ReportFilter): Promise<Order[]> {
  const orderRows = await db
    .select()
    .from(orders)
    .where(
      and(
        gte(orders.businessDate, filter.startDate),
        lte(orders.businessDate, filter.endDate),
        inArray(orders.status, filter.statuses)
      )
    )
    .orderBy(asc(orders.businessDate), asc(orders.dailyOrderNumber));

  if (orderRows.length === 0) {
    return [];
  }

  const beverageRows = await db
    .select()
    .from(orderBeverages)
    .where(
      inArray(
        orderBeverages.orderId,
        orderRows.map((order) => order.id)
      )
    );
  const beveragesByOrderId = new Map<string, typeof beverageRows>();

  for (const beverage of beverageRows) {
    const existing = beveragesByOrderId.get(beverage.orderId) ?? [];
    existing.push(beverage);
    beveragesByOrderId.set(beverage.orderId, existing);
  }

  return orderRows.map((order) => mapOrder(order, beveragesByOrderId.get(order.id) ?? []));
}

async function resolveMatchingMenuItemIds(filter: ReportFilter): Promise<ReadonlySet<string> | undefined> {
  if (filter.menuItemId) {
    return new Set([filter.menuItemId]);
  }

  if (!filter.menuCategoryId) {
    return undefined;
  }

  const rows = await db
    .select({ id: menuItems.id })
    .from(menuItems)
    .where(eq(menuItems.categoryId, filter.menuCategoryId));

  return new Set(rows.map((row) => row.id));
}

function summarizePeriod(
  period: ReportPeriod,
  ordersToSummarize: Order[],
  filter: ReportFilter,
  matchingMenuItemIds: ReadonlySet<string> | undefined
): ReportPeriodSummary {
  const periodOrders = ordersToSummarize.filter(
    (order) => order.businessDate >= period.startDate && order.businessDate <= period.endDate
  );
  const summary = summarizeOrders(periodOrders, filter, matchingMenuItemIds);

  return {
    key: period.key,
    label: period.label,
    startDate: period.startDate,
    endDate: period.endDate,
    partial: period.partial,
    ...summary
  };
}

function summarizeOrders(
  ordersToSummarize: Order[],
  filter: ReportFilter,
  matchingMenuItemIds: ReadonlySet<string> | undefined
): OverallReportTotals {
  let totalSalesCents = 0;
  let orderCount = 0;
  const itemTotals = new Map<string, { name: string; quantity: number; salesCents: number }>();

  for (const order of ordersToSummarize) {
    if (!filter.statuses.includes(order.status)) {
      continue;
    }

    if (order.businessDate < filter.startDate || order.businessDate > filter.endDate) {
      continue;
    }

    const reportableBeverages = order.beverages.filter((beverage) =>
      isReportableBeverage(beverage, matchingMenuItemIds)
    );
    const orderSalesCents = reportableBeverages.reduce(
      (sum, beverage) => sum + calculateBeverageLineTotalCents(beverage),
      0
    );

    if (orderSalesCents === 0) {
      continue;
    }

    totalSalesCents += orderSalesCents;
    orderCount += 1;

    for (const beverage of reportableBeverages) {
      const lineSalesCents = calculateBeverageLineTotalCents(beverage);
      const existing = itemTotals.get(beverage.nameSnapshot) ?? {
        name: beverage.nameSnapshot,
        quantity: 0,
        salesCents: 0
      };

      existing.quantity += beverage.quantity;
      existing.salesCents += lineSalesCents;
      itemTotals.set(beverage.nameSnapshot, existing);
    }
  }

  const topSellingItem = Array.from(itemTotals.values()).sort((left, right) => {
    if (left.quantity !== right.quantity) {
      return right.quantity - left.quantity;
    }

    if (left.salesCents !== right.salesCents) {
      return right.salesCents - left.salesCents;
    }

    return left.name.localeCompare(right.name);
  })[0];

  return {
    totalSales: formatMoneyCents(totalSalesCents),
    orderCount,
    averageOrderValue: formatMoneyCents(orderCount > 0 ? Math.round(totalSalesCents / orderCount) : 0),
    topSellingItemName: topSellingItem?.name ?? null,
    topSellingItemQuantity: topSellingItem?.quantity ?? null
  };
}

function isReportableBeverage(
  beverage: OrderBeverage,
  matchingMenuItemIds: ReadonlySet<string> | undefined
): boolean {
  if (beverage.status === "cancelled") {
    return false;
  }

  return matchingMenuItemIds === undefined || matchingMenuItemIds.has(beverage.sourceMenuItemId);
}

function calculateBeverageLineTotalCents(input: BeverageLineTotalInput): number {
  return moneyToCents(input.priceSnapshot) * input.quantity;
}

function moneyToCents(value: string): number {
  return Math.round(parseMoney(value) * 100);
}

function formatMoneyCents(value: number): string {
  return (value / 100).toFixed(2);
}

function buildDailyPeriods(startDate: string, endDate: string): ReportPeriod[] {
  const periods: ReportPeriod[] = [];

  for (let date = parseReportDate(startDate); toIsoDate(date) <= endDate; date = addDays(date, 1)) {
    const businessDate = toIsoDate(date);

    periods.push({
      key: businessDate,
      label: businessDate,
      startDate: businessDate,
      endDate: businessDate,
      partial: false,
      period: "daily"
    });
  }

  return periods;
}

function buildWeeklyPeriods(startDate: string, endDate: string): ReportPeriod[] {
  const periods: ReportPeriod[] = [];
  const selectedStart = parseReportDate(startDate);
  const selectedEnd = parseReportDate(endDate);

  for (
    let weekStart = startOfMondayWeek(selectedStart);
    weekStart <= selectedEnd;
    weekStart = addDays(weekStart, 7)
  ) {
    const weekEnd = addDays(weekStart, 6);
    const clippedStart = maxDate(weekStart, selectedStart);
    const clippedEnd = minDate(weekEnd, selectedEnd);

    periods.push({
      key: `${weekYear(weekStart)}-W${String(isoWeekNumber(weekStart)).padStart(2, "0")}`,
      label: `${formatShortMonthDay(weekStart)}-${weekEnd.getUTCDate()}, ${weekEnd.getUTCFullYear()}`,
      startDate: toIsoDate(clippedStart),
      endDate: toIsoDate(clippedEnd),
      partial: clippedStart.getTime() !== weekStart.getTime() || clippedEnd.getTime() !== weekEnd.getTime(),
      period: "weekly"
    });
  }

  return periods;
}

function buildMonthlyPeriods(startDate: string, endDate: string): ReportPeriod[] {
  const periods: ReportPeriod[] = [];
  const selectedStart = parseReportDate(startDate);
  const selectedEnd = parseReportDate(endDate);

  for (
    let monthStart = new Date(Date.UTC(selectedStart.getUTCFullYear(), selectedStart.getUTCMonth(), 1));
    monthStart <= selectedEnd;
    monthStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1))
  ) {
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
    const clippedStart = maxDate(monthStart, selectedStart);
    const clippedEnd = minDate(monthEnd, selectedEnd);
    const month = String(monthStart.getUTCMonth() + 1).padStart(2, "0");

    periods.push({
      key: `${monthStart.getUTCFullYear()}-${month}`,
      label: `${monthFormatter.format(monthStart)} ${monthStart.getUTCFullYear()}`,
      startDate: toIsoDate(clippedStart),
      endDate: toIsoDate(clippedEnd),
      partial:
        clippedStart.getTime() !== monthStart.getTime() || clippedEnd.getTime() !== monthEnd.getTime(),
      period: "monthly"
    });
  }

  return periods;
}

function parseReportDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Invalid report date ${value}.`);
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * MS_PER_DAY);
}

function startOfMondayWeek(value: Date): Date {
  const day = value.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(value, offset);
}

function isoWeekNumber(value: Date): number {
  const thursday = addDays(startOfMondayWeek(value), 3);
  const firstThursday = addDays(
    startOfMondayWeek(new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4))),
    3
  );

  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY));
}

function weekYear(value: Date): number {
  return addDays(startOfMondayWeek(value), 3).getUTCFullYear();
}

function formatShortMonthDay(value: Date): string {
  return `${monthFormatter.format(value)} ${value.getUTCDate()}`;
}

function maxDate(left: Date, right: Date): Date {
  return left > right ? left : right;
}

function minDate(left: Date, right: Date): Date {
  return left < right ? left : right;
}
