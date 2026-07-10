export type LoyaltyEarningType = "purchase_amount" | "beverage_count";
export type LoyaltyRewardBenefitType = "free_beverage" | "size_upgrade";
export type LoyaltyPointEventType =
  | "earned"
  | "redeemed"
  | "returned"
  | "expired"
  | "adjusted";
export type LoyaltyRewardStatus = "active" | "returned";

export const loyaltyFixtureIds = {
  customer: "0a1b2c3d-4e5f-4000-8000-000000000001",
  staff: "0a1b2c3d-4e5f-4000-8000-000000000002",
  earningRule: "0a1b2c3d-4e5f-4000-8000-000000000003",
  expirationPolicy: "0a1b2c3d-4e5f-4000-8000-000000000004",
  reward: "0a1b2c3d-4e5f-4000-8000-000000000005",
  order: "0a1b2c3d-4e5f-4000-8000-000000000006",
  beverage: "0a1b2c3d-4e5f-4000-8000-000000000007",
  redemption: "0a1b2c3d-4e5f-4000-8000-000000000008",
  earnedEntry: "0a1b2c3d-4e5f-4000-8000-000000000009",
  redeemedEntry: "0a1b2c3d-4e5f-4000-8000-000000000010",
} as const;

const fixtureTimestamp = "2026-07-01T09:00:00.000Z";

export interface LoyaltyCustomerFixture {
  id: string;
  name: string;
  phoneDisplay: string;
  phoneNormalized: string;
  email: string | null;
  enrolledAt: string;
  updatedAt: string;
}

export interface LoyaltyEarningRuleFixture {
  id: string;
  earningType: LoyaltyEarningType;
  amountThreshold: string | null;
  beverageCountThreshold: number | null;
  pointsAwarded: number;
  active: boolean;
  effectiveAt: string;
  retiredAt: string | null;
  createdByStaffId: string;
}

export interface LoyaltyExpirationPolicyFixture {
  id: string;
  enabled: boolean;
  expirationMonths: number | null;
  active: boolean;
  effectiveAt: string;
  retiredAt: string | null;
  createdByStaffId: string;
}

export interface LoyaltyRewardFixture {
  id: string;
  name: string;
  pointsCost: number;
  benefitType: LoyaltyRewardBenefitType;
  benefitDescription: string;
  active: boolean;
  effectiveAt: string;
  updatedAt: string;
  createdByStaffId: string;
  updatedByStaffId: string;
}

export interface LoyaltyOrderFixture {
  id: string;
  customerId: string;
  associatedByStaffId: string;
  associatedAt: string;
  businessDate: string;
  dailyOrderNumber: number;
  beverageId: string;
  total: string;
  loyaltyRewardDiscountTotal: string;
  payableTotal: string;
  status:
    | "created"
    | "queued"
    | "in_progress"
    | "completed"
    | "picked_up"
    | "cancelled";
}

export interface LoyaltyRewardRedemptionFixture {
  id: string;
  orderId: string;
  customerId: string;
  rewardOptionId: string;
  targetOrderBeverageId: string;
  targetCustomizationChoiceId: string | null;
  rewardNameSnapshot: string;
  pointsCostSnapshot: number;
  benefitTypeSnapshot: LoyaltyRewardBenefitType;
  benefitDescriptionSnapshot: string;
  targetDescriptionSnapshot: string;
  coveredAmountSnapshot: string;
  coveredBeverageQuantity: number;
  status: LoyaltyRewardStatus;
  redeemedAt: string;
  returnedAt: string | null;
  returnedReason: string | null;
  redeemedByStaffId: string;
  returnedByStaffId: string | null;
}

export interface LoyaltyPointLedgerEntryFixture {
  id: string;
  customerId: string;
  eventType: LoyaltyPointEventType;
  pointsDelta: number;
  orderId: string | null;
  rewardRedemptionId: string | null;
  earningRuleId: string | null;
  expirationPolicyId: string | null;
  earnedBusinessDate: string | null;
  expirationBusinessDate: string | null;
  reason: string;
  createdByStaffId: string | null;
  occurredAt: string;
}

export interface LoyaltyPointAllocationFixture {
  id: string;
  customerId: string;
  creditEntryId: string;
  debitEntryId: string;
  points: number;
  createdAt: string;
}

export function buildLoyaltyCustomerFixture(
  overrides: Partial<LoyaltyCustomerFixture> = {},
): LoyaltyCustomerFixture {
  return {
    id: loyaltyFixtureIds.customer,
    name: "Ari Srisuk",
    phoneDisplay: "081-234-5678",
    phoneNormalized: "+66812345678",
    email: null,
    enrolledAt: fixtureTimestamp,
    updatedAt: fixtureTimestamp,
    ...overrides,
  };
}

export function buildLoyaltyEarningRuleFixture(
  overrides: Partial<LoyaltyEarningRuleFixture> = {},
): LoyaltyEarningRuleFixture {
  return {
    id: loyaltyFixtureIds.earningRule,
    earningType: "purchase_amount",
    amountThreshold: "10.00",
    beverageCountThreshold: null,
    pointsAwarded: 1,
    active: true,
    effectiveAt: fixtureTimestamp,
    retiredAt: null,
    createdByStaffId: loyaltyFixtureIds.staff,
    ...overrides,
  };
}

export function buildLoyaltyExpirationPolicyFixture(
  overrides: Partial<LoyaltyExpirationPolicyFixture> = {},
): LoyaltyExpirationPolicyFixture {
  return {
    id: loyaltyFixtureIds.expirationPolicy,
    enabled: true,
    expirationMonths: 3,
    active: true,
    effectiveAt: fixtureTimestamp,
    retiredAt: null,
    createdByStaffId: loyaltyFixtureIds.staff,
    ...overrides,
  };
}

