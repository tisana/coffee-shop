export type ReportPeriodType = "daily" | "weekly" | "monthly";
export type ReportOrderStatus =
  | "created"
  | "queued"
  | "in_progress"
  | "completed"
  | "picked_up"
  | "cancelled";
export type ReportBeverageStatus = "pending" | "completed" | "cancelled";
export type Money = `${number}.${number}`;

export interface ReportFilter {
  startDate: string;
  endDate: string;
  period: ReportPeriodType;
  statuses: ReportOrderStatus[];
  menuCategoryId: string | null;
  menuItemId: string | null;
}

export interface OverallReportTotals {
  totalSales: Money;
  orderCount: number;
  averageOrderValue: Money;
  topSellingItemName: string | null;
  topSellingItemQuantity: number | null;
}

export interface ReportPeriodSummary extends OverallReportTotals {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  partial: boolean;
}

export interface PopularItemReport {
  rank: number;
  sourceMenuItemId: string;
  itemName: string;
  categoryName: string | null;
  quantitySold: number;
  orderCount: number;
  salesAmount: Money;
}

export interface PopularCombinationReport {
  rank: number;
  combinationKey: string;
  combinationLabel: string;
  orderFrequency: number;
  itemCount: number;
  salesAmount: Money;
}

export interface ReportSalesResponse {
  filters: ReportFilter;
  generatedAt: string;
  overall: OverallReportTotals;
  periods: ReportPeriodSummary[];
  popularItems: PopularItemReport[];
  popularCombinations: PopularCombinationReport[];
}

export interface ReportOrderItem {
  beverageId: string;
  sourceMenuItemId: string;
  name: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  status: ReportBeverageStatus;
  selectedCustomizations: string[];
}

export interface ReportOrderDetail {
  orderId: string;
  businessDate: string;
  dailyOrderNumber: number;
  status: ReportOrderStatus;
  capturedOrderTotal: Money;
  reportableTotal: Money;
  items: ReportOrderItem[];
  createdAt: string;
  completedAt: string | null;
  pickedUpAt: string | null;
}

export interface ReportOrdersResponse {
  filters: ReportFilter;
  orders: ReportOrderDetail[];
}

export function reportFilter(overrides: Partial<ReportFilter> = {}): ReportFilter {
  return {
    startDate: overrides.startDate ?? "2026-06-25",
    endDate: overrides.endDate ?? "2026-06-25",
    period: overrides.period ?? "daily",
    statuses: overrides.statuses ?? ["completed", "picked_up"],
    menuCategoryId: overrides.menuCategoryId ?? null,
    menuItemId: overrides.menuItemId ?? null
  };
}

export function overallReportTotals(
  overrides: Partial<OverallReportTotals> = {}
): OverallReportTotals {
  return {
    totalSales: overrides.totalSales ?? "18.25",
    orderCount: overrides.orderCount ?? 3,
    averageOrderValue: overrides.averageOrderValue ?? "6.08",
    topSellingItemName: overrides.topSellingItemName ?? "Latte",
    topSellingItemQuantity: overrides.topSellingItemQuantity ?? 4
  };
}

export function reportPeriodSummary(
  overrides: Partial<ReportPeriodSummary> = {}
): ReportPeriodSummary {
  return {
    key: overrides.key ?? "2026-06-25",
    label: overrides.label ?? "Jun 25, 2026",
    startDate: overrides.startDate ?? "2026-06-25",
    endDate: overrides.endDate ?? "2026-06-25",
    partial: overrides.partial ?? false,
    ...overallReportTotals(overrides)
  };
}

export function popularItemReport(overrides: Partial<PopularItemReport> = {}): PopularItemReport {
  return {
    rank: overrides.rank ?? 1,
    sourceMenuItemId: overrides.sourceMenuItemId ?? "menu-latte",
    itemName: overrides.itemName ?? "Latte",
    categoryName: overrides.categoryName ?? "Coffee",
    quantitySold: overrides.quantitySold ?? 4,
    orderCount: overrides.orderCount ?? 3,
    salesAmount: overrides.salesAmount ?? "18.00"
  };
}

export function popularCombinationReport(
  overrides: Partial<PopularCombinationReport> = {}
): PopularCombinationReport {
  return {
    rank: overrides.rank ?? 1,
    combinationKey: overrides.combinationKey ?? "latte:1|mocha:1",
    combinationLabel: overrides.combinationLabel ?? "Latte + Mocha",
    orderFrequency: overrides.orderFrequency ?? 2,
    itemCount: overrides.itemCount ?? 2,
    salesAmount: overrides.salesAmount ?? "19.00"
  };
}

