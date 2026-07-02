# Feature Specification: Sales Report Dashboard

**Feature Branch**: `002-sales-report-dashboard`  
**Created**: 2026-06-25  
**Status**: Draft  
**Input**: User description: "I want to implement report feature where it can be used as BI dashboard. The report should be able to summarize daily, weekly, and month sale for the shop. It need to provide analytic which order is popular. All visualization must be show in graph and table where it should be sortable and filterable."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review Sales by Period (Priority: P1)

As an authorized shop staff user reviewing business performance, I need a report dashboard that summarizes sales by day, week, and month, so I can quickly understand how the shop is performing over the selected period.

**Why this priority**: Period sales summaries are the core BI dashboard value. Without reliable daily, weekly, and monthly summaries, popularity analytics and detailed filtering have no trustworthy context.

**Independent Test**: Can be fully tested by opening the report dashboard, selecting daily, weekly, and monthly views for a date range with known orders, and confirming each view shows matching graph and table totals.

**Acceptance Scenarios**:

1. **Given** the shop has completed sales for a business day, **When** staff open the daily report for that day, **Then** they see total sales, order count, average order value, and the top-selling item by quantity sold in both a graph and a table.
2. **Given** the shop has completed sales across multiple business days in a week, **When** staff open the weekly report, **Then** they see the week's total sales and daily contribution in both a graph and a table.
3. **Given** the shop has completed sales across multiple months in the selected date range, **When** staff open the monthly report, **Then** they see monthly sales totals as a line chart and a matching table, with one chart point per calendar month.
4. **Given** staff switch between daily, weekly, and monthly views, **When** the selected date range remains valid for the new view, **Then** the dashboard updates the graph and table to the selected period without losing the applied filters.

---

### User Story 2 - Identify Popular Orders (Priority: P2)

As a shop staff user reviewing demand, I need analytics that show which menu items and order combinations are most popular, so I can make better decisions about menu planning, stock preparation, and staffing.

**Why this priority**: Popularity analytics turns sales totals into actionable shop insight. It helps staff understand what customers buy most often and which items drive the most revenue.

**Independent Test**: Can be fully tested by using a known set of orders with repeated menu items and combinations, then confirming the popularity ranking matches the order data in both graph and table form.

**Acceptance Scenarios**:

1. **Given** a selected date range with multiple completed orders, **When** staff view popular item analytics, **Then** they see menu items ranked by quantity sold, order count, and sales amount in both a graph and a sortable table.
2. **Given** several orders contain the same group of menu items, **When** staff view popular order combination analytics, **Then** they see common combinations ranked by frequency and sales amount.
3. **Given** two popular items have the same quantity sold, **When** staff review the ranking, **Then** the dashboard uses sales amount as the next ranking factor and clearly shows the tie values.

---

### User Story 3 - Filter and Sort Report Data (Priority: P3)

As a staff user investigating sales, I need every report table to be sortable and filterable, so I can answer specific business questions without manually scanning all orders.

**Why this priority**: BI dashboards are only useful when staff can explore the data behind the summary. Sorting and filtering make the reports practical for repeated shop review.

**Independent Test**: Can be fully tested by applying filters for date range, period type, order status, menu category, and item, then sorting each table by the available numeric and text columns.

**Acceptance Scenarios**:

1. **Given** the report dashboard shows a sales summary table, **When** staff sort by sales amount, order count, average order value, or period, **Then** the rows reorder correctly while the matching graph still reflects the same filtered result set.
2. **Given** staff apply filters for date range, period type, order status, menu category, or menu item, **When** they review sales summaries and popularity analytics, **Then** both graph and table results only include matching orders.
3. **Given** staff select a summary row or popularity row, **When** they view the supporting order details, **Then** they see a filterable and sortable order table with business date, daily order number, status, items, captured order total, and reportable sales total.

### Edge Cases

