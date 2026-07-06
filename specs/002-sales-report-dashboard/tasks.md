# Tasks: Sales Report Dashboard

**Input**: Design documents from `/specs/002-sales-report-dashboard/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/reports.openapi.yaml, quickstart.md

**Tests**: Required by the constitution and included because the quickstart, plan, and risk profile call for API contract tests, aggregation tests, component tests, and Playwright validation for report calculations, authorization, sorting, filtering, graph/table parity, and chart type rendering. T016-T020 backfill baseline tests for foundation tasks completed before constitution v1.1.0 added mandatory TDD; run them before any remaining story implementation. For all new behavior, write story tests first, confirm they fail for the expected reason, then implement.

**Organization**: Tasks are grouped by user story so the daily/weekly/monthly sales summary can ship as the MVP before popularity analytics and drill-down filtering.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not depend on an incomplete task.
- **[Story]**: Maps to the user story phase, such as [US1], [US2], or [US3].
- Every task includes an exact file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare report-specific test fixtures and orient the existing app entry point before feature work begins.

- [X] T001 Review the current `#reports` placeholder and existing Reports nav entry in `apps/staff-web/src/App.tsx`
- [X] T002 [P] Add reusable API report test fixture helpers for completed, picked-up, fully cancelled, partially cancelled, and 90-day performance orders in `apps/api/tests/integration/reportTestFixtures.ts`
- [X] T003 [P] Add staff-web report mock data builders for sales periods, popularity rows, and supporting orders in `apps/staff-web/tests/e2e/reportTestData.ts`
- [X] T004 [P] Add staff-web unit test mock helpers for report responses in `apps/staff-web/src/test/reportTestData.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared report contracts, validation, services, and reusable UI primitives required by every story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Define shared report request and response types from `contracts/reports.openapi.yaml` in `packages/shared/src/contracts/api.ts`
- [X] T006 Add report query validation schemas for date range, period, statuses, menu category, menu item, period key, and combination key in `apps/api/src/routes/validators.ts`
- [X] T007 Create report period, money, and line-total helper functions in `apps/api/src/domain/reportingService.ts`
- [X] T008 Create authenticated report route scaffolding for `/reports/sales` and `/reports/orders` in `apps/api/src/routes/reportRoutes.ts`
- [X] T009 Register report routes in the Express application in `apps/api/src/app.ts`
- [X] T010 Create the staff-web report API client methods and define the category/item filter option source by reusing `/menu/categories` or report response metadata in `apps/staff-web/src/services/reportsApi.ts`
- [X] T011 [P] Create reusable report filter controls for period, date range, statuses, category, and item options from the chosen filter option source in `apps/staff-web/src/components/ReportFilters.tsx`
- [X] T012 [P] Create a reusable sortable report table component with keyboard-accessible sort buttons in `apps/staff-web/src/components/SortableReportTable.tsx`
- [X] T013 [P] Create accessible report chart primitives for trend and top-N bar charts in `apps/staff-web/src/components/ReportChart.tsx`
- [X] T014 [P] Create report metric cells for total sales, order count, average order value, and top-selling item by quantity sold in `apps/staff-web/src/components/ReportMetricGrid.tsx`
- [X] T015 Add base report dashboard layout, chart, table, loading, empty, and error styles in `apps/staff-web/src/styles.css`

**Checkpoint**: Shared contracts, route shell, API client, and reusable report UI primitives are ready.

---

## Phase 2A: Constitution Remediation (Foundation Test Backfill)

**Purpose**: Bring the already-completed report foundation into alignment with the constitution before continuing feature implementation.

**Context**: T005-T015 were completed before constitution v1.1.0 added mandatory TDD. These tasks now require behavior-focused baseline coverage before any remaining story implementation proceeds.

- [X] T016 [P] Add API contract tests for report route scaffolding, staff authorization, query validation, and planned responses for `/reports/sales` and `/reports/orders` in `apps/api/tests/integration/reports.contract.test.ts`
- [X] T017 [P] Add unit tests for report period helpers, money formatting helpers, and line-total helpers in `apps/api/tests/unit/reportingService.test.ts`
- [X] T018 [P] Add staff-web component tests for `ReportFilters` rendering, accessible labels, and base period/date/status/category/item control changes in `apps/staff-web/src/components/ReportFilters.test.tsx`
- [X] T019 [P] Add staff-web component tests for `SortableReportTable` sorting and keyboard-accessible sort buttons in `apps/staff-web/src/components/SortableReportTable.test.tsx`
- [X] T020 [P] Add staff-web component tests for `ReportChart` and `ReportMetricGrid` empty/data rendering and accessibility basics in `apps/staff-web/src/components/ReportFoundationComponents.test.tsx`

**Checkpoint**: Existing foundation behavior has baseline tests before story implementation resumes.

---

## Phase 3: User Story 1 - Review Sales by Period (Priority: P1) MVP

**Goal**: Authorized staff can open the existing Reports menu and review daily, weekly, and monthly sales summaries with graph/table parity.

**Independent Test**: Open `/#reports`, select daily, weekly, and monthly views for a known date range, and confirm total sales, order count, average order value, and top-selling item by quantity sold match in the KPI cells, chart, and table.

