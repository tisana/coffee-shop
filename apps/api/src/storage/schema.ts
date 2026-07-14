import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import type { SelectedCustomizationSnapshot } from "@coffee-shop/shared/domain/types";

export const staffAuthorizationStatusEnum = pgEnum(
  "staff_authorization_status",
  ["authorized", "inactive"],
);

export const orderStatusEnum = pgEnum("order_status", [
  "created",
  "queued",
  "in_progress",
  "completed",
  "picked_up",
  "cancelled",
]);

export const beverageStatusEnum = pgEnum("beverage_status", [
  "pending",
  "completed",
  "cancelled",
]);

export const loyaltyEarningTypeEnum = pgEnum("loyalty_earning_type", [
  "purchase_amount",
  "beverage_count",
]);

export const loyaltyRewardBenefitTypeEnum = pgEnum(
  "loyalty_reward_benefit_type",
  ["free_beverage", "size_upgrade"],
);

export const loyaltyRedemptionStatusEnum = pgEnum("loyalty_redemption_status", [
  "active",
  "returned",
]);

export const loyaltyPointEventTypeEnum = pgEnum("loyalty_point_event_type", [
  "earned",
  "redeemed",
  "returned",
  "expired",
  "adjusted",
]);

export const staffUsers = pgTable(
  "staff_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 80 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    authorizationStatus: staffAuthorizationStatusEnum("authorization_status")
      .notNull()
      .default("authorized"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    usernameUnique: uniqueIndex("staff_users_username_unique").on(
      table.username,
    ),
  }),
);

export const staffSessions = pgTable(
  "staff_sessions",
  {
    id: text("id").primaryKey(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    staffIdIndex: index("staff_sessions_staff_id_idx").on(table.staffId),
    expiresAtIndex: index("staff_sessions_expires_at_idx").on(table.expiresAt),
  }),
);

export const loyaltyCustomers = pgTable(
  "loyalty_customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    phoneDisplay: varchar("phone_display", { length: 40 }).notNull(),
    phoneNormalized: varchar("phone_normalized", { length: 16 }).notNull(),
    email: varchar("email", { length: 254 }),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    phoneNormalizedUnique: uniqueIndex(
      "loyalty_customers_phone_normalized_unique",
    ).on(table.phoneNormalized),
    emailCaseInsensitiveUnique: uniqueIndex(
      "loyalty_customers_email_ci_unique",
    )
      .on(sql`lower(${table.email})`)
      .where(sql`${table.email} IS NOT NULL`),
    nameIndex: index("loyalty_customers_name_idx").on(table.name),
    normalizedPhoneE164: check(
      "loyalty_customers_phone_normalized_e164",
      sql`${table.phoneNormalized} ~ '^\\+[1-9][0-9]{1,14}$'`,
    ),
  }),
);

export const menuCategories = pgTable("menu_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => menuCategories.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    available: boolean("available").notNull().default(true),
    active: boolean("active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    categoryIndex: index("menu_items_category_id_idx").on(table.categoryId),
  }),
);

export const customizationGroups = pgTable(
  "customization_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    required: boolean("required").notNull().default(false),
    minSelections: integer("min_selections").notNull().default(0),
    maxSelections: integer("max_selections").notNull().default(1),
    displayOrder: integer("display_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    menuItemIndex: index("customization_groups_menu_item_id_idx").on(
      table.menuItemId,
    ),
    selectionBounds: check(
      "customization_groups_selection_bounds",
      sql`${table.minSelections} >= 0 AND ${table.maxSelections} >= ${table.minSelections} AND (${table.required} OR ${table.minSelections} = 0)`,
    ),
  }),
);