export function buildLoyaltyRewardFixture(
  overrides: Partial<LoyaltyRewardFixture> = {},
): LoyaltyRewardFixture {
  return {
    id: loyaltyFixtureIds.reward,
    name: "Free beverage",
    pointsCost: 10,
    benefitType: "free_beverage",
    benefitDescription:
      "Covers one complete beverage unit, including selected customizations.",
    active: true,
    effectiveAt: fixtureTimestamp,
    updatedAt: fixtureTimestamp,
    createdByStaffId: loyaltyFixtureIds.staff,
    updatedByStaffId: loyaltyFixtureIds.staff,
    ...overrides,
  };
}

export function buildLoyaltyOrderFixture(
  overrides: Partial<LoyaltyOrderFixture> = {},
): LoyaltyOrderFixture {
  return {
    id: loyaltyFixtureIds.order,
    customerId: loyaltyFixtureIds.customer,
    associatedByStaffId: loyaltyFixtureIds.staff,
    associatedAt: fixtureTimestamp,
    businessDate: "2026-07-01",
    dailyOrderNumber: 17,
    beverageId: loyaltyFixtureIds.beverage,
    total: "5.25",
    loyaltyRewardDiscountTotal: "5.25",
    payableTotal: "0.00",
    status: "created",
    ...overrides,
  };
}

export function buildLoyaltyRewardRedemptionFixture(
  overrides: Partial<LoyaltyRewardRedemptionFixture> = {},
): LoyaltyRewardRedemptionFixture {
  return {
    id: loyaltyFixtureIds.redemption,
    orderId: loyaltyFixtureIds.order,
    customerId: loyaltyFixtureIds.customer,
    rewardOptionId: loyaltyFixtureIds.reward,
    targetOrderBeverageId: loyaltyFixtureIds.beverage,
    targetCustomizationChoiceId: null,
    rewardNameSnapshot: "Free beverage",
    pointsCostSnapshot: 10,
    benefitTypeSnapshot: "free_beverage",
    benefitDescriptionSnapshot:
      "Covers one complete beverage unit, including selected customizations.",
    targetDescriptionSnapshot: "Latte with oat milk",
    coveredAmountSnapshot: "5.25",
    coveredBeverageQuantity: 1,
    status: "active",
    redeemedAt: fixtureTimestamp,
    returnedAt: null,
    returnedReason: null,
    redeemedByStaffId: loyaltyFixtureIds.staff,
    returnedByStaffId: null,
    ...overrides,
  };
}

export function buildLoyaltyPointLedgerEntryFixture(
  overrides: Partial<LoyaltyPointLedgerEntryFixture> = {},
): LoyaltyPointLedgerEntryFixture {
  return {
    id: loyaltyFixtureIds.earnedEntry,
    customerId: loyaltyFixtureIds.customer,
    eventType: "earned",
    pointsDelta: 12,
    orderId: loyaltyFixtureIds.order,
    rewardRedemptionId: null,
    earningRuleId: loyaltyFixtureIds.earningRule,
    expirationPolicyId: loyaltyFixtureIds.expirationPolicy,
    earnedBusinessDate: "2026-07-01",
    expirationBusinessDate: "2026-10-31",
    reason: "Earned from order #17 on 2026-07-01.",
    createdByStaffId: loyaltyFixtureIds.staff,
    occurredAt: fixtureTimestamp,
    ...overrides,
  };
}

export function buildLoyaltyPointAllocationFixture(
  overrides: Partial<LoyaltyPointAllocationFixture> = {},
): LoyaltyPointAllocationFixture {
  return {
    id: "0a1b2c3d-4e5f-4000-8000-000000000011",
    customerId: loyaltyFixtureIds.customer,
    creditEntryId: loyaltyFixtureIds.earnedEntry,
    debitEntryId: loyaltyFixtureIds.redeemedEntry,
    points: 10,
    createdAt: fixtureTimestamp,
    ...overrides,
  };
}

export function buildLoyaltyRewardCancellationFixture(): {
  redemption: LoyaltyRewardRedemptionFixture;
  redeemedEntry: LoyaltyPointLedgerEntryFixture;
  returnedEntry: LoyaltyPointLedgerEntryFixture;
  allocation: LoyaltyPointAllocationFixture;
} {
  const redemption = buildLoyaltyRewardRedemptionFixture({
    status: "returned",
    returnedAt: "2026-07-01T09:15:00.000Z",
    returnedReason: "Staff cancelled the applied reward.",
    returnedByStaffId: loyaltyFixtureIds.staff,
  });
  const redeemedEntry = buildLoyaltyPointLedgerEntryFixture({
    id: loyaltyFixtureIds.redeemedEntry,
    eventType: "redeemed",
    pointsDelta: -10,
    rewardRedemptionId: redemption.id,
    earningRuleId: null,
    expirationPolicyId: null,
    earnedBusinessDate: null,
    expirationBusinessDate: null,
    reason: "Redeemed Free beverage on order #17.",
    occurredAt: "2026-07-01T09:05:00.000Z",
  });
  const returnedEntry = buildLoyaltyPointLedgerEntryFixture({
    id: "0a1b2c3d-4e5f-4000-8000-000000000012",
    eventType: "returned",
    pointsDelta: 10,
    rewardRedemptionId: redemption.id,
    earningRuleId: null,
    expirationPolicyId: null,
    earnedBusinessDate: "2026-07-01",
    reason: "Returned points after reward cancellation on order #17.",
    occurredAt: "2026-07-01T09:15:00.000Z",
  });

  return {
    redemption,
    redeemedEntry,
    returnedEntry,
    allocation: buildLoyaltyPointAllocationFixture(),
  };
}
