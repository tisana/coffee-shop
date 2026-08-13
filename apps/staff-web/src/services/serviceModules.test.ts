import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CreateOrderWithLoyaltyRequest,
  LoginRequest,
  LoyaltyCustomerInput,
  LoyaltyCustomerUpdate,
  LoyaltyEarningRuleInput,
  LoyaltyExpirationPolicyInput,
  LoyaltyPointsResponse,
  LoyaltyRewardOptionInput,
  LoyaltyRewardOptionUpdate,
  MenuItemInput,
  OrderHistoryQuery,
} from "@coffee-shop/shared/contracts/api";
import type {
  LoyaltyCustomer,
  LoyaltyEarningRule,
  LoyaltyExpirationPolicy,
  LoyaltyRewardOption,
} from "@coffee-shop/shared/domain/types";

import { getCurrentSession, login, logout } from "./authApi";
import {
  cancelBeverage,
  cancelLoyaltyReward,
  completeBeverage,
  completeOrder,
  confirmPickup,
} from "./fulfillmentApi";
import { getOrderHistory } from "./historyApi";
import {
  createLoyaltyCustomer,
  createLoyaltyReward,
  getLoyaltyEarningRule,
  getLoyaltyExpirationPolicy,
  getLoyaltyPhoneRegion,
  getLoyaltyPoints,
  getLoyaltyRewards,
  replaceLoyaltyEarningRule,
  replaceLoyaltyExpirationPolicy,
  searchLoyaltyCustomers,
  updateLoyaltyCustomer,
  updateLoyaltyReward,
} from "./loyaltyApi";
import {
  createMenuItem,
  deleteMenuItem,
  getMenuMaintenanceCatalog,
  updateMenuItem,
} from "./menuApi";
import {
  createCounterOrder,
  getOrderTakingMenu,
  submitOrderToQueue,
} from "./ordersApi";
import { claimQueueOrder, getQueueOrders } from "./queueApi";

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>(),
}));

vi.mock("./apiClient", () => ({
  apiClient: {
    request: requestMock,
  },
}));

const loginRequest: LoginRequest = {
  username: "barista",
  password: "barista-pass",
};

const menuItemInput: MenuItemInput = {
  categoryId: "category-coffee",
  name: "Iced latte",
  description: "Double espresso with milk",
  imageUrl: "https://example.test/iced-latte.png",
  price: "5.25",
  available: false,
  active: true,
  customizationGroups: [],
};

const counterOrderRequest: CreateOrderWithLoyaltyRequest = {
  pickupName: "Mali",
  beverages: [
    {
      menuItemId: "menu-iced-latte",
      quantity: 2,
      specialInstructions: "Less ice",
    },
  ],
  loyalty: {
    customerId: "customer-1",
    rewards: [
      {
        rewardOptionId: "reward-1",
        targetBeverageIndex: 0,
      },
    ],
  },
};

const customerInput: LoyaltyCustomerInput = {
  name: "Mali Chen",
  phone: "+66812345678",
  email: "mali@example.test",
};

const customerUpdate: LoyaltyCustomerUpdate = {
  name: "Mali S. Chen",
  email: null,
};

const earningRuleInput: LoyaltyEarningRuleInput = {
  earningType: "purchase_amount",
  amountThreshold: "10.00",
  pointsAwarded: 2,
};

const expirationPolicyInput: LoyaltyExpirationPolicyInput = {
  enabled: true,
  expirationMonths: 12,
};

const rewardInput: LoyaltyRewardOptionInput = {
  name: "Free beverage",
  pointsCost: 10,
  benefitType: "free_beverage",
  benefitDescription: "One free beverage",
  active: true,
};

const rewardUpdate: LoyaltyRewardOptionUpdate = {
  name: "Free drink",
  pointsCost: 12,
  benefitDescription: "One free standard beverage",
  active: false,
};

const customer: LoyaltyCustomer = {
  id: "customer-1",
  name: "Mali Chen",
  phone: "+66812345678",
  email: "mali@example.test",
  enrolledAt: "2026-07-01T08:00:00.000Z",
  updatedAt: "2026-07-01T08:00:00.000Z",
};

const earningRule: LoyaltyEarningRule = {
  id: "earning-rule-1",
  earningType: "purchase_amount",
  amountThreshold: "10.00",
  beverageCountThreshold: null,
  pointsAwarded: 2,
  active: true,
  effectiveAt: "2026-07-01T00:00:00.000Z",
  retiredAt: null,
};