### Tests for User Story 1

- [X] T021 [P] [US1] Add API contract tests for `GET /reports/sales` authorization, default statuses, date validation, and daily/weekly/monthly period totals in `apps/api/tests/integration/reports.contract.test.ts`
- [X] T022 [P] [US1] Add unit tests for business-date period grouping, partial periods, average order value, top-selling item tie-breaks, and cancelled-beverage exclusion in `apps/api/tests/unit/reportingService.test.ts`
- [X] T023 [P] [US1] Add staff-web component tests for `ReportsPage` loading, empty, error, and sales summary rendering in `apps/staff-web/src/pages/ReportsPage.test.tsx`
- [X] T024 [P] [US1] Add Playwright flow for opening the existing Reports sidebar link, switching daily, weekly, and monthly summaries, and asserting 10-second summary visibility in `apps/staff-web/tests/e2e/reports-dashboard.spec.ts`
- [X] T025 [P] [US1] Add App shell unit coverage that `#reports` renders the Reports page instead of the planned placeholder in `apps/staff-web/src/App.test.tsx`

### Implementation for User Story 1

- [X] T026 [US1] Implement sales report filtering and period summary aggregation in `apps/api/src/domain/reportingService.ts`
- [X] T027 [US1] Implement `GET /reports/sales` response mapping for overall metrics and period rows in `apps/api/src/routes/reportRoutes.ts`
- [X] T028 [US1] Wire sales report query parameters and response typing in `apps/staff-web/src/services/reportsApi.ts`
- [X] T029 [US1] Create the `ReportsPage` sales summary screen with period/date filters, KPI cells, chart/table pair, loading state, empty state, and error state in `apps/staff-web/src/pages/ReportsPage.tsx`
- [X] T030 [US1] Replace the `#reports` placeholder with `ReportsPage` while preserving the existing sidebar Reports entry in `apps/staff-web/src/App.tsx`

**Checkpoint**: User Story 1 is independently functional as the MVP sales summary dashboard.

---

## Phase 4: User Story 2 - Identify Popular Orders (Priority: P2)

**Goal**: Staff can identify popular menu items and repeated order combinations for the selected report filters.

**Independent Test**: Use a known set of completed and picked-up orders with repeated items and repeated combinations, then confirm item and combination rankings match in both chart and table form.

### Tests for User Story 2

- [X] T031 [P] [US2] Add API contract tests for popular item ranking by quantity sold, order count, sales amount, and tie handling in `apps/api/tests/integration/reports.contract.test.ts`
- [X] T032 [P] [US2] Add API contract tests for popular order combination ranking by frequency, sales amount, and cancelled beverage exclusion in `apps/api/tests/integration/reports.contract.test.ts`
- [X] T033 [P] [US2] Add unit tests for item and combination aggregation from purchased beverage snapshots in `apps/api/tests/unit/reportingService.test.ts`
- [X] T034 [P] [US2] Add Playwright checks for popular item and popular combination charts and tables, including 30-second top-10 discovery assertions, in `apps/staff-web/tests/e2e/reports-dashboard.spec.ts`

