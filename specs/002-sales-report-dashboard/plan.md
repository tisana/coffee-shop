# Implementation Plan: Sales Report Dashboard

**Branch**: `002-sales-report-dashboard` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-sales-report-dashboard/spec.md`

## Summary

Build a read-only staff sales report dashboard from the existing `Reports` sidebar menu entry. The dashboard summarizes daily, weekly, and monthly sales; ranks popular menu items and repeated order combinations; and pairs every graph with a matching sortable, filterable table. The technical approach extends the existing TypeScript monorepo with shared report contracts, authenticated Express report routes, PostgreSQL-backed aggregation over existing order and order beverage snapshots, and a React `ReportsPage` that replaces the current `#reports` placeholder inside the established staff shell.

The UX should stay operational and scannable rather than marketing-style: compact period controls, date filters, KPI cells, chart/table pairs, and supporting order details within the current sidebar/topbar layout. The existing `Reports` nav item is the entry point.

## Technical Context

**Language/Version**: TypeScript on Node.js 24  
**Primary Dependencies**: React 19, Vite, Express 5, PostgreSQL driver, Drizzle ORM, Zod, Vitest, Playwright, lucide-react; no new chart dependency for the first report increment, using small accessible SVG/CSS chart components for trend and top-N visuals  
**Storage**: Existing PostgreSQL orders, order beverages, menu items, and menu categories; no persistent report table in this increment  
**Testing**: Test pyramid with Vitest shared/domain/API aggregation and component tests as the broad base; Supertest-style API contract tests for report boundaries; focused Playwright coverage for the critical `#reports` dashboard flow, graph/table parity, and timed staff tasks
**Target Platform**: Browser-based staff web app backed by the existing Node.js service  
**Project Type**: Full-stack web application  
**Performance Goals**: Staff can load daily, weekly, and monthly summaries in under 10 seconds; report filter changes update visible graphs and tables in under 2 seconds for 90 days of shop order history; staff can identify top 10 items or combinations in under 30 seconds  
**Constraints**: Reuse the existing `Reports` sidebar menu item and hash route (`#reports`); require authorized staff sessions; use the shop business date for daily boundaries; group weeks Monday through Sunday; preserve purchased item names, quantities, selected options, and sold prices from order beverage snapshots; default totals include completed and picked-up orders only; fully cancelled orders and cancelled beverages must not inflate sales; report category and item filters must use existing menu category/item data unless implementation chooses to include equivalent filter option metadata in the report response; every graph must have a table presenting the same filtered result set; dashboard layout must remain usable in the existing responsive staff shell
**Scale/Scope**: Single shop; dozens of orders per business day; report windows optimized for at least 90 days of history; read-only dashboard with no export, scheduled reporting, payment reconciliation, forecasting, or cross-location BI in this feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Staff Workflow Integrity**: PASS. The report is read-only and derives from the existing staff-operated order journey; it does not create orders, bypass the brew queue, or alter fulfillment state.
- **II. Daily Order Identity**: PASS. The plan uses `businessDate + dailyOrderNumber` in supporting order detail rows so historical orders remain distinguishable after daily number resets.
- **III. Queue State Correctness**: PASS. The feature does not introduce new order status transitions. Report status filters read existing valid states only.
- **IV. Purchased Detail Preservation**: PASS. Sales and popularity analytics use order beverage snapshots for sold item name, quantity, options, status, and price rather than mutable menu display data.
- **V. Incremental, Spec-Driven Delivery**: PASS. The P1 sales summary can be implemented independently before P2 popularity and P3 drill-down sorting/filtering.
- **VI. Simple, Necessary Design**: PASS. The plan reuses the existing Reports sidebar route, current API/staff-web/shared monorepo boundaries, PostgreSQL order snapshots, and small app-native chart components instead of adding speculative BI storage, exports, scheduling, cross-location reporting, or a chart dependency.
- **VII. Test-First, Risk-Based Quality**: PASS. Tasks require tests before implementation for each story and keep the suite pyramid-shaped: domain/component tests for calculations and rendering, API contract tests for report routes, and focused Playwright checks for the high-risk staff dashboard flow. T016-T020 backfill baseline tests for completed foundation tasks before any remaining story implementation resumes.
- **Product Scope and Constraints**: PASS. Daily sales reporting was previously out of scope, but this feature specification explicitly brings staff sales reporting into scope. The dashboard remains staff-only and does not add payment handling, customer self-ordering, delivery, or table service.

**Post-Design Constitution Check**: PASS. The research, data model, contracts, and quickstart preserve the staff workflow, daily order identity, queue-state read-only boundary, purchased detail preservation, story-by-story delivery path, KISS/YAGNI design, and test-first risk-based quality gates. The task list includes a Phase 2A foundation test-backfill gate for tasks completed before constitution v1.1.0. No constitution violations require complexity tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-sales-report-dashboard/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── reports.openapi.yaml
└── tasks.md
```

### Source Code (repository root)
```text
apps/
├── api/
│   ├── src/
│   │   ├── domain/
│   │   │   └── reportingService.ts
│   │   ├── routes/
│   │   │   ├── reportRoutes.ts
│   │   │   └── validators.ts
│   │   └── app.ts
│   └── tests/
│       ├── integration/
│       │   └── reports.contract.test.ts
│       └── unit/
│           └── reportingService.test.ts
└── staff-web/
    ├── src/
    │   ├── components/
    │   │   ├── ReportChart.tsx
    │   │   ├── ReportFilters.tsx
    │   │   ├── ReportMetricGrid.tsx
    │   │   ├── SortableReportTable.tsx
    │   │   └── SupportingOrdersTable.tsx
    │   ├── pages/
    │   │   └── ReportsPage.tsx
    │   ├── services/
    │   │   └── reportsApi.ts
    │   └── styles.css
    └── tests/
        └── e2e/
            └── reports-dashboard.spec.ts

packages/
└── shared/
    └── src/
        └── contracts/
            └── api.ts
```

**Structure Decision**: Extend the existing API/staff-web/shared monorepo. Report aggregation belongs in `apps/api/src/domain/reportingService.ts` so totals are computed once from authoritative order rows and beverage snapshots. `apps/staff-web/src/App.tsx` should route the existing `#reports` placeholder to `ReportsPage`, preserving the existing sidebar entry. Shared request/response types belong in `packages/shared/src/contracts/api.ts` so API, UI, and tests use one contract.

## Complexity Tracking

No constitution violations.
