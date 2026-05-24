# Data Model: Shop Staff Operations

## Staff User

Represents an authorized staff member.

**Fields**
- `id`: stable staff identifier
- `username`: unique login name
- `passwordHash`: hashed password for local staff authentication
- `displayName`: name shown on orders taken or claimed
- `authorizationStatus`: authorized or inactive

**Rules**
- Only authorized staff can create orders, claim queue items, update statuses, confirm pickup, cancel beverages or orders, and maintain menu items.
- Passwords are never stored in plaintext.
- First version does not distinguish staff roles.

## Menu Category

Groups menu items for order taking.

**Fields**
- `id`
- `name`
- `displayOrder`
- `active`

**Relationships**
- Has many menu items.

## Menu Item

Represents a beverage or sellable product that can be added to a counter order.

**Fields**
- `id`
- `categoryId`
- `name`
- `description`
- `imageUrl`: optional menu thumbnail image shown during counter order selection
- `price`
- `available`
- `active`
- `customizationGroups`: scoped customization configuration for this item, such as syrup choices, milk choices, size, temperature, or sweetness

**Rules**
- Unavailable or inactive items cannot be selected for new counter orders.
- Staff can select only customizations defined on the menu item.
- Each customization group defines whether selection is required, how many choices are allowed, and which choices are available.
- Changes affect future orders only.

## Customization Group

Defines one customization category available for a menu item.

**Fields**
- `id`
- `menuItemId`
- `name`: staff-facing group name, such as Syrup, Milk, Size, Temperature, or Sweetness
- `required`: whether staff must choose from this group when adding the item to an order
- `minSelections`
- `maxSelections`
- `displayOrder`
- `active`

**Relationships**
- Belongs to one menu item.
- Has many customization choices.

**Rules**
- `minSelections` must be 0 unless the group is required.
- `maxSelections` must be at least `minSelections`.
- A customization group cannot be selected directly; staff select one or more active choices inside the group.

## Customization Choice

Defines one allowed option inside a customization group.

**Fields**
- `id`
- `customizationGroupId`
- `name`: choice label, such as Vanilla, Caramel, Oat Milk, Whole Milk, Hot, or Iced
- `priceAdjustment`
- `available`
- `displayOrder`
- `active`

**Relationships**
- Belongs to one customization group.

**Rules**
- Unavailable or inactive choices cannot be selected for new counter orders.
- Choice price adjustments contribute to the order beverage price snapshot.

## Order

Represents a customer order created by staff.

**Fields**
- `id`: durable system identity
- `businessDate`: date used with daily order number for historical uniqueness
- `dailyOrderNumber`: short customer-facing number for callout
- `pickupName`: optional customer pickup name
- `status`: created, queued, in_progress, completed, picked_up, cancelled. `completed` means the order is ready for pickup and waiting for pickup confirmation.
- `createdByStaffId`
- `assignedBaristaId`
- `total`
- `createdAt`
- `queuedAt`
- `inProgressAt`
- `completedAt`
- `pickedUpAt`
- `cancelledAt`

**Relationships**
- Has many order beverages.
- References staff user who created it.
- Optionally references staff user currently brewing it.

**State transitions**
- `created -> queued`
- `queued -> in_progress`
- `in_progress -> completed`
- `completed -> picked_up`
- `created -> cancelled`
- `queued -> cancelled`
- `in_progress -> cancelled`
- `completed -> cancelled` only before pickup when staff resolves the whole order

**Rules**
- Completed and picked-up orders cannot return to active preparation states.
- A completed order is ready for pickup and remains active until pickup is confirmed.
- Pickup cannot be confirmed before completion.
- Completion is allowed only when all non-cancelled order beverages are completed.
- Claiming a queued order must be atomic so only one barista can move it to in progress.

## Order Beverage

Represents a purchased beverage snapshot within an order.

**Fields**
- `id`
- `orderId`
- `sourceMenuItemId`
- `nameSnapshot`
- `quantity`
- `priceSnapshot`
- `selectedCustomizationsSnapshot`
- `specialInstructions`
- `status`: pending, completed, cancelled
- `completedAt`
- `cancelledAt`
- `cancellationReason`

**Rules**
- Snapshot fields do not change when menu items change later.
- Selected customization snapshots preserve group names, choice names, and price adjustments as chosen at order time.
- A cancelled beverage does not block the order from completion.
- If one beverage is cancelled, remaining beverages continue through brewing.

## Daily Order Sequence

Tracks short customer-facing order numbers for each business day.

**Fields**
- `businessDate`
- `lastIssuedNumber`
- `updatedAt`

**Rules**
- The next daily order number is generated atomically during order creation.
- Historical uniqueness is `businessDate + dailyOrderNumber`.
- Sequence reset occurs by using a new business date.
- PostgreSQL transactions must protect sequence updates from duplicate numbers when multiple baristas create orders at the same time.