### Implementation for User Story 2

- [X] T035 [US2] Extend report aggregation to calculate popular item rows from non-cancelled beverage snapshots in `apps/api/src/domain/reportingService.ts`
- [X] T036 [US2] Extend report aggregation to calculate popular order combination rows from non-cancelled beverage snapshots in `apps/api/src/domain/reportingService.ts`
- [X] T037 [US2] Include popular item and popular combination rows in `GET /reports/sales` in `apps/api/src/routes/reportRoutes.ts`
- [X] T038 [US2] Render popular item chart/table and popular combination chart/table sections in `apps/staff-web/src/pages/ReportsPage.tsx`
- [X] T039 [US2] Add popularity-specific chart labels, rank styling, and tie-value treatment in `apps/staff-web/src/styles.css`

**Checkpoint**: User Stories 1 and 2 both work independently with matching chart/table data.

---

## Phase 5: User Story 3 - Filter and Sort Report Data (Priority: P3)

**Goal**: Every report table is sortable and filterable, and staff can inspect the supporting orders behind summary or popularity rows.

**Independent Test**: Apply date range, period type, order status, menu category, and item filters; sort every report table; select a summary or popularity row; and confirm supporting orders match the filtered result set.

### Tests for User Story 3

- [X] T040 [P] [US3] Add API contract tests for `GET /reports/orders` supporting order details, selected period filtering, selected item filtering, selected combination filtering, and authorization in `apps/api/tests/integration/reports.contract.test.ts`
- [X] T041 [P] [US3] Add unit tests for supporting order captured totals, reportable totals, and filter matching in `apps/api/tests/unit/reportingService.test.ts`
- [X] T042 [P] [US3] Add staff-web component tests for `ReportFilters` status/category/item filter state changes in `apps/staff-web/src/components/ReportFilters.test.tsx`
- [X] T043 [P] [US3] Add staff-web component tests for sortable report table behavior with report row data in `apps/staff-web/src/components/SortableReportTable.test.tsx`
- [X] T044 [P] [US3] Add Playwright checks for status/category/item filtering, clearing filters, row selection, supporting order details, table sorting, and 2-second filter update assertions in `apps/staff-web/tests/e2e/reports-dashboard.spec.ts`

### Implementation for User Story 3

- [X] T045 [US3] Implement supporting order detail query and filter matching in `apps/api/src/domain/reportingService.ts`
- [X] T046 [US3] Implement `GET /reports/orders` for period, item, combination, status, category, and date filters in `apps/api/src/routes/reportRoutes.ts`
- [X] T047 [US3] Extend the report API client with supporting order detail loading in `apps/staff-web/src/services/reportsApi.ts`
- [X] T048 [US3] Implement filter submission, clear filters, and synchronized dashboard reload behavior in `apps/staff-web/src/pages/ReportsPage.tsx`
- [X] T049 [US3] Implement row selection from summary, popular item, and popular combination tables in `apps/staff-web/src/pages/ReportsPage.tsx`
- [X] T050 [US3] Create the supporting order detail table with sortable business date, daily order number, status, item, captured order total, and reportable sales total columns in `apps/staff-web/src/components/SupportingOrdersTable.tsx`
- [X] T051 [US3] Add responsive table overflow, selected-row state, and supporting-order detail styles in `apps/staff-web/src/styles.css`

**Checkpoint**: All report tables are sortable and filterable, and drill-down details match the selected report data.

---

## Phase 6: Visualization Refinement (Chart Library Update)

**Purpose**: Align the completed report dashboard with the updated plan decision to use Recharts, render sales summary as a line chart, and keep popularity visuals as ranked bar charts.

### Tests for Visualization Refinement