- If the selected date range has no sales, the dashboard must show a zero-value graph and an empty table state instead of misleading totals.
- If a selected period includes cancelled orders, cancelled orders must be visible when filtered for status review but excluded from default sales totals.
- If an order has cancelled beverages but the order itself is fulfilled, sales totals must reflect only the remaining fulfilled beverages.
- If sales occur near a business-day boundary, daily grouping must follow the shop business date rather than the viewer's local calendar date.
- If a week or month has partial data because the selected range starts or ends mid-period, the dashboard must label the partial period clearly.
- If popularity rankings produce ties, tied rows must remain visible with clear ranking values.
- If staff clear all filters, the dashboard must return to the default current-period summary.
- If a menu item was renamed after historical orders were placed, the report must preserve the purchased item name shown on the original orders.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a sales report dashboard to authorized staff users.
- **FR-002**: System MUST summarize sales by daily, weekly, and monthly periods.
- **FR-003**: Daily summaries MUST follow the shop business date used by staff operations.
- **FR-004**: Weekly summaries MUST group business dates into Monday through Sunday weeks.
- **FR-005**: Monthly summaries MUST group business dates into calendar months.
- **FR-006**: Each sales summary period MUST show total sales amount, order count, average order value, and the top-selling item for that period, where top-selling means highest quantity sold, then highest reportable sales amount, then purchased item name for deterministic ties.
- **FR-007**: Default sales totals MUST include completed or picked-up orders and exclude fully cancelled orders.
- **FR-008**: Orders or beverages cancelled before fulfillment MUST not inflate default sales totals.
- **FR-009**: Staff MUST be able to include or exclude order statuses through report filters.
- **FR-010**: Every sales summary visualization MUST provide both a graph and a table that represent the same filtered result set.
- **FR-010A**: Sales summary graphs MUST use a line chart to show trend direction across the selected period buckets.
- **FR-011**: Sales summary tables MUST be sortable by period, total sales amount, order count, average order value, and top-selling item name.
- **FR-012**: Sales summary tables MUST be filterable by date range, period type, order status, menu category, and menu item.
- **FR-013**: System MUST provide popular item analytics for the selected filters.
- **FR-014**: Popular item analytics MUST rank menu items by quantity sold, order count, and sales amount.
- **FR-015**: System MUST provide popular order combination analytics for the selected filters.
- **FR-016**: Popular order combination analytics MUST rank repeated item combinations by order frequency and sales amount.
- **FR-017**: Every popularity visualization MUST provide both a graph and a table that represent the same filtered result set.
- **FR-017A**: Popular item and popular order combination graphs MUST use ranked bar charts to compare top-N values.
- **FR-018**: Popularity tables MUST be sortable by rank, item or combination name, quantity sold, order count, sales amount, and menu category when available.
- **FR-019**: Popularity tables MUST be filterable by date range, period type, menu category, menu item, and order status.
- **FR-020**: Staff MUST be able to view the order details supporting a sales summary or popularity result.
- **FR-021**: Supporting order detail tables MUST show business date, daily order number, current status, ordered items, captured order total, and reportable sales total excluding cancelled beverages.
- **FR-022**: Supporting order detail tables MUST be sortable and filterable by business date, daily order number, status, item, captured order total, and reportable sales total.
- **FR-023**: Report results MUST preserve purchased order details as captured at order time, including item names, quantities, selected options, and sold prices.
- **FR-024**: The dashboard MUST clearly label the active date range, period grouping, filters, and whether a period is partial.
- **FR-025**: The dashboard MUST show clear empty, loading, and error states for each graph and table.
- **FR-026**: System MUST prevent unauthorized users from viewing sales reports.

### Key Entities

- **Report Period**: A daily, weekly, or monthly time grouping used for summarizing shop sales. Key attributes include period type, start date, end date, display label, and whether the period is partial.
- **Sales Summary**: The aggregated business performance for a report period. Key attributes include reportable total sales amount, order count, average order value, top-selling item by quantity sold, and included order statuses.
- **Popular Item**: A purchased menu item ranked within the selected filters. Key attributes include purchased item name, menu category when available, quantity sold, order count, and sales amount.
- **Popular Order Combination**: A repeated group of purchased items that appears across orders. Key attributes include combination label, item count, order frequency, and sales amount.
- **Report Filter**: The selected criteria used to narrow report results. Key attributes include date range, period type, order status, menu category, and menu item.
- **Supporting Order Detail**: The order-level evidence behind a report row. Key attributes include business date, daily order number, current status, purchased items, captured order total, and reportable sales total.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can view daily, weekly, and monthly sales summaries for a selected date range in under 10 seconds.
- **SC-002**: 100% of report sections that visualize sales or popularity include both the required chart type and a matching sortable, filterable table.
- **SC-003**: Staff can identify the top 10 menu items by quantity sold for a selected date range in under 30 seconds.
- **SC-004**: Staff can identify the top 10 order combinations by order frequency for a selected date range in under 30 seconds.
- **SC-005**: Sales totals match the sum of included supporting order reportable sales totals derived from non-cancelled beverage snapshots in 100% of acceptance test datasets.
- **SC-006**: Applying or clearing a report filter updates all related graphs and tables in under 2 seconds for 90 days of shop order history.
- **SC-007**: Staff can answer four core BI questions without assistance in usability review: today's sales, this week's sales, this month's sales, and the most popular item for the selected period.
- **SC-008**: Empty sales periods show zero totals and no-data states in 100% of no-sales test cases.

## Assumptions

- The dashboard is for authorized shop staff using the existing staff operations area.
- Sales reporting is now in scope because this specification explicitly adds it after the first staff operations feature.
- Sales totals are reportable sales totals derived from non-cancelled beverage snapshots captured by staff operations; captured order totals are preserved for supporting detail review, and separate payment reconciliation is outside this feature.
- Default sales totals include completed or picked-up orders and exclude fully cancelled orders.
- Cancelled beverages in otherwise fulfilled orders are excluded from reportable sales totals.
- The shop business date defines daily reporting boundaries.
- Weeks start on Monday and end on Sunday.
- Monthly summaries use calendar months.
- The selected report period controls chart buckets: daily reports chart business-day buckets, weekly reports chart Monday-through-Sunday week buckets, and monthly reports chart calendar-month buckets. Monthly trend analysis requires a selected date range spanning multiple months.
- Historical reports use the purchased details captured on each order, even if menu items are renamed, retired, or repriced later.