export function reportOrderItem(overrides: Partial<ReportOrderItem> = {}): ReportOrderItem {
  return {
    beverageId: overrides.beverageId ?? "beverage-latte-1",
    sourceMenuItemId: overrides.sourceMenuItemId ?? "menu-latte",
    name: overrides.name ?? "Latte",
    quantity: overrides.quantity ?? 1,
    unitPrice: overrides.unitPrice ?? "4.50",
    lineTotal: overrides.lineTotal ?? "4.50",
    status: overrides.status ?? "completed",
    selectedCustomizations: overrides.selectedCustomizations ?? ["Milk: Whole Milk"]
  };
}

export function supportingOrder(overrides: Partial<ReportOrderDetail> = {}): ReportOrderDetail {
  return {
    orderId: overrides.orderId ?? "order-report-1",
    businessDate: overrides.businessDate ?? "2026-06-25",
    dailyOrderNumber: overrides.dailyOrderNumber ?? 42,
    status: overrides.status ?? "picked_up",
    capturedOrderTotal: overrides.capturedOrderTotal ?? "5.25",
    reportableTotal: overrides.reportableTotal ?? "4.50",
    items: overrides.items ?? [reportOrderItem()],
    createdAt: overrides.createdAt ?? "2026-06-25T09:00:00.000Z",
    completedAt: overrides.completedAt ?? "2026-06-25T09:08:00.000Z",
    pickedUpAt: overrides.pickedUpAt ?? "2026-06-25T09:12:00.000Z"
  };
}

export function reportSalesResponse(
  overrides: {
    filters?: ReportFilter;
    generatedAt?: string;
    overall?: Partial<OverallReportTotals>;
    periods?: ReportPeriodSummary[];
    popularItems?: PopularItemReport[];
    popularCombinations?: PopularCombinationReport[];
  } = {}
): ReportSalesResponse {
  return {
    filters: overrides.filters ?? reportFilter(),
    generatedAt: overrides.generatedAt ?? "2026-06-25T10:00:00.000Z",
    overall: overallReportTotals(overrides.overall),
    periods: overrides.periods ?? [reportPeriodSummary()],
    popularItems: overrides.popularItems ?? [popularItemReport()],
    popularCombinations: overrides.popularCombinations ?? [popularCombinationReport()]
  };
}

export function reportOrdersResponse(
  overrides: { filters?: ReportFilter; orders?: ReportOrderDetail[] } = {}
): ReportOrdersResponse {
  return {
    filters: overrides.filters ?? reportFilter(),
    orders: overrides.orders ?? [supportingOrder()]
  };
}

export function emptyReportSalesResponse(filters = reportFilter()): ReportSalesResponse {
  return reportSalesResponse({
    filters,
    overall: {
      totalSales: "0.00",
      orderCount: 0,
      averageOrderValue: "0.00",
      topSellingItemName: null,
      topSellingItemQuantity: null
    },
    periods: [
      reportPeriodSummary({
        key: filters.startDate,
        label: filters.startDate,
        startDate: filters.startDate,
        endDate: filters.endDate,
        totalSales: "0.00",
        orderCount: 0,
        averageOrderValue: "0.00",
        topSellingItemName: null,
        topSellingItemQuantity: null
      })
    ],
    popularItems: [],
    popularCombinations: []
  });
}

export function ninetyDayReportPeriods(startDate = "2026-04-01"): ReportPeriodSummary[] {
  return Array.from({ length: 90 }, (_, index) => {
    const businessDate = addDays(startDate, index);

    return reportPeriodSummary({
      key: businessDate,
      label: businessDate,
      startDate: businessDate,
      endDate: businessDate,
      totalSales: `${20 + (index % 10)}.00` as Money,
      orderCount: 4 + (index % 3),
      averageOrderValue: "5.00",
      topSellingItemName: index % 2 === 0 ? "Latte" : "Mocha",
      topSellingItemQuantity: 2 + (index % 4)
    });
  });
}

function addDays(startDate: string, offsetDays: number): string {
  const [year, month, day] = startDate.split("-").map(Number);

  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Invalid report mock date ${startDate}.`);
  }

  return new Date(Date.UTC(year, month - 1, day + offsetDays)).toISOString().slice(0, 10);
}