export const customizationChoices = pgTable(
  "customization_choices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customizationGroupId: uuid("customization_group_id")
      .notNull()
      .references(() => customizationGroups.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    priceAdjustment: numeric("price_adjustment", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    available: boolean("available").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    groupIndex: index("customization_choices_group_id_idx").on(
      table.customizationGroupId,
    ),
  }),
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessDate: date("business_date").notNull(),
    dailyOrderNumber: integer("daily_order_number").notNull(),
    pickupName: varchar("pickup_name", { length: 120 }),
    status: orderStatusEnum("status").notNull().default("created"),
    createdByStaffId: uuid("created_by_staff_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "restrict" }),
    assignedBaristaId: uuid("assigned_barista_id").references(
      () => staffUsers.id,
      {
        onDelete: "set null",
      },
    ),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    loyaltyRewardDiscountTotal: numeric("loyalty_reward_discount_total", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0.00"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    queuedAt: timestamp("queued_at", { withTimezone: true }),
    inProgressAt: timestamp("in_progress_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (table) => ({
    dailyNumberUnique: uniqueIndex(
      "orders_business_date_daily_number_unique",
    ).on(table.businessDate, table.dailyOrderNumber),
    statusIndex: index("orders_status_idx").on(table.status),
    businessDateIndex: index("orders_business_date_idx").on(table.businessDate),
    loyaltyRewardDiscountBounds: check(
      "orders_loyalty_reward_discount_bounds",
      sql`${table.loyaltyRewardDiscountTotal} >= 0 AND ${table.loyaltyRewardDiscountTotal} <= ${table.total}`,
    ),
  }),
);

export const orderBeverages = pgTable(
  "order_beverages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    sourceMenuItemId: uuid("source_menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "restrict" }),
    nameSnapshot: varchar("name_snapshot", { length: 160 }).notNull(),
    quantity: integer("quantity").notNull(),
    priceSnapshot: numeric("price_snapshot", {
      precision: 10,
      scale: 2,
    }).notNull(),
    selectedCustomizationsSnapshot: jsonb("selected_customizations_snapshot")
      .$type<SelectedCustomizationSnapshot[]>()
      .notNull()
      .default([]),
    specialInstructions: text("special_instructions"),
    status: beverageStatusEnum("status").notNull().default("pending"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
  },
  (table) => ({
    orderIndex: index("order_beverages_order_id_idx").on(table.orderId),
    quantityPositive: check(
      "order_beverages_quantity_positive",
      sql`${table.quantity} > 0`,
    ),
  }),
);

export const dailyOrderSequences = pgTable(
  "daily_order_sequences",
  {
    businessDate: date("business_date").notNull(),
    lastIssuedNumber: integer("last_issued_number").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.businessDate] }),
  }),
);

export const loyaltyEarningRules = pgTable(
  "loyalty_earning_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    earningType: loyaltyEarningTypeEnum("earning_type").notNull(),
    amountThreshold: numeric("amount_threshold", { precision: 10, scale: 2 }),
    beverageCountThreshold: integer("beverage_count_threshold"),
    pointsAwarded: integer("points_awarded").notNull(),
    active: boolean("active").notNull().default(true),
    effectiveAt: timestamp("effective_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdByStaffId: uuid("created_by_staff_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "restrict" }),
  },
  (table) => ({
    activeUnique: uniqueIndex("loyalty_earning_rules_one_active_unique")
      .on(table.active)
      .where(sql`${table.active} = true`),
    activeIndex: index("loyalty_earning_rules_active_idx").on(table.active),
    positivePoints: check(
      "loyalty_earning_rules_positive_points",
      sql`${table.pointsAwarded} > 0`,
    ),
    thresholdMatchesType: check(
      "loyalty_earning_rules_threshold_matches_type",
      sql`(
      ${table.earningType} = 'purchase_amount'
      AND ${table.amountThreshold} IS NOT NULL
      AND ${table.amountThreshold} > 0
      AND ${table.beverageCountThreshold} IS NULL
    ) OR (
      ${table.earningType} = 'beverage_count'
      AND ${table.amountThreshold} IS NULL
      AND ${table.beverageCountThreshold} IS NOT NULL
      AND ${table.beverageCountThreshold} > 0
    )`,
    ),
    activeRuleNotRetired: check(
      "loyalty_earning_rules_active_not_retired",
      sql`NOT ${table.active} OR ${table.retiredAt} IS NULL`,
    ),
  }),
);

export const loyaltyExpirationPolicies = pgTable(
  "loyalty_expiration_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enabled: boolean("enabled").notNull(),
    expirationMonths: integer("expiration_months"),
    active: boolean("active").notNull().default(true),
    effectiveAt: timestamp("effective_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdByStaffId: uuid("created_by_staff_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "restrict" }),
  },
  (table) => ({
    activeUnique: uniqueIndex("loyalty_expiration_policies_one_active_unique")
      .on(table.active)
      .where(sql`${table.active} = true`),
    activeIndex: index("loyalty_expiration_policies_active_idx").on(
      table.active,
    ),
    expirationMatchesEnabled: check(
      "loyalty_expiration_policies_enabled_months",
      sql`(${table.enabled} AND ${table.expirationMonths} IS NOT NULL AND ${table.expirationMonths} > 0)
      OR (NOT ${table.enabled} AND ${table.expirationMonths} IS NULL)`,
    ),
    activePolicyNotRetired: check(
      "loyalty_expiration_policies_active_not_retired",
      sql`NOT ${table.active} OR ${table.retiredAt} IS NULL`,
    ),
  }),
);

