# Implementation Plan: Sales Report Dashboard

**Branch**: `002-sales-report-dashboard` | **Date**: 2026-07-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-sales-report-dashboard/spec.md` plus stakeholder feedback requesting richer report visualization and a sales-summary line chart.

## Summary

Build a read-only staff sales report dashboard from the existing `Reports` sidebar menu entry. The dashboard summarizes daily, weekly, and monthly sales; ranks popular menu items and repeated order combinations; and pairs every graph with a matching sortable, filterable table.

The updated visualization approach replaces the first-increment app-native SVG/CSS chart assumption with a small React chart dependency. Use Recharts for staff-web chart rendering: sales summary becomes a responsive line chart for trend visibility, while popular item and popular combination analytics remain ranked bar charts. Report calculations, filtering, sorting, supporting order details, and table parity stay unchanged and continue to use the existing shared contracts and API aggregation.

The UX should stay operational and scannable rather than marketing-style: compact period controls, date filters, KPI cells, chart/table pairs, and supporting order details within the current sidebar/topbar layout. The existing `Reports` nav item remains the entry point.

## Technical Context

**Language/Version**: TypeScript on Node.js 24  
**Primary Dependencies**: React 19, Vite, Express 5, PostgreSQL driver, Drizzle ORM, Zod, Vitest, Playwright, lucide-react, Recharts 3.9.x for staff-web chart rendering
**Storage**: Existing PostgreSQL orders, order beverages, menu items, and menu categories; no persistent report table in this increment  
**Testing**: Test pyramid with Vitest shared/domain/API aggregation and component tests as the broad base; Supertest-style API contract tests for report boundaries; focused Playwright coverage for the critical `#reports` dashboard flow, graph/table parity, chart type rendering, and timed staff tasks
**Target Platform**: Browser-based staff web app backed by the existing Node.js service  
**Project Type**: Full-stack web application  
**Performance Goals**: Staff can load daily, weekly, and monthly summaries in under 10 seconds; report filter changes update visible graphs and tables in under 2 seconds for 90 days of shop order history; staff can identify top 10 items or combinations in under 30 seconds  
**Constraints**: Reuse the existing `Reports` sidebar menu item and hash route (`#reports`); require authorized staff sessions; use the shop business date for daily boundaries; group weeks Monday through Sunday; preserve purchased item names, quantities, selected options, and sold prices from order beverage snapshots; default totals include completed and picked-up orders only; fully cancelled orders and cancelled beverages must not inflate sales; report category and item filters must use existing menu category/item data unless implementation chooses to include equivalent filter option metadata in the report response; every graph must have a table presenting the same filtered result set; sales summary must use a line chart to make trend direction visible; popularity charts should use ranked bar visuals; dashboard layout must remain usable in the existing responsive staff shell
**Scale/Scope**: Single shop; dozens of orders per business day; report windows optimized for at least 90 days of history; read-only dashboard with no export, scheduled reporting, payment reconciliation, forecasting, or cross-location BI in this feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Staff Workflow Integrity**: PASS. The report remains read-only and derives from the existing staff-operated order journey; richer charts do not create orders, bypass the brew queue, or alter fulfillment state.
- **II. Daily Order Identity**: PASS. The plan continues to use `businessDate + dailyOrderNumber` in supporting order detail rows so historical orders remain distinguishable after daily number resets.
- **III. Queue State Correctness**: PASS. The feature does not introduce new order status transitions. Report status filters read existing valid states only.
- **IV. Purchased Detail Preservation**: PASS. Sales and popularity analytics continue to use order beverage snapshots for sold item name, quantity, options, status, and price rather than mutable menu display data.
- **V. Incremental, Spec-Driven Delivery**: PASS. The chart-library change is scoped to the existing report dashboard surface and can be implemented as a visualization refinement without changing API aggregation.
- **VI. Simple, Necessary Design**: PASS with documented dependency rationale. Stakeholder feedback now requires more chart variety and a line trend chart. Recharts is the smallest practical dependency choice among researched options because it is React-native, supports line and bar charts from one package, supports React 19 peer dependencies, and avoids introducing a generalized BI platform or custom chart framework.
- **VII. Test-First, Risk-Based Quality**: PASS. Chart rendering changes must add failing component tests before implementation and focused Playwright coverage for sales-summary line chart visibility plus graph/table parity.
- **Product Scope and Constraints**: PASS. The dashboard remains staff-only and does not add export, scheduled reporting, payment handling, forecasting, or cross-location BI.

**Post-Design Constitution Check**: PASS. The updated research, model notes, and quickstart preserve the staff workflow, daily order identity, queue-state read-only boundary, purchased detail preservation, story-by-story delivery path, KISS/YAGNI design, and test-first risk-based quality gates. The added chart dependency is justified by explicit stakeholder visualization feedback and remains bounded to the current chart needs.

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

**Structure Decision**: Extend the existing API/staff-web/shared monorepo. Report aggregation remains in `apps/api/src/domain/reportingService.ts` so totals are computed once from authoritative order rows and beverage snapshots. `apps/staff-web/src/App.tsx` routes the existing `#reports` entry to `ReportsPage`. Shared request/response types remain in `packages/shared/src/contracts/api.ts`. Recharts usage is isolated behind `apps/staff-web/src/components/ReportChart.tsx` so the dashboard does not spread library-specific chart code through page logic.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Add Recharts chart dependency | Stakeholder feedback explicitly asks for more varied visualizations, and sales summary must become a line chart for trend readability. Recharts provides line and bar charts in one React-oriented package with React 19 peer support. | The existing app-native SVG/CSS bar primitive was enough for the first increment but now produces a weak sales trend visualization and would require custom line, axis, tooltip, and responsive behavior work. |
