# Feature Specification: Shop Staff Operations

**Feature Branch**: `001-staff-operations`  
**Created**: 2026-05-11  
**Status**: Ready for Implementation
**Input**: User description: "Shop staff operations. Current journey: barista takes customer order, pushes it to a queue, available barista takes the queued order, marks it in progress, brews beverages, marks completed when all beverages are done, notifies customer by order number, and customer picks up the order. Order numbers are generated daily and can reset each day. If one beverage in a multi-beverage order is out of stock or cancelled, the remaining beverages continue and the customer is notified only when the remaining beverages are ready."

## Clarifications

### Session 2026-05-30

- Q: Which statuses should current-day daily activity include? -> A: Current-day daily activity includes all order statuses: created, queued, in progress, completed, picked up, and cancelled.
- Q: Which timestamp should daily activity show as the order time? -> A: Daily activity shows the order's received time captured when staff create the order.
- Q: Which timezone defines the shop business day for daily order numbers and current-day history? -> A: The shop business day uses configurable `SHOP_TIME_ZONE`, defaulting to `UTC`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Take a Counter Order (Priority: P1)

As a barista taking an order from a customer, I need to create an order with the requested beverages and receive a short daily order number, so the customer can be identified later when the order is ready.

**Why this priority**: This is the first step in the real shop journey. Without order creation and daily order numbering, there is nothing accurate to send into the brew queue or call out at pickup.

**Independent Test**: Can be fully tested by entering a customer order with one or more beverages, confirming a daily order number is generated, and confirming the order can be pushed to the brew queue.

**Acceptance Scenarios**:

1. **Given** a customer tells the barista their beverage order, **When** the barista creates the order, **Then** the order records each beverage, quantity, selected customizations, special instructions, optional pickup name when provided, and total.
2. **Given** the barista saves a new order, **When** the order is accepted, **Then** the system assigns the next available order number for the current business day.
3. **Given** the order has been created, **When** the barista pushes it to the queue, **Then** available baristas can see it in the brew queue with its daily order number.

---

### User Story 2 - Brew Orders from the Queue (Priority: P2)

As an available barista, I need to take the next suitable order from the brew queue and mark it in progress, so the team can coordinate beverage preparation without duplicating work.

**Why this priority**: The queue is the handoff between the order-taking barista and the barista brewing beverages. It keeps service moving when different staff members perform those jobs.

**Independent Test**: Can be fully tested by pushing a created order to the queue, having an available barista take it, and confirming the order moves to in progress for that barista.

**Acceptance Scenarios**:

1. **Given** an order is waiting in the brew queue, **When** an available barista takes the order, **Then** the order status changes to "In Progress" and shows who is brewing it.
2. **Given** an order is already in progress, **When** another barista views the queue, **Then** the order is clearly not available to be taken again.
3. **Given** an in-progress order contains multiple beverages, **When** the barista reviews the order, **Then** all beverages and preparation details remain visible until the order is completed.

---

### User Story 3 - Complete and Notify Pickup (Priority: P3)

As the barista brewing an order, I need to mark the order completed only after every remaining beverage in the order is done, so the customer is notified once and receives the complete order at pickup.

**Why this priority**: Pickup should happen when every non-cancelled beverage is ready, not when only part of the fulfillable order is finished. This prevents incomplete handoffs and confused customer calls.

**Independent Test**: Can be fully tested by creating an order with multiple beverages, marking it in progress, completing it only after all remaining beverages are done, and confirming the customer-facing notification uses the daily order number.

**Acceptance Scenarios**:

1. **Given** an in-progress order has one beverage, **When** the barista marks the order completed, **Then** the order becomes ready for pickup and the customer can be notified by order number.
2. **Given** an in-progress order has multiple beverages, **When** only some non-cancelled beverages are done, **Then** the order must not be treated as ready for pickup.
3. **Given** one beverage in a multi-beverage order is cancelled because it cannot be fulfilled, **When** the remaining beverages are still being brewed, **Then** the order stays in progress and is not announced as ready.
4. **Given** all remaining non-cancelled beverages in an in-progress order are done, **When** the barista marks the order completed, **Then** the order becomes ready for pickup and the customer can be notified by order number.
5. **Given** a completed order is picked up by the customer, **When** staff confirm pickup, **Then** the order leaves the active workflow and is available in order history.

