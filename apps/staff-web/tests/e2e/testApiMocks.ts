import type { Route } from "@playwright/test";

import {
  loyaltyCustomer,
  loyaltyPointHistoryEntry,
  loyaltyPointsResponse,
  loyaltyProgramConfiguration,
  loyaltyRewardOption,
  loyaltyRewardOptions,
  loyaltyPointSummary,
  type LoyaltyCustomer,
  type LoyaltyPointHistoryEntry,
  type LoyaltyPointsResponse,
  type LoyaltyProgramConfiguration,
  type LoyaltyRewardOption,
} from "../../src/test/loyaltyTestData";

export interface LoyaltyMockOrder {
  id: string;
  businessDate: string;
  dailyOrderNumber: number;
  status:
    | "created"
    | "queued"
    | "in_progress"
    | "completed"
    | "picked_up"
    | "cancelled";
  total: string;
  loyaltyRewardDiscountTotal: string;
  payableTotal: string;
  beverages: unknown[];
  loyalty: {
    customer: LoyaltyCustomer;
    rewards: Array<{
      id: string;
      name: string;
      pointsCost: number;
      benefitType: "free_beverage" | "size_upgrade";
      targetDescription: string;
      coveredAmount: string;
      status: "active" | "returned";
    }>;
  } | null;
}

export interface MutableLoyaltyBalanceFixture {
  points: LoyaltyPointsResponse;
}

export interface LoyaltyApiMockData {
  customer?: LoyaltyCustomer;
  customers?: LoyaltyCustomer[];
  balance?: MutableLoyaltyBalanceFixture;
  configuration?: LoyaltyProgramConfiguration;
  rewards?: LoyaltyRewardOption[];
  order?: LoyaltyMockOrder;
}

export function mutableLoyaltyBalanceFixture(
  points: LoyaltyPointsResponse = loyaltyPointsResponse(),
): MutableLoyaltyBalanceFixture {
  return {
    points: {
      ...points,
      summary: { ...points.summary },
      history: [...points.history],
    },
  };
}

export async function fulfillLoyaltyApiRoute(
  route: Route,
  mockData: LoyaltyApiMockData = {},
): Promise<boolean> {
  const url = new URL(route.request().url());
  const path = url.pathname.replace(/^\/api/, "");
  const customer = mockData.customer ?? loyaltyCustomer();
  const balance =
    mockData.balance ??
    mutableLoyaltyBalanceFixture(loyaltyPointsResponse({ customer }));
  const configuration = mockData.configuration ?? loyaltyProgramConfiguration();
  const rewards = mockData.rewards ?? loyaltyRewardOptions();

  if (path === "/staff/session") {
    await fulfillJson(route, {
      id: "0a1b2c3d-4e5f-4000-8000-000000000002",
      username: "barista",
      displayName: "Demo Barista",
      authorizationStatus: "authorized",
    });
    return true;
  }

  if (path === "/loyalty/phone-region") {
    await fulfillJson(route, { region: "TH" });
    return true;
  }

  if (path === "/loyalty/customers" && route.request().method() === "GET") {
    await fulfillJson(route, { customers: mockData.customers ?? [customer] });
    return true;
  }

  if (path === "/loyalty/customers" && route.request().method() === "POST") {
    const input = route.request().postDataJSON() as Partial<LoyaltyCustomer>;
    await fulfillJson(route, { ...customer, ...input, email: input.email ?? null }, 201);
    return true;
  }

  if (path === `/loyalty/customers/${customer.id}`) {
    const update =
      route.request().method() === "PATCH"
        ? (route.request().postDataJSON() as Partial<LoyaltyCustomer>)
        : undefined;
    await fulfillJson(route, update ? { ...customer, ...update } : customer);
    return true;
  }

  if (path === `/loyalty/customers/${customer.id}/points`) {
    await fulfillJson(route, balance.points);
    return true;
  }

  if (path === "/loyalty/config/earning-rule") {
    await fulfillJson(route, { rule: configuration.earningRule });
    return true;
  }

  if (path === "/loyalty/config/expiration-policy") {
    await fulfillJson(route, { policy: configuration.expirationPolicy });
    return true;
  }

  if (path === "/loyalty/rewards" && route.request().method() === "GET") {
    await fulfillJson(route, { rewards });
    return true;
  }

  if (path === "/loyalty/rewards" && route.request().method() === "POST") {
    await fulfillJson(route, rewards[0] ?? loyaltyRewardOption(), 201);
    return true;
  }

  if (
    path.startsWith("/loyalty/rewards/") &&
    route.request().method() === "PATCH"
  ) {
    await fulfillJson(route, rewards[0] ?? loyaltyRewardOption());
    return true;
  }

  const cancellationMatch = path.match(
    /^\/orders\/([^/]+)\/loyalty-rewards\/([^/]+)\/cancel$/,
  );

  if (
    cancellationMatch !== null &&
    route.request().method() === "POST" &&
    mockData.order !== undefined
  ) {
    const [, orderId, redemptionId] = cancellationMatch;

    if (orderId !== mockData.order.id) {
      return false;
    }

    const reward = mockData.order.loyalty?.rewards.find(
      (candidate) => candidate.id === redemptionId,
    );

    if (reward === undefined || reward.status !== "active") {
      await fulfillJson(
        route,
        { code: "LOYALTY_REWARD_CONFLICT", message: "Reward is not active." },
        409,
      );
      return true;
    }

    reward.status = "returned";
    mockData.order.loyaltyRewardDiscountTotal = subtractMoney(
      mockData.order.loyaltyRewardDiscountTotal,
      reward.coveredAmount,
    );
    mockData.order.payableTotal = addMoney(
      mockData.order.payableTotal,
      reward.coveredAmount,
    );
    applyRewardReturn(balance.points, reward);
    await fulfillJson(route, mockData.order);
    return true;
  }

  return false;
}

export async function fulfillCsrfToken(
  route: Route,
  path: string,
): Promise<boolean> {
  if (path !== "/auth/csrf-token") {
    return false;
  }

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ csrfToken: "test-csrf-token" }),
  });
  return true;
}

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

function applyRewardReturn(
  points: LoyaltyPointsResponse,
  reward: NonNullable<LoyaltyMockOrder["loyalty"]>["rewards"][number],
): void {
  const redeemedEntry = points.history.find(
    (entry) =>
      entry.eventType === "redeemed" && entry.rewardName === reward.name,
  );
  const expirationBusinessDate =
    redeemedEntry?.expirationBusinessDate ?? "2026-10-31";
  const returnedEntry: LoyaltyPointHistoryEntry = loyaltyPointHistoryEntry({
    id: `returned-${reward.id}`,
    eventType: "returned",
    pointsDelta: reward.pointsCost,
    reason: `Returned points after ${reward.name} was cancelled.`,
    expirationBusinessDate,
    rewardName: reward.name,
    occurredAt: "2026-07-01T09:15:00.000Z",
  });

  points.summary = loyaltyPointSummary({
    ...points.summary,
    available: points.summary.available + reward.pointsCost,
    returned: points.summary.returned + reward.pointsCost,
  });
  points.history = [returnedEntry, ...points.history];
}

function addMoney(left: string, right: string): string {
  return ((Number(left) * 100 + Number(right) * 100) / 100).toFixed(2);
}

function subtractMoney(left: string, right: string): string {
  return (Math.max(0, Number(left) * 100 - Number(right) * 100) / 100).toFixed(
    2,
  );
}
