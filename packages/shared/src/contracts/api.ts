import type {
  CustomizationChoice,
  CustomizationGroup,
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

export interface CustomizationChoiceInput {
  id?: string | undefined;
  name: string;
  priceAdjustment?: string | undefined;
  available?: boolean | undefined;
  displayOrder?: number | undefined;
  active?: boolean | undefined;
}

export interface CustomizationGroupInput {
  id?: string | undefined;
  name: string;
  required?: boolean | undefined;
  minSelections?: number | undefined;
  maxSelections?: number | undefined;
  displayOrder?: number | undefined;
  active?: boolean | undefined;
  choices?: CustomizationChoiceInput[] | undefined;
}

export interface MenuItemInput {
  categoryId: string;
  name: string;
  description?: string | null | undefined;
  imageUrl?: string | null | undefined;
  price: string;
  available?: boolean | undefined;
  active?: boolean | undefined;
  customizationGroups?: CustomizationGroupInput[] | undefined;
}

export type MenuItemResponse = Omit<MenuItem, "customizationGroups"> & {
  customizationGroups: Array<CustomizationGroup & { choices: CustomizationChoice[] }>;
};

export interface MenuItemSaveResponse {
  item: MenuItemResponse;
}

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