---

### User Story 4 - Maintain Menu Availability (Priority: P4)

As a shop staff member, I need to update item availability, scoped customizations, and basic menu details, so baristas taking orders do not offer unavailable drinks or outdated customization choices.

**Why this priority**: Menu accuracy supports order taking, but the core journey can still be demonstrated with a small configured menu.

**Independent Test**: Can be fully tested by toggling an item unavailable, confirming it is no longer available for new counter orders, then restoring availability.

**Acceptance Scenarios**:

1. **Given** a menu item is currently available, **When** staff mark it unavailable, **Then** the item is clearly shown as unavailable and cannot be selected for new counter orders.
2. **Given** a menu item is unavailable, **When** staff mark it available, **Then** the item becomes available for new counter orders again.
3. **Given** staff update a menu item's display name, description, category, price, or customization groups, **When** the change is saved, **Then** the updated menu information is used for future orders while existing orders keep their original purchased details.

---

### User Story 5 - Review Daily Activity (Priority: P5)

As a shop staff member, I need to review orders from the current business day, so I can answer customer questions and support future daily sales reporting.

**Why this priority**: Daily activity is useful after orders are being created and completed. It also prepares the data shape for a later sales report phase without requiring reporting in this feature.

**Independent Test**: Can be fully tested by creating sample orders across active and completed workflow states, then finding them in current-day daily activity with their daily order numbers and current statuses.

**Acceptance Scenarios**:

1. **Given** orders have been created during the current business day, **When** staff open daily order history, **Then** those orders are listed with daily order number, current status, received time, items, and total.
2. **Given** staff need to find a recent order, **When** they search or filter by daily order number, current status, or pickup name when available, **Then** matching current-day orders are shown.

### Edge Cases

- If two baristas try to take the same queued order, only one barista can successfully move it to in progress.
- If an order has multiple beverages, the order must not be announced as ready until every non-cancelled beverage in that order is completed.
- If one beverage in a multi-beverage order is unavailable, out of stock, or cancelled after the order starts, the remaining beverages must continue through brewing and the customer must be notified only when the remaining beverages are ready.
- If a menu item becomes unavailable after it has already been ordered, existing orders must retain their original beverage details.
- If staff attempt to complete an order that has not been marked in progress, the system must prevent completion and show the required next action.
- If staff attempt to confirm pickup for an order that is still waiting or in progress, the system must prevent pickup confirmation.
- If the daily order number resets, the system must still distinguish orders from different business days.
- If order volume is high, the active brew queue must remain scannable by separating waiting, in-progress, and ready-for-pickup orders; picked-up orders leave the active queue and appear in current-day order history.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow an authorized barista to create a counter order while taking the customer's order.
- **FR-002**: System MUST record each ordered beverage, quantity, selected customizations, special instructions, optional pickup name when provided, and total.
- **FR-003**: System MUST assign a short order number to each accepted order for the current business day.
- **FR-004**: Daily order numbers MUST reset for each new business day in the configured shop timezone while preserving the ability to distinguish orders across different days.
- **FR-005**: Staff MUST be able to push a created order to the brew queue.
- **FR-006**: System MUST provide a staff-facing brew queue for orders that are waiting, in progress, or completed and ready for pickup.
- **FR-007**: System MUST show each queued order's daily order number, received time, beverages, quantities, selected customizations, special instructions, current status, assigned barista when in progress, and total.
- **FR-008**: Available baristas MUST be able to take a waiting order from the queue and mark it in progress.
- **FR-009**: System MUST prevent two baristas from taking the same waiting order at the same time.
- **FR-010**: Staff MUST be able to mark an in-progress order completed only when all non-cancelled beverages in the order are done.
- **FR-011**: Staff MUST be able to cancel an individual beverage in a multi-beverage order when that beverage cannot be fulfilled, without cancelling the remaining beverages.
- **FR-012**: System MUST keep partially cancelled orders in progress until all remaining non-cancelled beverages are completed.
- **FR-013**: System MUST make completed orders ready for customer pickup and present the daily order number staff should use to notify the customer.
- **FR-014**: Staff MUST be able to confirm customer pickup after the order is completed.
- **FR-015**: System MUST prevent waiting, in-progress, picked-up, or cancelled orders from being incorrectly moved to an invalid status.
- **FR-016**: Staff MUST be able to cancel an order before pickup, while recording that the order ended as cancelled.
- **FR-017**: System MUST preserve order beverage details as they were at purchase time, even if menu details change later.
- **FR-018**: Staff MUST be able to view menu items grouped by category.
- **FR-019**: Staff MUST be able to create, update, retire, and mark menu items available or unavailable for new counter orders.
- **FR-020**: Staff MUST be able to manage order-facing item details including name, description, category, price, and available customization groups.
- **FR-021**: System MUST provide current-day order history for orders in any workflow status: created, queued, in progress, completed, picked up, or cancelled, including each order's received time captured when staff create the order.
- **FR-022**: Staff MUST be able to filter or search current-day order history by daily order number, current status, and pickup name when available.
- **FR-023**: System MUST record when an order enters each major status: created, queued, in progress, completed, picked up, and cancelled.
- **FR-024**: System MUST make staff operations available only to authorized staff users.
- **FR-025**: System MUST show clear confirmation or error messages after staff create orders, push orders to the queue, change order status, confirm pickup, cancel a beverage, or save menu changes.