export const loyaltyRewardOptions = pgTable(
  "loyalty_reward_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    pointsCost: integer("points_cost").notNull(),
    benefitType: loyaltyRewardBenefitTypeEnum("benefit_type").notNull(),
    benefitDescription: varchar("benefit_description", {
      length: 500,
    }).notNull(),
    active: boolean("active").notNull().default(true),
    effectiveAt: timestamp("effective_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdByStaffId: uuid("created_by_staff_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "restrict" }),
    updatedByStaffId: uuid("updated_by_staff_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "restrict" }),
  },
  (table) => ({
    activeIndex: index("loyalty_reward_options_active_idx").on(table.active),
    positivePointsCost: check(
      "loyalty_reward_options_positive_points_cost",
      sql`${table.pointsCost} > 0`,
    ),
    nonBlankName: check(
      "loyalty_reward_options_non_blank_name",
      sql`length(trim(${table.name})) > 0`,
    ),
    nonBlankDescription: check(
      "loyalty_reward_options_non_blank_description",
      sql`length(trim(${table.benefitDescription})) > 0`,
    ),
  }),
);

export const loyaltyOrderAssociations = pgTable(
  "loyalty_order_associations",
  {
    orderId: uuid("order_id")
      .primaryKey()
      .references(() => orders.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => loyaltyCustomers.id, { onDelete: "restrict" }),
    associatedByStaffId: uuid("associated_by_staff_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "restrict" }),
    associatedAt: timestamp("associated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    customerIndex: index("loyalty_order_associations_customer_id_idx").on(
      table.customerId,
    ),
  }),
);

export const loyaltyRewardRedemptions = pgTable(
  "loyalty_reward_redemptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => loyaltyCustomers.id, { onDelete: "restrict" }),
    rewardOptionId: uuid("reward_option_id")
      .notNull()
      .references(() => loyaltyRewardOptions.id, { onDelete: "restrict" }),
    targetOrderBeverageId: uuid("target_order_beverage_id")
      .notNull()
      .references(() => orderBeverages.id, { onDelete: "restrict" }),
    targetCustomizationChoiceId: uuid(
      "target_customization_choice_id",
    ).references(() => customizationChoices.id, { onDelete: "restrict" }),
    rewardNameSnapshot: varchar("reward_name_snapshot", {
      length: 120,
    }).notNull(),
    pointsCostSnapshot: integer("points_cost_snapshot").notNull(),
    benefitTypeSnapshot: loyaltyRewardBenefitTypeEnum(
      "benefit_type_snapshot",
    ).notNull(),
    benefitDescriptionSnapshot: varchar("benefit_description_snapshot", {
      length: 500,
    }).notNull(),
    targetDescriptionSnapshot: varchar("target_description_snapshot", {
      length: 500,
    }).notNull(),
    coveredAmountSnapshot: numeric("covered_amount_snapshot", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0.00"),
    coveredBeverageQuantity: integer("covered_beverage_quantity")
      .notNull()
      .default(0),
    status: loyaltyRedemptionStatusEnum("status").notNull().default("active"),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    returnedReason: text("returned_reason"),
    redeemedByStaffId: uuid("redeemed_by_staff_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "restrict" }),
    returnedByStaffId: uuid("returned_by_staff_id").references(
      () => staffUsers.id,
      {
        onDelete: "restrict",
      },
    ),
  },
  (table) => ({
    orderIndex: index("loyalty_reward_redemptions_order_id_idx").on(
      table.orderId,
    ),
    customerIndex: index("loyalty_reward_redemptions_customer_id_idx").on(
      table.customerId,
    ),
    activeTargetIndex: index("loyalty_reward_redemptions_active_target_idx")
      .on(table.targetOrderBeverageId)
      .where(sql`${table.status} = 'active'`),
    positivePointsCost: check(
      "loyalty_reward_redemptions_positive_points_cost",
      sql`${table.pointsCostSnapshot} > 0`,
    ),
    nonNegativeCoverage: check(
      "loyalty_reward_redemptions_non_negative_coverage",
      sql`${table.coveredAmountSnapshot} >= 0`,
    ),
    benefitTargetConsistency: check(
      "loyalty_reward_redemptions_benefit_target_consistency",
      sql`(
      ${table.benefitTypeSnapshot} = 'free_beverage'
      AND ${table.targetCustomizationChoiceId} IS NULL
      AND ${table.coveredBeverageQuantity} = 1
    ) OR (
      ${table.benefitTypeSnapshot} = 'size_upgrade'
      AND ${table.targetCustomizationChoiceId} IS NOT NULL
      AND ${table.coveredBeverageQuantity} = 0
    )`,
    ),
    returnedStatusConsistency: check(
      "loyalty_reward_redemptions_returned_status_consistency",
      sql`(
      ${table.status} = 'active'
      AND ${table.returnedAt} IS NULL
      AND ${table.returnedByStaffId} IS NULL
    ) OR (
      ${table.status} = 'returned'
      AND ${table.returnedAt} IS NOT NULL
      AND ${table.returnedByStaffId} IS NOT NULL
    )`,
    ),
  }),
);

export const loyaltyPointLedgerEntries = pgTable(
  "loyalty_point_ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => loyaltyCustomers.id, { onDelete: "restrict" }),
    eventType: loyaltyPointEventTypeEnum("event_type").notNull(),
    pointsDelta: integer("points_delta").notNull(),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "restrict",
    }),
    rewardRedemptionId: uuid("reward_redemption_id").references(
      () => loyaltyRewardRedemptions.id,
      {
        onDelete: "restrict",
      },
    ),
    earningRuleId: uuid("earning_rule_id").references(
      () => loyaltyEarningRules.id,
      {
        onDelete: "restrict",
      },
    ),
    expirationPolicyId: uuid("expiration_policy_id").references(
      () => loyaltyExpirationPolicies.id,
      {
        onDelete: "restrict",
      },
    ),
    earnedBusinessDate: date("earned_business_date"),
    expirationBusinessDate: date("expiration_business_date"),
    reason: varchar("reason", { length: 500 }).notNull(),
    createdByStaffId: uuid("created_by_staff_id").references(
      () => staffUsers.id,
      {
        onDelete: "restrict",
      },
    ),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    customerOccurredAtIndex: index(
      "loyalty_point_ledger_entries_customer_occurred_at_idx",
    ).on(table.customerId, table.occurredAt),
    expirationIndex: index(
      "loyalty_point_ledger_entries_expiration_business_date_idx",
    ).on(table.customerId, table.expirationBusinessDate),
    customerIdUnique: uniqueIndex(
      "loyalty_point_ledger_entries_id_customer_unique",
    ).on(table.id, table.customerId),
    earnedOrderUnique: uniqueIndex(
      "loyalty_point_ledger_entries_earned_order_unique",
    )
      .on(table.orderId)
      .where(sql`${table.eventType} = 'earned'`),
    adjustedOrderUnique: uniqueIndex(
      "loyalty_point_ledger_entries_adjusted_order_unique",
    )
      .on(table.orderId)
      .where(
        sql`${table.eventType} = 'adjusted' AND ${table.orderId} IS NOT NULL`,
      ),
    redeemedRewardUnique: uniqueIndex(
      "loyalty_point_ledger_entries_redeemed_reward_unique",
    )
      .on(table.rewardRedemptionId)
      .where(
        sql`${table.eventType} = 'redeemed' AND ${table.rewardRedemptionId} IS NOT NULL`,
      ),
    nonZeroDelta: check(
      "loyalty_point_ledger_entries_non_zero_delta",
      sql`${table.pointsDelta} <> 0`,
    ),
    eventSign: check(
      "loyalty_point_ledger_entries_event_sign",
      sql`(
      ${table.eventType} IN ('earned', 'returned')
      AND ${table.pointsDelta} > 0
    ) OR (
      ${table.eventType} IN ('redeemed', 'expired')
      AND ${table.pointsDelta} < 0
    ) OR ${table.eventType} = 'adjusted'`,
    ),
    positiveCreditsHaveBusinessDate: check(
      "loyalty_point_ledger_entries_positive_credit_business_date",
      sql`${table.eventType} NOT IN ('earned', 'returned') OR ${table.earnedBusinessDate} IS NOT NULL`,
    ),
  }),
);

