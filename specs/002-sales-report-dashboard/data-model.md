# Data Model: Sales Report Dashboard

## Report Filter

Represents the criteria applied to all dashboard graphs and tables.

**Fields**
- `startDate`: first shop business date included in the report
- `endDate`: last shop business date included in the report
- `period`: daily, weekly, or monthly
- `statuses`: order statuses included in the report; defaults to completed and picked_up
- `menuCategoryId`: optional category filter
- `menuItemId`: optional item filter based on the source menu item id

**Rules**
- `startDate` must be on or before `endDate`.
- Default status filters include completed and picked_up orders.
- Fully cancelled orders are excluded from default sales totals.
- Date filters use shop business dates, not viewer-local timestamps.

## Report Period

Represents one daily, weekly, or monthly bucket.

**Fields**
- `key`: stable period identifier, such as a date, week label, or month label
- `label`: staff-facing period label
- `startDate`
- `endDate`
- `partial`: whether the selected filter range includes only part of the period
- `period`: daily, weekly, or monthly

**Relationships**
- Has one sales summary row.
- Has zero or more supporting order detail rows.

**Rules**
- Daily periods match one shop business date.
- Weekly periods start Monday and end Sunday.
- Monthly periods use calendar month boundaries.
- Partial periods must be labelled.

## Sales Summary

Represents aggregated shop performance for one report period.

**Fields**
- `periodKey`
- `totalSales`: sum of included non-cancelled beverage line amounts
- `orderCount`: count of included orders
- `averageOrderValue`: `totalSales / orderCount`, or zero when order count is zero
- `topSellingItemName`: purchased item name with the highest quantity sold for the period, when available
- `topSellingItemQuantity`: quantity sold for the top item, when available

**Relationships**
- Belongs to one report period.
- Derives from supporting order details and included order beverage snapshots.

**Rules**
- Include only orders matching the active report filter.
- Default totals include completed and picked_up orders only.
- Exclude cancelled beverages from sales amount and item quantity.
- Preserve item names and prices from order beverage snapshots.
- Zero-order periods return zero totals and no top-selling item.

## Popular Item

Represents one purchased menu item ranked within the active filter set.

**Fields**
- `rank`
- `sourceMenuItemId`
- `itemName`: purchased item name from the order beverage snapshot
- `categoryName`: menu category label when available
- `quantitySold`
- `orderCount`
- `salesAmount`

**Relationships**
- Aggregates non-cancelled order beverages across included orders.
- May reference the current menu item and category by `sourceMenuItemId` when those rows still exist.

**Rules**
- Primary ranking is quantity sold.
- Sales amount breaks quantity ties.
- Items with the same quantity and sales amount remain visible with clear rank values.
- Historical item names come from purchased snapshots, not the mutable menu item name.

## Popular Order Combination

Represents a repeated group of purchased items that appears across included orders.

**Fields**
- `rank`
- `combinationKey`: stable key derived from included purchased item names and quantities
- `combinationLabel`: staff-facing item group label
- `orderFrequency`
- `itemCount`
- `salesAmount`

**Relationships**
- Aggregates included order detail rows.
- Each combination is composed from non-cancelled beverages in one order.

**Rules**
- Cancelled beverages are omitted from the combination key.
- Primary ranking is order frequency.
- Sales amount breaks frequency ties.
- Combination labels preserve purchased item names.

## Supporting Order Detail

Represents the order-level evidence behind a report row.

**Fields**
- `orderId`
- `businessDate`
- `dailyOrderNumber`
- `status`
- `items`: purchased item names, quantities, line amounts, and beverage statuses
- `reportableTotal`: sum of non-cancelled beverage line amounts
- `createdAt`
- `completedAt`
- `pickedUpAt`

**Relationships**
- Belongs to an order from the staff operations data model.
- Has one or more item rows derived from order beverages.

**Rules**
- `businessDate + dailyOrderNumber` identifies the order for staff.
- `reportableTotal` excludes cancelled beverages.
- Fully cancelled orders appear only when staff include cancelled statuses in filters.
- Supporting details must match the active dashboard filters.

## Report Dashboard Result

Represents the complete aggregate payload shown in the dashboard.

**Fields**
- `filters`: active report filter
- `generatedAt`: timestamp when the report was produced
- `overall`: total sales, order count, average order value, and top-selling item for the full filter range
- `periods`: ordered sales summary rows
- `popularItems`: top item rows
- `popularCombinations`: top combination rows

**Relationships**
- Contains many report periods.
- Contains many popular item and popular combination rows.

**Rules**
- All charts and tables on the dashboard read from this same result.
- Empty result sets return zero totals and empty arrays rather than errors.
- Loading and error states belong to the UI and must not change report calculations.
