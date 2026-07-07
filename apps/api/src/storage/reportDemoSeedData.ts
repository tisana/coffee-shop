import type { BeverageStatus, OrderStatus, SelectedCustomizationSnapshot } from "@coffee-shop/shared/domain/types";

export interface ReportDemoBeverageSeed {
  itemName: string;
  quantity: number;
  priceSnapshot: string;
  selectedCustomizationsSnapshot: SelectedCustomizationSnapshot[];
  status: BeverageStatus;
  specialInstructions: string | null;
}

export interface ReportDemoOrderSeed {
  businessDate: string;
  dailyOrderNumber: number;
  pickupName: string;
  status: Extract<OrderStatus, "completed" | "picked_up">;
  total: string;
  createdAt: string;
  queuedAt: string;
  inProgressAt: string;
  completedAt: string;
  pickedUpAt: string | null;
  beverages: ReportDemoBeverageSeed[];
}

interface ReportDemoMenuItem {
  itemName: string;
  priceSnapshot: string;
  customizable: boolean;
}

const REPORT_DEMO_MONTHS = 6;
const REPORT_DEMO_ORDERS_PER_MONTH = 4;
const REPORT_DEMO_PICKUP_PREFIX = "Report Demo";

const reportDemoMenuItems: Record<string, ReportDemoMenuItem> = {
  Latte: { itemName: "Latte", priceSnapshot: "5.25", customizable: true },
  Cappuccino: { itemName: "Cappuccino", priceSnapshot: "5.00", customizable: true },
  Mocha: { itemName: "Mocha", priceSnapshot: "5.75", customizable: true },
  "Cold Brew": { itemName: "Cold Brew", priceSnapshot: "4.25", customizable: true },
  "Matcha Latte": { itemName: "Matcha Latte", priceSnapshot: "5.50", customizable: true },
  Croissant: { itemName: "Croissant", priceSnapshot: "3.75", customizable: false },
  "Blueberry Muffin": { itemName: "Blueberry Muffin", priceSnapshot: "3.50", customizable: false }
};

const reportDemoOrderPatterns: string[][] = [
  ["Latte", "Croissant"],
  ["Cold Brew", "Cold Brew"],
  ["Mocha", "Blueberry Muffin", "Blueberry Muffin"],
  ["Cappuccino", "Matcha Latte"]
];

export function buildReportDemoOrderSeeds(anchorDate = currentIsoDate()): ReportDemoOrderSeed[] {
  const anchor = parseIsoDate(anchorDate);
  const seedOrders: ReportDemoOrderSeed[] = [];

  for (let monthIndex = 0; monthIndex < REPORT_DEMO_MONTHS; monthIndex += 1) {
    const month = addUtcMonths(
      new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1)),
      monthIndex - (REPORT_DEMO_MONTHS - 1)
    );
    const dateSeeds = demoDatesForMonth(month, anchor);

    for (const [orderIndex, businessDate] of dateSeeds.entries()) {
      const sequence = monthIndex * REPORT_DEMO_ORDERS_PER_MONTH + orderIndex + 1;
      const beverages = buildDemoBeverages(
        reportDemoOrderPatterns[orderIndex % reportDemoOrderPatterns.length] ?? ["Latte"],
        sequence
      );
      const status = sequence % 3 === 0 ? "picked_up" : "completed";

      seedOrders.push({
        businessDate,
        dailyOrderNumber: 40 + orderIndex,
        pickupName: `${REPORT_DEMO_PICKUP_PREFIX} ${businessDate} #${orderIndex + 1}`,
        status,
        total: calculateSeedTotal(beverages),
        createdAt: dateTimeForBusinessDate(businessDate, 8 + orderIndex, 0),
        queuedAt: dateTimeForBusinessDate(businessDate, 8 + orderIndex, 2),
        inProgressAt: dateTimeForBusinessDate(businessDate, 8 + orderIndex, 5),
        completedAt: dateTimeForBusinessDate(businessDate, 8 + orderIndex, 12),
        pickedUpAt: status === "picked_up" ? dateTimeForBusinessDate(businessDate, 8 + orderIndex, 18) : null,
        beverages
      });
    }
  }

  return seedOrders;
}

function buildDemoBeverages(itemNames: string[], sequence: number): ReportDemoBeverageSeed[] {
  const quantityByName = new Map<string, number>();

  for (const itemName of itemNames) {
    quantityByName.set(itemName, (quantityByName.get(itemName) ?? 0) + 1);
  }

  return Array.from(quantityByName.entries()).map(([itemName, quantity]) => {
    const item = reportDemoMenuItems[itemName];

    if (!item) {
      throw new Error(`Missing report demo menu item ${itemName}.`);
    }

    return {
      itemName,
      quantity,
      priceSnapshot: item.priceSnapshot,
      selectedCustomizationsSnapshot: item.customizable ? [milkSnapshot(sequence)] : [],
      status: "completed",
      specialInstructions: null
    };
  });
}

function milkSnapshot(sequence: number): SelectedCustomizationSnapshot {
  return {
    groupName: "Milk",
    choices: [
      {
        choiceName: sequence % 2 === 0 ? "Oat Milk" : "Whole Milk",
        priceAdjustment: "0.00"
      }
    ]
  };
}

function calculateSeedTotal(beverages: ReportDemoBeverageSeed[]): string {
  const totalCents = beverages.reduce(
    (sum, beverage) => sum + moneyToCents(beverage.priceSnapshot) * beverage.quantity,
    0
  );

  return (totalCents / 100).toFixed(2);
}

function demoDatesForMonth(month: Date, anchor: Date): string[] {
  const isAnchorMonth =
    month.getUTCFullYear() === anchor.getUTCFullYear() && month.getUTCMonth() === anchor.getUTCMonth();
  const maxDay = isAnchorMonth ? anchor.getUTCDate() : lastDayOfMonth(month);
  const candidateDays = [3, 10, 17, 24];
  const days: number[] = [];

  for (const candidateDay of candidateDays) {
    const day = Math.min(candidateDay, maxDay);

    if (!days.includes(day)) {
      days.push(day);
    }
  }

  return days.map((day) => toIsoDate(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day))));
}

function lastDayOfMonth(month: Date): number {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
}

function dateTimeForBusinessDate(businessDate: string, hour: number, minute: number): string {
  return `${businessDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`;
}

function moneyToCents(value: string): number {
  return Math.round(Number(value) * 100);
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Invalid report demo seed date ${value}.`);
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcMonths(value: Date, monthOffset: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + monthOffset, 1));
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function currentIsoDate(): string {
  return toIsoDate(new Date());
}
