# Coffee Shop Staff Web

React staff UI for counter order entry, brew queue work, pickup confirmation,
menu maintenance, and current-day activity review.

## Local Service

- Staff web: `http://localhost:5173`
- API proxy target during development: `http://localhost:3000`

Start the full local app from the repository root:

```powershell
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

Start only the staff web app:

```powershell
npm run dev --workspace @coffee-shop/staff-web
```

## Test Flow

Run all staff-web checks:

```powershell
npm run typecheck --workspace @coffee-shop/staff-web
npm run test --workspace @coffee-shop/staff-web
npm run test:e2e --workspace @coffee-shop/staff-web
```

Run focused Playwright flows:

```powershell
npm run test:e2e --workspace @coffee-shop/staff-web -- counter-order.spec.ts
npm run test:e2e --workspace @coffee-shop/staff-web -- brew-queue.spec.ts
npm run test:e2e --workspace @coffee-shop/staff-web -- order-completion.spec.ts
npm run test:e2e --workspace @coffee-shop/staff-web -- menu-maintenance.spec.ts
npm run test:e2e --workspace @coffee-shop/staff-web -- daily-activity.spec.ts
npm run test:e2e --workspace @coffee-shop/staff-web -- reports-dashboard.spec.ts
npm run test:e2e --workspace @coffee-shop/staff-web -- full-staff-workflow.spec.ts
```

The full smoke test covers login, order creation, queue claim, beverage
completion, pickup confirmation, menu availability, and current-day history in
one browser workflow.

## Reports Menu Validation

Open the existing sidebar `Reports` item, which navigates to `/#reports`. The
dashboard should load within the staff shell and show:

- Daily, weekly, and monthly sales summaries using the selected business-date range.
- A sales summary line chart paired with a matching sortable table.
- Popular item and popular order-combination ranked bar charts paired with matching sortable tables.
- Date, period, status, category, and item filters that update every graph and table.
- Supporting order details after selecting a sales-summary, popular-item, or popular-combination row.

Use the focused report flow for regression checks:

```powershell
npm run test --workspace @coffee-shop/staff-web -- ReportFoundationComponents.test.tsx ReportsPage.test.tsx ReportComponents.test.tsx
npm run test:e2e --workspace @coffee-shop/staff-web -- reports-dashboard.spec.ts
```
