import type {
  MenuCategory,
  MenuItem,
  Order,
  OrderStatus,
  SelectedCustomization,
  StaffUser
} from "../domain/types";

export type QueueOrder = Order & {
  assignedBaristaDisplayName: string | null;
};

export interface LoginRequest {
  username: string;
  password: string;
}

export type CurrentSessionResponse = StaffUser;

export interface CreateOrderRequest {
  pickupName?: string;
  beverages: Array<{
    menuItemId: string;
    quantity: number;
    selectedCustomizations?: SelectedCustomization[];
    specialInstructions?: string;
  }>;
}

export type CreateOrderResponse = Order;

export interface QueueOrdersResponse {
  orders: QueueOrder[];
}

export interface MenuCategoriesResponse {
  categories: MenuCategory[];
}

export type MenuItemInput = Omit<MenuItem, "id" | "customizationGroups" | "displayOrder"> & {
  customizationGroups?: Array<{
    id?: string;
    name: string;
    required?: boolean;
    minSelections?: number;
    maxSelections?: number;
    displayOrder?: number;
    active?: boolean;
    choices?: Array<{
      id?: string;
      name: string;
      priceAdjustment?: string;
      available?: boolean;
      displayOrder?: number;
      active?: boolean;
    }>;
  }>;
};

export interface BeverageCancelRequest {
  reason?: string;
}

export interface OrderHistoryQuery {
  dailyOrderNumber?: number;
  status?: OrderStatus;
  pickupName?: string;
}

export interface OrderHistoryResponse {
  orders: Order[];
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}
