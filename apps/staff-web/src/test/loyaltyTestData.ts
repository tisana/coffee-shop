export type LoyaltyRewardBenefitType = "free_beverage" | "size_upgrade";
export type LoyaltyPointEventType =
  | "earned"
  | "redeemed"
  | "returned"
  | "expired"
  | "adjusted";

export interface LoyaltyCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  enrolledAt: string;
  updatedAt: string;
}

export interface LoyaltyPointSummary {
  available: number;
  lifetimeEarned: number;
  redeemed: number;
  returned: number;
  expired: number;
  adjusted: number;
}

export interface LoyaltyPointHistoryEntry {
  id: string;
  eventType: LoyaltyPointEventType;
  pointsDelta: number;
  reason: string;
  businessDate: string | null;
  expirationBusinessDate: string | null;
  orderId: string | null;
  orderLabel: string | null;
  rewardName: string | null;
  occurredAt: string;
}

export interface LoyaltyPointsResponse {
  customer: LoyaltyCustomer;
  asOfBusinessDate: string;
  summary: LoyaltyPointSummary;
  history: LoyaltyPointHistoryEntry[];
}

export interface LoyaltyEarningRule {
  id: string;
  earningType: "purchase_amount" | "beverage_count";
  amountThreshold?: string;
  beverageCountThreshold?: number;
  pointsAwarded: number;
  active: boolean;
  effectiveAt: string;
}

export interface LoyaltyExpirationPolicy {
  id: string;
  enabled: boolean;
  expirationMonths?: number;
  active: boolean;
  effectiveAt: string;
}

export interface LoyaltyRewardOption {
  id: string;
  name: string;
  pointsCost: number;
  benefitType: LoyaltyRewardBenefitType;
  benefitDescription: string;
  active: boolean;
  effectiveAt: string;
  updatedAt: string;
}

export interface LoyaltyProgramConfiguration {
  earningRule: LoyaltyEarningRule | null;
  expirationPolicy: LoyaltyExpirationPolicy | null;
}

const fixtureTimestamp = "2026-07-01T09:00:00.000Z";

export function loyaltyCustomer(
  overrides: Partial<LoyaltyCustomer> = {},
): LoyaltyCustomer {
  return {
    id: "0a1b2c3d-4e5f-4000-8000-000000000001",
    name: "Ari Srisuk",
    phone: "081-234-5678",
    email: null,
    enrolledAt: fixtureTimestamp,
    updatedAt: fixtureTimestamp,
    ...overrides,
  };
}

export function loyaltyPointSummary(
  overrides: Partial<LoyaltyPointSummary> = {},
): LoyaltyPointSummary {
  return {
    available: 12,
    lifetimeEarned: 12,
    redeemed: 0,
    returned: 0,
    expired: 0,
    adjusted: 0,
    ...overrides,
  };
}

export function loyaltyPointHistoryEntry(
  overrides: Partial<LoyaltyPointHistoryEntry> = {},
): LoyaltyPointHistoryEntry {
  return {
    id: "0a1b2c3d-4e5f-4000-8000-000000000009",
    eventType: "earned",
    pointsDelta: 12,
    reason: "Earned from order #17 on 2026-07-01.",
    businessDate: "2026-07-01",
    expirationBusinessDate: "2026-10-31",
    orderId: "0a1b2c3d-4e5f-4000-8000-000000000006",
    orderLabel: "2026-07-01 #17",
    rewardName: null,
    occurredAt: fixtureTimestamp,
    ...overrides,
  };
}

export function loyaltyPointsResponse(
  overrides: {
    customer?: LoyaltyCustomer;
    asOfBusinessDate?: string;
    summary?: Partial<LoyaltyPointSummary>;
    history?: LoyaltyPointHistoryEntry[];
  } = {},
): LoyaltyPointsResponse {
  return {
    customer: overrides.customer ?? loyaltyCustomer(),
    asOfBusinessDate: overrides.asOfBusinessDate ?? "2026-07-01",
    summary: loyaltyPointSummary(overrides.summary),
    history: overrides.history ?? [loyaltyPointHistoryEntry()],
  };
}

export function loyaltyEarningRule(
  overrides: Partial<LoyaltyEarningRule> = {},
): LoyaltyEarningRule {
  return {
    id: "0a1b2c3d-4e5f-4000-8000-000000000003",
    earningType: "purchase_amount",
    amountThreshold: "10.00",
    pointsAwarded: 1,
    active: true,
    effectiveAt: fixtureTimestamp,
    ...overrides,
  };
}

export function loyaltyExpirationPolicy(
  overrides: Partial<LoyaltyExpirationPolicy> = {},
): LoyaltyExpirationPolicy {
  return {
    id: "0a1b2c3d-4e5f-4000-8000-000000000004",
    enabled: true,
    expirationMonths: 3,
    active: true,
    effectiveAt: fixtureTimestamp,
    ...overrides,
  };
}

export function loyaltyProgramConfiguration(
  overrides: Partial<LoyaltyProgramConfiguration> = {},
): LoyaltyProgramConfiguration {
  return {
    earningRule: loyaltyEarningRule(),
    expirationPolicy: loyaltyExpirationPolicy(),
    ...overrides,
  };
}

export function loyaltyRewardOption(
  overrides: Partial<LoyaltyRewardOption> = {},
): LoyaltyRewardOption {
  return {
    id: "0a1b2c3d-4e5f-4000-8000-000000000005",
    name: "Free beverage",
    pointsCost: 10,
    benefitType: "free_beverage",
    benefitDescription:
      "Covers one complete beverage unit, including selected customizations.",
    active: true,
    effectiveAt: fixtureTimestamp,
    updatedAt: fixtureTimestamp,
    ...overrides,
  };
}

export function loyaltyRewardOptions(): LoyaltyRewardOption[] {
  return [
    loyaltyRewardOption(),
    loyaltyRewardOption({
      id: "0a1b2c3d-4e5f-4000-8000-000000000013",
      name: "Size upgrade",
      pointsCost: 5,
      benefitType: "size_upgrade",
      benefitDescription: "Covers one selected positive-price size adjustment.",
    }),
  ];
}
