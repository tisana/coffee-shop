import {
  boolean,
  check,
  date,
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
  varchar
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import type { SelectedCustomizationSnapshot } from "@coffee-shop/shared/domain/types";

export const staffAuthorizationStatusEnum = pgEnum("staff_authorization_status", [
  "authorized",
  "inactive"
]);

export const orderStatusEnum = pgEnum("order_status", [
  "created",
  "queued",
  "in_progress",
  "completed",
  "picked_up",
  "cancelled"
]);

export const beverageStatusEnum = pgEnum("beverage_status", [
  "pending",
  "completed",
  "cancelled"
]);

export const staffUsers = pgTable("staff_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 80 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  authorizationStatus: staffAuthorizationStatusEnum("authorization_status")
    .notNull()
    .default("authorized"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  usernameUnique: uniqueIndex("staff_users_username_unique").on(table.username)
}));

export const staffSessions = pgTable("staff_sessions", {
  id: text("id").primaryKey(),
  staffId: uuid("staff_id")
    .notNull()
    .references(() => staffUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  staffIdIndex: index("staff_sessions_staff_id_idx").on(table.staffId),
  expiresAtIndex: index("staff_sessions_expires_at_idx").on(table.expiresAt)
}));

export const menuCategories = pgTable("menu_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const menuItems = pgTable("menu_items", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  categoryIndex: index("menu_items_category_id_idx").on(table.categoryId)
}));

export const customizationGroups = pgTable("customization_groups", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  menuItemIndex: index("customization_groups_menu_item_id_idx").on(table.menuItemId),
  selectionBounds: check(
    "customization_groups_selection_bounds",
    sql`${table.minSelections} >= 0 AND ${table.maxSelections} >= ${table.minSelections} AND (${table.required} OR ${table.minSelections} = 0)`
  )
}));

export const customizationChoices = pgTable("customization_choices", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  groupIndex: index("customization_choices_group_id_idx").on(table.customizationGroupId)
}));

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessDate: date("business_date").notNull(),
  dailyOrderNumber: integer("daily_order_number").notNull(),
  pickupName: varchar("pickup_name", { length: 120 }),
  status: orderStatusEnum("status").notNull().default("created"),
  createdByStaffId: uuid("created_by_staff_id")
    .notNull()
    .references(() => staffUsers.id, { onDelete: "restrict" }),
  assignedBaristaId: uuid("assigned_barista_id").references(() => staffUsers.id, {
    onDelete: "set null"
  }),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  queuedAt: timestamp("queued_at", { withTimezone: true }),
  inProgressAt: timestamp("in_progress_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true })
}, (table) => ({
  dailyNumberUnique: uniqueIndex("orders_business_date_daily_number_unique").on(
    table.businessDate,
    table.dailyOrderNumber
  ),
  statusIndex: index("orders_status_idx").on(table.status),
  businessDateIndex: index("orders_business_date_idx").on(table.businessDate)
}));

export const orderBeverages = pgTable("order_beverages", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  sourceMenuItemId: uuid("source_menu_item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "restrict" }),
  nameSnapshot: varchar("name_snapshot", { length: 160 }).notNull(),
  quantity: integer("quantity").notNull(),
  priceSnapshot: numeric("price_snapshot", { precision: 10, scale: 2 }).notNull(),
  selectedCustomizationsSnapshot: jsonb("selected_customizations_snapshot")
    .$type<SelectedCustomizationSnapshot[]>()
    .notNull()
    .default([]),
  specialInstructions: text("special_instructions"),
  status: beverageStatusEnum("status").notNull().default("pending"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason")
}, (table) => ({
  orderIndex: index("order_beverages_order_id_idx").on(table.orderId),
  quantityPositive: check("order_beverages_quantity_positive", sql`${table.quantity} > 0`)
}));

export const dailyOrderSequences = pgTable("daily_order_sequences", {
  businessDate: date("business_date").notNull(),
  lastIssuedNumber: integer("last_issued_number").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  pk: primaryKey({ columns: [table.businessDate] })
}));
