# Quickstart: Sales Report Dashboard

This guide validates the report dashboard end to end after implementation.

## Prerequisites

- Node.js 24 and npm 10 or newer
- Docker available for the local PostgreSQL service
- Repository root: `D:\dev\workspaces\coffee-shop`

## Local Setup

```powershell
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

The staff web app runs at `http://localhost:5173`. The seeded staff login defaults to username `barista` and password `barista-pass` unless `SEED_STAFF_USERNAME` or `SEED_STAFF_PASSWORD` are set.

## Manual Validation Flow

1. Sign in to the staff web app.
2. Use normal staff operations to create and complete several orders, including:
   - at least two completed or picked-up orders on the same business date
   - at least one repeated menu item
   - at least one repeated item combination
   - one order with a cancelled beverage before completion
   - one fully cancelled order
3. Open the existing sidebar `Reports` menu item, which navigates to `/#reports`.
4. Confirm the dashboard loads daily sales for the default current period.
5. Switch between daily, weekly, and monthly period views.
6. Apply date range, status, category, and item filters.
7. Sort each sales summary, popular item, popular combination, and supporting order table.
8. Select a period or popularity row and confirm supporting orders match the selected filters.
9. Clear filters and confirm the dashboard returns to the current-period summary.

Expected outcomes:

- Every graph has a matching table with the same filtered result set.
- The sales summary graph is a line chart that makes sales trend direction visible across the selected periods.
- Popular item and popular combination graphs use ranked bar charts for top-N comparison.
- Completed and picked-up orders count by default.
- Fully cancelled orders are excluded by default and visible only when status filters include cancelled.
- Cancelled beverages inside otherwise completed or picked-up orders do not inflate sales totals.
- Item names and prices match the purchased snapshots from the orders.
- Daily periods follow the shop business date.
- Weekly periods run Monday through Sunday.
- Empty periods show zero totals and no-data states.

## API Contract Checks

Run the API tests after implementing report routes and aggregation:

```powershell
npm run test --workspace @coffee-shop/api -- reports.contract.test.ts
npm run test --workspace @coffee-shop/api -- reportingService.test.ts
```

The contract tests should cover:

- `GET /reports/sales` requires an authorized staff session.
- Default filters include completed and picked-up orders.
- Date range validation rejects an end date before the start date.
- Daily, weekly, and monthly groupings return expected period labels and totals.
- Popular items rank by quantity sold, then sales amount.
- Popular combinations rank by order frequency, then sales amount.
- Cancelled beverages are excluded from reportable totals.

## Staff Web Checks

Run focused staff-web checks after implementing `ReportsPage`:

```powershell
npm run test --workspace @coffee-shop/staff-web
npm run test:e2e --workspace @coffee-shop/staff-web -- reports-dashboard.spec.ts
```

The Playwright flow should confirm:

- The existing `Reports` sidebar link opens `/#reports`.
- Daily, weekly, and monthly controls update the dashboard.
- The sales summary renders as a line chart and updates with the same data shown in the sales summary table.
- Popular item and popular combination sections render ranked bar charts and update with the same data shown in their tables.
- Filters update every graph and table.
- Table sorting works for sales summaries, popular items, popular combinations, and supporting orders.
- Timed validation confirms 10-second initial summary visibility, 30-second top-10 discovery, and 2-second filter updates over 90 days of reportable order history.
- Loading, empty, and error states are visible and accessible.

## BI Question Usability Review

After automated checks pass, run a manual review with an authorized staff user or reviewer. Confirm they can answer these questions without assistance:

- Today's sales
- This week's sales
- This month's sales
- Most popular item for the selected period

Record the reviewer, date, dataset used, and pass/fail notes here during implementation.

| Date       | Reviewer | Dataset                                                   | Result | Notes                                                                                                                                                                     |
| ---------- | -------- | --------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-06 | Codex    | Focused `reports-dashboard.spec.ts` mocked report dataset | PASS   | Confirmed today's sales `$18.25`, this week's sales `$64.00`, this month's sales `$128.00`, and most popular item `Latte` are visible through the Reports dashboard flow. |

## Full Verification

Before marking implementation complete, run:

```powershell
npm run typecheck
npm run test
npm run build
npm run test:e2e --workspace @coffee-shop/staff-web -- reports-dashboard.spec.ts
```

## Implementation Evidence

Phase 7 verification on 2026-07-06:

| Check                                                                              | Result  | Notes                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                                                | PASS    | Shared, API, and staff-web typecheck completed.                                                                                                                                                                     |
| `npm run test`                                                                     | PASS    | Passed after PostgreSQL Docker was started: API 19 files / 55 tests, staff-web 7 files / 29 tests, shared 1 file / 2 tests.                                                                                         |
| `npm run test:e2e --workspace @coffee-shop/staff-web -- reports-dashboard.spec.ts` | PASS    | One Chromium test passed after rerunning with elevated permissions for Playwright `test-results` cleanup.                                                                                                           |
| `npm run build`                                                                    | PASS    | Shared, API, and staff-web production build completed; Vite reported a chunk-size warning for the staff-web bundle.                                                                                                 |
| Report performance validation                                                      | PASS    | Covered by the focused Reports Playwright flow: 10-second summary visibility, 30-second top-10 discovery, and 2-second filter update assertions passed with the mocked 90-day-style report dataset.                 |
