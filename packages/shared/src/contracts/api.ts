import type {
  CustomizationChoice,
  CustomizationGroup,
  MenuCategory,
  MenuItem,
  Order,
  OrderStatus,
  BeverageStatus,
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

export type ReportPeriodType = "daily" | "weekly" | "monthly";

export interface ReportFilter {
  startDate: string;
  endDate: string;
  period: ReportPeriodType;
  statuses: OrderStatus[];
  menuCategoryId: string | null;
  menuItemId: string | null;
}

export interface ReportSalesQuery {
  startDate?: string;
  endDate?: string;
  period?: ReportPeriodType;
  statuses?: OrderStatus[];
  menuCategoryId?: string;
  menuItemId?: string;
}

export interface ReportOrdersQuery extends ReportSalesQuery {
  periodKey?: string;
  combinationKey?: string;
}

export interface OverallReportTotals {
  totalSales: string;
  orderCount: number;
  averageOrderValue: string;
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
  salesAmount: string;
}

export interface PopularCombinationReport {
  rank: number;
  combinationKey: string;
  combinationLabel: string;
  orderFrequency: number;
  itemCount: number;
  salesAmount: string;
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
  unitPrice: string;
  lineTotal: string;
  status: BeverageStatus;
  selectedCustomizations: string[];
}

export interface ReportOrderDetail {
  orderId: string;
  businessDate: string;
  dailyOrderNumber: number;
  status: OrderStatus;
  capturedOrderTotal: string;
  reportableTotal: string;
  items: ReportOrderItem[];
  createdAt: string;
  completedAt: string | null;
  pickedUpAt: string | null;
}

export interface ReportOrdersResponse {
  filters: ReportFilter;
  orders: ReportOrderDetail[];
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}