- [X] T052 [P] Add staff-web component tests for `ReportChart` sales line chart rendering, ranked bar chart rendering, empty state, and accessible chart labels in `apps/staff-web/src/components/ReportFoundationComponents.test.tsx`
- [X] T053 [P] Add staff-web component tests that `ReportsPage` renders the sales summary with the line chart variant and popular item/combination sections with bar chart variants in `apps/staff-web/src/pages/ReportsPage.test.tsx`
- [X] T054 [P] Add Playwright checks for the sales summary line chart, ranked popularity bar charts, and graph/table parity after filter changes in `apps/staff-web/tests/e2e/reports-dashboard.spec.ts`

### Implementation for Visualization Refinement

- [X] T055 Add Recharts to the staff-web workspace dependencies in `apps/staff-web/package.json` and `package-lock.json`
- [X] T056 Replace the app-native report bar primitive with Recharts-backed line and bar chart variants behind the existing boundary in `apps/staff-web/src/components/ReportChart.tsx`
- [X] T057 Update `ReportsPage` to render the sales summary as a line chart and popular item/combination sections as ranked bar charts in `apps/staff-web/src/pages/ReportsPage.tsx`
- [X] T058 Update responsive chart sizing, axis/tooltip affordances, and chart accessibility styles in `apps/staff-web/src/styles.css`
- [X] T059 Run focused staff-web component tests for `ReportChart` and `ReportsPage` chart rendering, then record results in `specs/002-sales-report-dashboard/tasks.md`
- [X] T060 Run the focused reports Playwright chart checks, then record results in `specs/002-sales-report-dashboard/tasks.md`

**Phase 6 validation evidence (2026-07-02)**:

- `npm run typecheck --workspace @coffee-shop/staff-web` - PASS.
- `npm run test --workspace @coffee-shop/staff-web -- ReportFoundationComponents.test.tsx ReportsPage.test.tsx ReportComponents.test.tsx` - PASS, 3 files / 14 tests.
- `npm run test:e2e --workspace @coffee-shop/staff-web -- reports-dashboard.spec.ts` - PASS, 1 Chromium test.

**Checkpoint**: Sales summary uses a line chart, popularity sections use ranked bar charts, and each chart still has a matching sortable/filterable table.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, documentation alignment, and maintainability checks across all stories and the visualization refinement.

- [X] T061 [P] Update API README with report endpoint validation commands in `apps/api/README.md`
- [X] T062 [P] Update staff-web README with the Reports menu validation flow and focused Playwright command in `apps/staff-web/README.md`
- [X] T063 [P] Update quickstart evidence notes after implementation in `specs/002-sales-report-dashboard/quickstart.md`
- [X] T064 Run TypeScript typecheck for all workspaces and record results in `specs/002-sales-report-dashboard/tasks.md`
- [X] T065 Run unit and integration tests for all workspaces and record results in `specs/002-sales-report-dashboard/tasks.md`
- [X] T066 Run the focused reports Playwright flow and record results in `specs/002-sales-report-dashboard/tasks.md`
- [X] T067 Run the production build and record results in `specs/002-sales-report-dashboard/tasks.md`
- [X] T068 Run report performance validation for 10-second initial load, 30-second top-10 discovery, and 2-second filter updates over 90 days of orders and record results in `specs/002-sales-report-dashboard/tasks.md`
- [X] T069 Run a manual BI-question usability review for today's sales, this week's sales, this month's sales, and most popular item, then record evidence in `specs/002-sales-report-dashboard/quickstart.md`

**Phase 7 validation evidence (2026-07-06)**:

