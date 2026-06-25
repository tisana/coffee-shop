# Research: Sales Report Dashboard

## Decision: Use the existing Reports menu entry as the only entry point

**Rationale**: `apps/staff-web/src/App.tsx` already contains a `Reports` sidebar item with `href: "#reports"` and a chart icon. It currently renders the generic planned placeholder. Replacing that placeholder with `ReportsPage` satisfies the user's instruction and keeps navigation consistent with the existing staff shell.

**Alternatives considered**:
- Add a new topbar report shortcut. Rejected because it creates a second route to the same feature and the current app keeps primary workflows in the sidebar.
- Put reports under History. Rejected because History is current-day operational lookup, while the report feature is BI-style analysis across daily, weekly, and monthly ranges.

## Decision: Keep the dashboard dense and operational

**Rationale**: The current UI is a staff operations tool with a fixed sidebar, topbar, compact forms, 8px cards, and scannable workflow panels. Reports should use the same visual language while adding dashboard-specific structure: period selector, date range, status/category/item filters, KPI cells, chart/table pairs, and a supporting order detail section. This keeps the feature useful during shop review without turning it into a marketing page.

**Alternatives considered**:
- Create a visually large analytics landing page. Rejected because it would not match the staff operations app or support repeated BI work.
- Copy the History card-list layout exactly. Rejected because report data needs sortable tables and charts, not only order cards.

## Decision: Aggregate from order and beverage snapshots

**Rationale**: Existing orders already store `businessDate`, daily order number, status, order total, and status timestamps. Existing order beverages store `nameSnapshot`, `quantity`, `priceSnapshot`, selected customization snapshots, source menu item, and beverage status. Report sales should be calculated from non-cancelled beverage snapshots so historical item names and prices remain stable and partially cancelled beverages do not inflate totals.

**Alternatives considered**:
- Aggregate from mutable menu item names and current prices. Rejected because it violates purchased detail preservation when menu items are renamed or repriced.
- Use the stored order total for every fulfilled order. Rejected because order totals are captured at creation time and do not necessarily reflect beverage-level cancellations.
- Add a reporting fact table immediately. Rejected for this first increment because the current scale is a single shop with dozens of orders per day and the existing indexes support the planned report windows.

## Decision: Default sales include completed and picked-up orders

**Rationale**: Completed orders are ready for pickup and picked-up orders have completed the staff workflow. Fully cancelled orders should not count by default. Cancelled beverages inside otherwise completed or picked-up orders should be excluded from sales amount and item popularity calculations.

**Alternatives considered**:
- Count only picked-up orders. Rejected because completed orders are operationally sold and ready for customer handoff.
- Count queued or in-progress orders by default. Rejected because those orders are not yet fulfilled and may still have beverage cancellations.
- Hide cancelled orders entirely. Rejected because the spec requires status filters that can include cancelled orders for review.

## Decision: Use business-date period grouping

**Rationale**: Staff operations already use the shop business date for daily order identity and current-day history. Daily reports must use the same business date. Weekly reports group Monday through Sunday, and monthly reports use calendar months, matching the specification assumptions.

**Alternatives considered**:
- Group by viewer local time. Rejected because it can disagree with shop daily order numbering near day boundaries.
- Use rolling seven-day and thirty-day windows as the primary weekly/monthly view. Rejected because staff asked for daily, weekly, and monthly sale summaries, which are easier to reconcile as calendar periods.

## Decision: Provide two read-only report API surfaces

**Rationale**: `GET /reports/sales` returns the aggregate dashboard payload for the active filters: KPI summary, period rows, popular items, and popular combinations. `GET /reports/orders` returns supporting order details for a selected period, item, combination, or filtered dashboard state. This keeps the initial dashboard response focused while still letting staff inspect evidence behind summaries.

**Alternatives considered**:
- Return all supporting orders in the aggregate response. Rejected because it makes every filter request heavier than needed.
- Add separate endpoints for daily, weekly, monthly, popular items, and combinations. Rejected because shared filters would be duplicated across endpoints and UI refreshes would require more calls.

## Decision: Use app-native accessible SVG/CSS charts for the first increment

**Rationale**: The required visuals are period trend charts and top-N popularity bars. Small purpose-built chart components can be keyboard-labelled, paired with tables, styled consistently with the existing staff UI, and avoid adding a dependency before the dashboard needs advanced charting.

**Alternatives considered**:
- Add a charting library immediately. Rejected for this phase because the chart needs are simple and every visualization must already have a table fallback.
- Render charts on the server. Rejected because the dashboard is interactive and filter-driven inside the staff web app.

## Decision: Server filters, client table sorting

**Rationale**: Date range, period, order status, category, and item filters change the result set and should be applied by the API. Sorting summary, popularity, and supporting-order tables can be handled in the client from the returned rows for the target 90-day single-shop scale. This keeps API contracts smaller while still satisfying sortable table requirements.

**Alternatives considered**:
- Server-side sorting for every table. Rejected for the first increment because aggregate rows are already small and client sorting is easier to keep synchronized with chart/table pairs.
- Client-only filtering from a full order history download. Rejected because it would duplicate report aggregation logic in the browser and expose more order detail than the current view needs.