export const loyaltyPointAllocations = pgTable(
  "loyalty_point_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id").notNull(),
    creditEntryId: uuid("credit_entry_id").notNull(),
    debitEntryId: uuid("debit_entry_id").notNull(),
    points: integer("points").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    creditEntryReference: foreignKey({
      columns: [table.creditEntryId, table.customerId],
      foreignColumns: [
        loyaltyPointLedgerEntries.id,
        loyaltyPointLedgerEntries.customerId,
      ],
      name: "loyalty_point_allocations_credit_entry_customer_fk",
    }).onDelete("restrict"),
    debitEntryReference: foreignKey({
      columns: [table.debitEntryId, table.customerId],
      foreignColumns: [
        loyaltyPointLedgerEntries.id,
        loyaltyPointLedgerEntries.customerId,
      ],
      name: "loyalty_point_allocations_debit_entry_customer_fk",
    }).onDelete("restrict"),
    customerIndex: index("loyalty_point_allocations_customer_id_idx").on(
      table.customerId,
    ),
    creditIndex: index("loyalty_point_allocations_credit_entry_id_idx").on(
      table.creditEntryId,
    ),
    debitIndex: index("loyalty_point_allocations_debit_entry_id_idx").on(
      table.debitEntryId,
    ),
    debitCreditUnique: uniqueIndex(
      "loyalty_point_allocations_debit_credit_unique",
    ).on(table.debitEntryId, table.creditEntryId),
    positivePoints: check(
      "loyalty_point_allocations_positive_points",
      sql`${table.points} > 0`,
    ),
    distinctEntries: check(
      "loyalty_point_allocations_distinct_entries",
      sql`${table.creditEntryId} <> ${table.debitEntryId}`,
    ),
  }),
);
