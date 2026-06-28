import type { ReportPeriodType } from "@coffee-shop/shared/contracts/api";

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

const MS_PER_DAY = 24 * 60 * 60 * 1000;
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
