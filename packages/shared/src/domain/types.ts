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