### Key Entities

- **Staff User**: A person authorized to access shop operations. Key attributes include display name and authorization status.
- **Menu Item**: A sellable coffee shop product. Key attributes include name, description, category, price, availability, active or retired state, and staff-selectable customization groups.
- **Menu Category**: A grouping used to organize menu items, such as coffee, tea, pastries, or seasonal items.
- **Order**: A customer purchase request that staff create and fulfill. Key attributes include business date, daily order number, received time, current status, assigned barista, total, status timestamps, and order beverages.
- **Order Beverage**: A purchased beverage snapshot within an order. Key attributes include beverage name, quantity, purchased price, selected customizations, special instructions, completion state, and cancellation state.
- **Daily Order Sequence**: The business-day numbering sequence used to generate short customer-facing order numbers and support later daily sales reporting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A barista can create a counter order with up to five beverages and push it to the brew queue in under 60 seconds.
- **SC-002**: Every accepted order receives a customer-facing daily order number before it enters the brew queue.
- **SC-003**: An available barista can take a waiting order and mark it in progress in under 15 seconds.
- **SC-004**: Staff can identify the correct order to call out using the daily order number in 100% of completed-order test cases.
- **SC-005**: Orders with multiple beverages are not marked ready for pickup until all remaining non-cancelled beverages are completed in 100% of acceptance test runs.
- **SC-006**: Staff can confirm customer pickup in under 10 seconds after the customer provides or responds to the daily order number.
- **SC-007**: Staff can mark a menu item unavailable in under 20 seconds during service.
- **SC-008**: Staff can locate a current-day order in under 45 seconds using daily order number, status, or pickup-name filtering when pickup name is available.

## Assumptions

- This first spec covers barista-run counter ordering and shop staff operations; customer self-ordering is a separate future spec.
- Payment handling is outside this spec unless later planning explicitly adds it; the operational queue starts from an accepted counter order.
- Staff roles are simple for the first version: authorized staff can take orders, brew queued orders, update order status, confirm pickup, and maintain the menu.
- The shop uses pickup orders, not table service or delivery, for the first version.
- Daily order numbers are short customer-facing numbers that reset each business day in the configured shop timezone; historical uniqueness comes from combining business date and order number.
- Menu changes affect future orders only; existing orders keep the details shown when the barista created the order.
- Daily sales reporting is a later phase; this spec only preserves the order dates, numbers, totals, and statuses needed to support it later.