- `npm run typecheck` - PASS.
- `npm run test` - PASS after PostgreSQL Docker was started; API passed 19 files / 55 tests, staff-web passed 7 files / 29 tests, and shared passed 1 file / 2 tests.
- `npm run test:e2e --workspace @coffee-shop/staff-web -- reports-dashboard.spec.ts` - PASS, 1 Chromium test.
- `npm run build` - PASS; Vite emitted a staff-web chunk-size warning.
- Report performance validation - PASS through focused Reports Playwright assertions for 10-second summary visibility, 30-second top-10 discovery, and 2-second filter updates.
- BI-question usability review - PASS in `specs/002-sales-report-dashboard/quickstart.md` using the focused Reports mocked dataset.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories.
- **Constitution Remediation (Phase 2A)**: Depends on Foundational completion; blocks remaining user story implementation.
- **User Story 1 (Phase 3)**: Depends on Constitution Remediation; delivers the MVP.
- **User Story 2 (Phase 4)**: Depends on Constitution Remediation and can use the same `/reports/sales` surface from US1; implement after US1 for simplest integration.
- **User Story 3 (Phase 5)**: Depends on Constitution Remediation and is most useful after US1/US2 provide rows to filter, sort, and drill into.
- **Visualization Refinement (Phase 6)**: Depends on US1, US2, and US3 because it replaces the completed dashboard chart layer without changing API aggregation.
- **Polish (Phase 7)**: Depends on the desired stories and visualization refinement being complete.

### User Story Dependencies

- **US1 Review Sales by Period**: Required MVP; no dependency on US2 or US3.
- **US2 Identify Popular Orders**: Uses the same filter contract and aggregation service; can be developed after the foundational route and type shell, but should be merged after US1 to preserve the MVP path.
- **US3 Filter and Sort Report Data**: Builds on the shared filter contract and report rows from US1/US2; can be tested independently with mocked rows and API fixtures.

### Within Each User Story

- Complete T016-T020 before starting any remaining story implementation tasks.
- Write story-specific tests before implementation and confirm new tests fail for the expected reason.
- Keep the suite pyramid-shaped: broad domain/component coverage, targeted API contract coverage, and focused Playwright coverage for critical staff flows.
- Implement shared/domain aggregation before route response mapping.
- Implement route/API client behavior before UI loading.
- Implement UI rendering before Playwright validation.
- Stop at each checkpoint and validate the story independently.

### Parallel Opportunities

- T002, T003, and T004 can run in parallel.
- T011, T012, T013, and T014 can run in parallel after T005-T010.
- T016, T017, T018, T019, and T020 can run in parallel before story implementation resumes.
- Test tasks inside each user story can run in parallel because they target different test files or independent sections of existing test files.
- US2 backend aggregation tasks can proceed while US1 UI polish continues after the shared contract is stable.
- Visualization test tasks T052, T053, and T054 can run in parallel because they target component, page, and Playwright coverage separately.
- Documentation polish tasks T061, T062, and T063 can run in parallel.
- Final validation tasks T064 through T069 should run after the implemented report flow and Recharts visualization refinement are available.

---

## Parallel Example: User Story 1

```text
Task: "T021 [P] [US1] Add API contract tests for GET /reports/sales authorization, default statuses, date validation, and daily/weekly/monthly period totals in apps/api/tests/integration/reports.contract.test.ts"
Task: "T022 [P] [US1] Add unit tests for business-date period grouping, partial periods, average order value, top-selling item tie-breaks, and cancelled-beverage exclusion in apps/api/tests/unit/reportingService.test.ts"
Task: "T023 [P] [US1] Add staff-web component tests for ReportsPage loading, empty, error, and sales summary rendering in apps/staff-web/src/pages/ReportsPage.test.tsx"
Task: "T024 [P] [US1] Add Playwright flow for opening the existing Reports sidebar link, switching daily, weekly, and monthly summaries, and asserting 10-second summary visibility in apps/staff-web/tests/e2e/reports-dashboard.spec.ts"
```

## Parallel Example: User Story 2

