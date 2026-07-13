export type StaffAuthorizationStatus = "authorized" | "inactive";

export interface StaffUser {
  id: string;
  username: string;
  displayName: string;
  authorizationStatus: StaffAuthorizationStatus;
}

export interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  active: boolean;
  menuItems: MenuItem[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  available: boolean;
  active: boolean;
  displayOrder: number;
  customizationGroups: CustomizationGroup[];
}

export interface CustomizationGroup {
  id: string;
  menuItemId: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  active: boolean;
  choices: CustomizationChoice[];
}

export interface CustomizationChoice {
  id: string;
  customizationGroupId: string;
  name: string;
  priceAdjustment: string;
  available: boolean;
  displayOrder: number;
  active: boolean;
}

export interface SelectedCustomization {
  customizationGroupId: string;
  customizationChoiceIds: string[];
}

export interface SelectedCustomizationSnapshot {
  groupName: string;
  choices: Array<{
    choiceName: string;
    priceAdjustment: string;
  }>;
}

export interface Order {
  id: string;
  businessDate: string;
  dailyOrderNumber: number;
  pickupName: string | null;
  status: OrderStatus;
  createdByStaffId: string;
  assignedBaristaId: string | null;
  assignedBaristaDisplayName?: string | null;
  total: string;
  createdAt: string;
  queuedAt: string | null;
  inProgressAt: string | null;
  completedAt: string | null;
  pickedUpAt: string | null;
  cancelledAt: string | null;
  beverages: OrderBeverage[];
}

export interface OrderBeverage {
  id: string;
  orderId: string;
  sourceMenuItemId: string;
  nameSnapshot: string;
  quantity: number;
  priceSnapshot: string;
  selectedCustomizationsSnapshot: SelectedCustomizationSnapshot[];
  specialInstructions: string | null;
  status: BeverageStatus;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

export interface DailyOrderSequence {
  businessDate: string;
  lastIssuedNumber: number;
  updatedAt: string;
}

export type OrderStatus =
  | "created"
  | "queued"
  | "in_progress"
  | "completed"
  | "picked_up"
  | "cancelled";

export type BeverageStatus = "pending" | "completed" | "cancelled";

export type LoyaltyEarningType = "purchase_amount" | "beverage_count";
export type LoyaltyRewardBenefitType = "free_beverage" | "size_upgrade";
export type LoyaltyRedemptionStatus = "active" | "returned";
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

export interface LoyaltyEarningRule {
  id: string;
  earningType: LoyaltyEarningType;
  amountThreshold: string | null;
  beverageCountThreshold: number | null;
  pointsAwarded: number;
  active: boolean;
  effectiveAt: string;
  retiredAt: string | null;
}

export interface LoyaltyExpirationPolicy {
  id: string;
  enabled: boolean;
  expirationMonths: number | null;
  active: boolean;
  effectiveAt: string;
  retiredAt: string | null;
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

export interface LoyaltyOrderAssociation {
  orderId: string;
  customerId: string;
  associatedByStaffId: string;
  associatedAt: string;
}

export interface LoyaltyRewardRedemption {
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
  status: LoyaltyRedemptionStatus;
  redeemedAt: string;
  returnedAt: string | null;
  returnedReason: string | null;
}

export interface LoyaltyPointEvent {
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
  occurredAt: string;
}

export interface LoyaltyPointAllocation {
  id: string;
  customerId: string;
  creditEntryId: string;
  debitEntryId: string;
  points: number;
  createdAt: string;
}

export interface AppliedLoyaltyReward {
  id: string;
  name: string;
  pointsCost: number;
  benefitType: LoyaltyRewardBenefitType;
  targetDescription: string;
  coveredAmount: string;
  status: LoyaltyRedemptionStatus;
}

export interface OrderLoyaltyDetails {
  customer: LoyaltyCustomer;
  rewards: AppliedLoyaltyReward[];
}

export type OrderWithLoyalty = Order & {
  loyaltyRewardDiscountTotal: string;
  payableTotal: string;
  loyalty: OrderLoyaltyDetails | null;
};