const expirationPolicy: LoyaltyExpirationPolicy = {
  id: "expiration-policy-1",
  enabled: true,
  expirationMonths: 12,
  active: true,
  effectiveAt: "2026-07-01T00:00:00.000Z",
  retiredAt: null,
};

const reward: LoyaltyRewardOption = {
  id: "reward-1",
  name: "Free beverage",
  pointsCost: 10,
  benefitType: "free_beverage",
  benefitDescription: "One free beverage",
  active: true,
  effectiveAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const customers = [customer];
const rewards = [reward];

const pointsResponse: LoyaltyPointsResponse = {
  customer,
  asOfBusinessDate: "2026-07-30",
  summary: {
    available: 14,
    lifetimeEarned: 24,
    redeemed: 10,
    returned: 0,
    expired: 0,
    adjusted: 0,
  },
  history: [
    {
      id: "point-entry-1",
      eventType: "earned",
      pointsDelta: 2,
      reason: "Order completed",
      businessDate: "2026-07-30",
      expirationBusinessDate: "2027-07-31",
      orderId: "order-1",
      orderLabel: "2026-07-30 #42",
      rewardName: null,
      occurredAt: "2026-07-30T09:15:00.000Z",
    },
  ],
};

const responses = {
  session: { id: "staff-1", displayName: "Nok", authorized: true },
  completeBeverage: { id: "order-1", status: "in_progress" },
  cancelBeverage: { id: "order-1", status: "in_progress" },
  completeOrder: { id: "order-1", status: "completed" },
  pickup: { id: "order-1", status: "picked_up" },
  cancelledRewardOrder: { id: "order-1", loyalty: { rewards: [] } },
  maintenanceMenu: { categories: [{ id: "category-coffee" }] },
  createdMenuItem: { id: "menu-created", name: "Iced latte" },
  updatedMenuItem: { id: "menu-iced-latte", available: false },
  deletedMenuItem: { id: "menu-iced-latte", active: false },
  orderTakingMenu: { categories: [{ id: "category-coffee" }] },
  createdOrder: { id: "order-1", status: "created" },
  queuedOrder: { id: "order-1", status: "queued" },
  queue: { orders: [{ id: "order-1", status: "queued" }] },
  claimedOrder: { id: "order-1", status: "in_progress" },
  phoneRegion: { region: "TH" },
  createdCustomer: { ...customer, id: "customer-created" },
  updatedCustomer: {
    ...customer,
    name: customerUpdate.name,
    email: customerUpdate.email,
  },
  replacedEarningRule: { ...earningRule, id: "earning-rule-2" },
  replacedExpirationPolicy: { ...expirationPolicy, id: "expiration-policy-2" },
  createdReward: { ...reward, id: "reward-created" },
  updatedReward: { ...reward, ...rewardUpdate },
};

interface RequestMappingCase {
  name: string;
  invoke: () => Promise<unknown>;
  response: unknown;
  path: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  init?: RequestInit;
}

const requestMappingCases: RequestMappingCase[] = [
  {
    name: "login posts credentials",
    invoke: () => login(loginRequest),
    response: undefined,
    path: "/auth/login",
    method: "POST",
    init: { method: "POST", body: JSON.stringify(loginRequest) },
  },
  {
    name: "logout posts to the logout route",
    invoke: () => logout(),
    response: undefined,
    path: "/auth/logout",
    method: "POST",
    init: { method: "POST" },
  },
  {
    name: "session lookup gets the current staff session",
    invoke: () => getCurrentSession(),
    response: responses.session,
    path: "/staff/session",
    method: "GET",
  },
  {
    name: "beverage completion posts to the beverage action",
    invoke: () => completeBeverage("order-1", "beverage-1"),
    response: responses.completeBeverage,
    path: "/orders/order-1/beverages/beverage-1/complete",
    method: "POST",
    init: { method: "POST" },
  },
  {
    name: "beverage cancellation posts its reason",
    invoke: () =>
      cancelBeverage("order-1", "beverage-1", "Ingredient unavailable"),
    response: responses.cancelBeverage,
    path: "/orders/order-1/beverages/beverage-1/cancel",
    method: "POST",
    init: {
      method: "POST",
      body: JSON.stringify({ reason: "Ingredient unavailable" }),
    },
  },
  {
    name: "order completion posts to the completion action",
    invoke: () => completeOrder("order-1"),
    response: responses.completeOrder,
    path: "/orders/order-1/complete",
    method: "POST",
    init: { method: "POST" },
  },
  {
    name: "pickup confirmation posts to the pickup action",
    invoke: () => confirmPickup("order-1"),
    response: responses.pickup,
    path: "/orders/order-1/pickup",
    method: "POST",
    init: { method: "POST" },
  },
  {
    name: "loyalty reward cancellation posts to the reward action",
    invoke: () => cancelLoyaltyReward("order-1", "reward-1"),
    response: responses.cancelledRewardOrder,
    path: "/orders/order-1/loyalty-rewards/reward-1/cancel",
    method: "POST",
    init: { method: "POST" },
  },
  {
    name: "menu maintenance gets categories",
    invoke: () => getMenuMaintenanceCatalog(),
    response: responses.maintenanceMenu,
    path: "/menu/categories",
    method: "GET",
  },
  {
    name: "menu creation posts the item payload",
    invoke: () => createMenuItem(menuItemInput),
    response: responses.createdMenuItem,
    path: "/menu/items",
    method: "POST",
    init: { method: "POST", body: JSON.stringify(menuItemInput) },
  },
  {
    name: "menu update patches item details and availability",
    invoke: () => updateMenuItem("menu-iced-latte", menuItemInput),
    response: responses.updatedMenuItem,
    path: "/menu/items/menu-iced-latte",
    method: "PATCH",
    init: { method: "PATCH", body: JSON.stringify(menuItemInput) },
  },
  {
    name: "menu deletion deletes the item",
    invoke: () => deleteMenuItem("menu-iced-latte"),
    response: responses.deletedMenuItem,
    path: "/menu/items/menu-iced-latte",
    method: "DELETE",
    init: { method: "DELETE" },
  },
  {
    name: "order taking gets menu categories",
    invoke: () => getOrderTakingMenu(),
    response: responses.orderTakingMenu,
    path: "/menu/categories",
    method: "GET",
  },
  {
    name: "counter order creation posts beverages and loyalty redemption",
    invoke: () => createCounterOrder(counterOrderRequest),
    response: responses.createdOrder,
    path: "/orders",
    method: "POST",
    init: { method: "POST", body: JSON.stringify(counterOrderRequest) },
  },
  {
    name: "queue submission posts to the order queue action",
    invoke: () => submitOrderToQueue("order-1"),
    response: responses.queuedOrder,
    path: "/orders/order-1/queue",
    method: "POST",
    init: { method: "POST" },
  },
  {
    name: "queue listing gets active orders",
    invoke: () => getQueueOrders(),
    response: responses.queue,
    path: "/queue/orders",
    method: "GET",
  },
  {
    name: "queue claiming posts to the claim action",
    invoke: () => claimQueueOrder("order-1"),
    response: responses.claimedOrder,
    path: "/queue/orders/order-1/claim",
    method: "POST",
    init: { method: "POST" },
  },
  {
    name: "phone region lookup gets loyalty configuration",
    invoke: () => getLoyaltyPhoneRegion(),
    response: responses.phoneRegion,
    path: "/loyalty/phone-region",
    method: "GET",
  },
  {
    name: "customer creation posts the identity payload",
    invoke: () => createLoyaltyCustomer(customerInput),
    response: responses.createdCustomer,
    path: "/loyalty/customers",
    method: "POST",
    init: { method: "POST", body: JSON.stringify(customerInput) },
  },
  {
    name: "customer update patches the identity payload",
    invoke: () => updateLoyaltyCustomer("customer-1", customerUpdate),
    response: responses.updatedCustomer,
    path: "/loyalty/customers/customer-1",
    method: "PATCH",
    init: { method: "PATCH", body: JSON.stringify(customerUpdate) },
  },
  {
    name: "earning rule replacement puts the configuration payload",
    invoke: () => replaceLoyaltyEarningRule(earningRuleInput),
    response: responses.replacedEarningRule,
    path: "/loyalty/config/earning-rule",
    method: "PUT",
    init: { method: "PUT", body: JSON.stringify(earningRuleInput) },
  },
  {
    name: "expiration policy replacement puts the configuration payload",
    invoke: () => replaceLoyaltyExpirationPolicy(expirationPolicyInput),
    response: responses.replacedExpirationPolicy,
    path: "/loyalty/config/expiration-policy",
    method: "PUT",
    init: { method: "PUT", body: JSON.stringify(expirationPolicyInput) },
  },
  {
    name: "points lookup gets the customer balance and history",
    invoke: () => getLoyaltyPoints("customer-1"),
    response: pointsResponse,
    path: "/loyalty/customers/customer-1/points",
    method: "GET",
  },
  {
    name: "reward creation posts the reward payload",
    invoke: () => createLoyaltyReward(rewardInput),
    response: responses.createdReward,
    path: "/loyalty/rewards",
    method: "POST",
    init: { method: "POST", body: JSON.stringify(rewardInput) },
  },
  {
    name: "reward update patches the mutable reward fields",
    invoke: () => updateLoyaltyReward("reward-1", rewardUpdate),
    response: responses.updatedReward,
    path: "/loyalty/rewards/reward-1",
    method: "PATCH",
    init: { method: "PATCH", body: JSON.stringify(rewardUpdate) },
  },
];

interface EnvelopeMappingCase {
  name: string;
  invoke: () => Promise<unknown>;
  response: unknown;
  returned: unknown;
  path: string;
}

const envelopeMappingCases: EnvelopeMappingCase[] = [
  {
    name: "customer search encodes the query and unwraps customers",
    invoke: () => searchLoyaltyCustomers("Mali +66"),
    response: { customers },
    returned: customers,
    path: "/loyalty/customers?query=Mali%20%2B66",
  },
  {
    name: "earning rule lookup unwraps the active rule",
    invoke: () => getLoyaltyEarningRule(),
    response: { rule: earningRule },
    returned: earningRule,
    path: "/loyalty/config/earning-rule",
  },
  {
    name: "expiration policy lookup unwraps the active policy",
    invoke: () => getLoyaltyExpirationPolicy(),
    response: { policy: expirationPolicy },
    returned: expirationPolicy,
    path: "/loyalty/config/expiration-policy",
  },
  {
    name: "active reward lookup unwraps rewards without an inactive query",
    invoke: () => getLoyaltyRewards(),
    response: { rewards },
    returned: rewards,
    path: "/loyalty/rewards",
  },
  {
    name: "all reward lookup includes inactive rewards and unwraps the response",
    invoke: () => getLoyaltyRewards(true),
    response: { rewards },
    returned: rewards,
    path: "/loyalty/rewards?includeInactive=true",
  },
];

describe("staff-web service modules", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it.each(requestMappingCases)(
    "$name",
    async ({ invoke, response, path, method, init }) => {
      requestMock.mockResolvedValueOnce(response);

      const returned = await invoke();
      const call = requestMock.mock.calls[0];

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(call).toEqual(init === undefined ? [path] : [path, init]);
      expect(call?.[1]?.method ?? "GET").toBe(method);
      expect(returned).toBe(response);
    },
  );

  it.each([
    {
      name: "default history query",
      query: {} satisfies OrderHistoryQuery,
      path: "/orders/history",
    },
    {
      name: "populated current-day history query",
      query: {
        dailyOrderNumber: 42,
        status: "completed",
        pickupName: "Mali Chen",
      } satisfies OrderHistoryQuery,
      path: "/orders/history?dailyOrderNumber=42&status=completed&pickupName=Mali+Chen",
    },
  ])("serializes the $name", async ({ query, path }) => {
    const response = { orders: [{ id: "order-history-1" }] };
    requestMock.mockResolvedValueOnce(response);

    const returned = await getOrderHistory(query);
    const call = requestMock.mock.calls[0];

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(call).toEqual([path]);
    expect(call?.[1]?.method ?? "GET").toBe("GET");
    expect(returned).toBe(response);
  });

  it.each(envelopeMappingCases)(
    "$name",
    async ({ invoke, response, returned, path }) => {
      requestMock.mockResolvedValueOnce(response);

      const result = await invoke();
      const call = requestMock.mock.calls[0];

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(call).toEqual([path]);
      expect(call?.[1]?.method ?? "GET").toBe("GET");
      expect(result).toBe(returned);
    },
  );
});