```text
Task: "T031 [P] [US2] Add API contract tests for popular item ranking by quantity sold, order count, sales amount, and tie handling in apps/api/tests/integration/reports.contract.test.ts"
Task: "T032 [P] [US2] Add API contract tests for popular order combination ranking by frequency, sales amount, and cancelled beverage exclusion in apps/api/tests/integration/reports.contract.test.ts"
Task: "T033 [P] [US2] Add unit tests for item and combination aggregation from purchased beverage snapshots in apps/api/tests/unit/reportingService.test.ts"
Task: "T034 [P] [US2] Add Playwright checks for popular item and popular combination charts and tables, including 30-second top-10 discovery assertions, in apps/staff-web/tests/e2e/reports-dashboard.spec.ts"
```

## Parallel Example: User Story 3

```text
Task: "T040 [P] [US3] Add API contract tests for GET /reports/orders supporting order details, selected period filtering, selected item filtering, selected combination filtering, and authorization in apps/api/tests/integration/reports.contract.test.ts"
Task: "T041 [P] [US3] Add unit tests for supporting order captured totals, reportable totals, and filter matching in apps/api/tests/unit/reportingService.test.ts"
Task: "T042 [P] [US3] Add staff-web component tests for ReportFilters status/category/item filter state changes in apps/staff-web/src/components/ReportFilters.test.tsx"
Task: "T043 [P] [US3] Add staff-web component tests for sortable report table behavior with report row data in apps/staff-web/src/components/SortableReportTable.test.tsx"
Task: "T044 [P] [US3] Add Playwright checks for status/category/item filtering, clearing filters, row selection, supporting order details, table sorting, and 2-second filter update assertions in apps/staff-web/tests/e2e/reports-dashboard.spec.ts"
```

## Parallel Example: Visualization Refinement

```text
Task: "T052 [P] Add staff-web component tests for ReportChart sales line chart rendering, ranked bar chart rendering, empty state, and accessible chart labels in apps/staff-web/src/components/ReportFoundationComponents.test.tsx"
Task: "T053 [P] Add staff-web component tests that ReportsPage renders the sales summary with the line chart variant and popular item/combination sections with bar chart variants in apps/staff-web/src/pages/ReportsPage.test.tsx"
Task: "T054 [P] Add Playwright checks for the sales summary line chart, ranked popularity bar charts, and graph/table parity after filter changes in apps/staff-web/tests/e2e/reports-dashboard.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 2A: Constitution remediation tests for completed foundation tasks.
4. Complete Phase 3: User Story 1.
5. Stop and validate `GET /reports/sales`, `/#reports`, daily/weekly/monthly summaries, graph/table parity, and default sales totals.
6. Demo the Reports menu as the BI dashboard MVP.

### Incremental Delivery

1. Add US1 sales summaries and validate independently.
2. Add US2 popular item and combination analytics and validate independently.
3. Add US3 full filtering, sorting, and supporting order drill-down and validate independently.
4. Add Phase 6 Recharts visualization refinement and validate chart/table parity independently.
5. Run Phase 7 verification before marking the feature complete.

### Parallel Team Strategy

1. One developer completes shared API contract and route scaffolding.
2. One developer builds reusable staff-web report components.
3. One developer writes API aggregation tests and Playwright flows.
4. After the foundation is stable, split by story: US1 sales summaries, US2 popularity, US3 filters/sorting/drill-down.
5. After story completion, split the visualization refinement across chart component tests, page tests, Playwright coverage, and the Recharts-backed `ReportChart` implementation.

---

## Notes

- [P] tasks use different files or independent test sections and can be run in parallel.
- T016-T020 are mandatory foundation test-backfill tasks caused by the constitution v1.1.0 TDD amendment and must be completed before further story implementation.
- Tests MUST be written first for each story and fail for the expected reason before implementation.
- Keep tests correct, fast enough, deterministic, readable, independent, behavior-focused, cheap to maintain, and targeted at real risk.
- Keep sales calculations tied to order beverage snapshots, not mutable menu item names or current prices.
- Keep the existing sidebar `Reports` entry as the only entry point.
- Keep Recharts usage isolated behind `ReportChart` so dashboard page logic remains focused on report data and drill-down behavior.
- Do not add export, scheduled reports, payment reconciliation, forecasting, or cross-location BI in this feature.
