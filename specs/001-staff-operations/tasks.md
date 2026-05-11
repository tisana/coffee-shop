# Tasks: Shop Staff Operations

**Input**: Design documents from `/specs/001-staff-operations/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: Automated tests are included for high-risk areas required by the constitution: authorization, queue concurrency, state transitions, daily order numbering, purchased-detail preservation, and the primary staff workflow.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after setup and foundational work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or has no dependency on incomplete tasks
- **[Story]**: Maps to the user story phase, such as [US1], [US2], [US3]
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the monorepo, app shells, container files, and developer commands.

- [ ] T001 Create root workspace package scripts for dev/test/db commands in `package.json`
- [ ] T002 Create shared TypeScript configuration in `tsconfig.base.json`
- [ ] T003 [P] Create API package manifest and scripts in `apps/api/package.json`
- [ ] T004 [P] Create staff web package manifest and scripts in `apps/staff-web/package.json`
- [ ] T005 [P] Create shared package manifest and exports in `packages/shared/package.json`
- [ ] T006 Create Docker Compose database service in `infra/docker/compose.yml`
- [ ] T007 [P] Create API Dockerfile in `apps/api/Dockerfile`
- [ ] T008 [P] Create staff web Dockerfile in `apps/staff-web/Dockerfile`
- [ ] T009 [P] Configure repo formatting and linting in `eslint.config.js`
- [ ] T010 [P] Configure ignore rules for generated and local files in `.gitignore`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared domain, database, auth, API, web shell, and test harness needed before user stories.

**Critical**: No user story work should begin until this phase is complete.

- [ ] T011 Configure Drizzle for PostgreSQL migrations in `apps/api/drizzle.config.ts`
- [ ] T012 Define database schema for staff, menu, customizations, orders, beverages, sessions, and daily sequences in `apps/api/src/storage/schema.ts`
- [ ] T013 Create initial Drizzle migration for all foundational tables in `apps/api/drizzle/migrations/0001_initial.sql`
- [ ] T014 Implement PostgreSQL connection and transaction helper in `apps/api/src/storage/db.ts`
- [ ] T015 Create database migration runner script in `apps/api/src/storage/migrate.ts`
- [ ] T016 Create seed script for authorized staff and starter menu/customizations in `apps/api/src/storage/seed.ts`
- [ ] T017 [P] Define shared order, beverage, menu, customization, and staff types in `packages/shared/src/domain/types.ts`
- [ ] T018 [P] Define shared status transition constants in `packages/shared/src/domain/status.ts`
- [ ] T019 [P] Define shared API request/response contracts in `packages/shared/src/contracts/api.ts`
- [ ] T020 Implement Zod validators for auth, menu, order, queue, beverage, and history requests in `apps/api/src/routes/validators.ts`
- [ ] T021 Implement Express app setup, JSON parsing, cookie parsing, and route mounting in `apps/api/src/app.ts`
- [ ] T022 Implement server entrypoint and graceful shutdown in `apps/api/src/server.ts`
- [ ] T023 Implement typed API error helpers and conflict responses in `apps/api/src/routes/errors.ts`
- [ ] T024 Implement password hashing and verification utilities in `apps/api/src/auth/passwords.ts`
- [ ] T025 Implement HTTP-only session creation, lookup, and deletion in `apps/api/src/auth/sessions.ts`
- [ ] T026 Implement staff authorization middleware in `apps/api/src/auth/requireStaff.ts`
- [ ] T027 [P] Configure Vitest for API unit and integration tests in `apps/api/vitest.config.ts`
- [ ] T028 [P] Configure Playwright for staff workflow tests in `apps/staff-web/playwright.config.ts`
- [ ] T029 [P] Create staff web Vite entrypoint in `apps/staff-web/src/main.tsx`
- [ ] T030 [P] Create staff web API client foundation in `apps/staff-web/src/services/apiClient.ts`
- [ ] T031 [P] Create staff web application shell and navigation in `apps/staff-web/src/App.tsx`

**Checkpoint**: Foundation ready. User story implementation can start.

---

## Phase 3: User Story 1 - Take a Counter Order (Priority: P1)

**Goal**: Authorized staff can create a counter order, receive a daily order number, and push the order to the brew queue.

**Independent Test**: Enter a customer order with one or more beverages, confirm a daily order number is generated, and confirm the order can be pushed to the queue.

### Tests for User Story 1

- [ ] T032 [P] [US1] Add contract tests for `POST /auth/login`, `GET /staff/session`, `POST /orders` with optional pickup name, and `POST /orders/{orderId}/queue` in `apps/api/tests/integration/order-create.contract.test.ts`
- [ ] T033 [P] [US1] Add daily order number concurrency test in `apps/api/tests/integration/daily-order-number.test.ts`
- [ ] T034 [P] [US1] Add purchased customization snapshot test in `apps/api/tests/integration/order-snapshot.test.ts`
- [ ] T035 [P] [US1] Add Playwright counter order flow test with optional pickup name capture, queue submission feedback, and 60-second order creation timing assertion in `apps/staff-web/tests/e2e/counter-order.spec.ts`

### Implementation for User Story 1

- [ ] T036 [US1] Implement auth routes for login, logout, and current session in `apps/api/src/routes/authRoutes.ts`
- [ ] T037 [US1] Implement menu read service for order taking in `apps/api/src/domain/menuService.ts`
- [ ] T038 [US1] Implement order creation service with daily number transaction, pickup name persistence, purchased customization snapshots, and created status timestamp in `apps/api/src/domain/orderCreationService.ts`
- [ ] T039 [US1] Implement order creation routes in `apps/api/src/routes/orderRoutes.ts`
- [ ] T040 [US1] Implement queue submission service for created orders with queued status timestamp in `apps/api/src/domain/queueSubmissionService.ts`
- [ ] T041 [US1] Implement order queue submission route in `apps/api/src/routes/queueSubmissionRoutes.ts`
- [ ] T042 [US1] Create staff login page in `apps/staff-web/src/pages/LoginPage.tsx`
- [ ] T043 [US1] Create counter order page with optional pickup name input, menu, scoped customizations, and order summary in `apps/staff-web/src/pages/CounterOrderPage.tsx`
- [ ] T044 [US1] Create menu item customization selector in `apps/staff-web/src/components/CustomizationSelector.tsx`
- [ ] T045 [US1] Create order summary and submit controls in `apps/staff-web/src/components/OrderSummary.tsx`
- [ ] T046 [US1] Wire order creation and queue submission client calls in `apps/staff-web/src/services/ordersApi.ts`
- [ ] T047 [US1] Add created order and queue submission confirmation or error feedback with daily order number in `apps/staff-web/src/components/OrderCreatedBanner.tsx`

**Checkpoint**: User Story 1 is independently functional and demonstrates the MVP order-taking path.

---

## Phase 4: User Story 2 - Brew Orders from the Queue (Priority: P2)

**Goal**: Available baristas can view waiting orders, claim one order, and prevent duplicate claiming.

**Independent Test**: Push a created order to the queue, claim it as a barista, and verify another barista cannot claim the same order.

### Tests for User Story 2

- [ ] T048 [P] [US2] Add contract tests for `GET /queue/orders` and `POST /queue/orders/{orderId}/claim` in `apps/api/tests/integration/queue.contract.test.ts`
- [ ] T049 [P] [US2] Add concurrent order claim conflict test in `apps/api/tests/integration/queue-claim-concurrency.test.ts`
- [ ] T050 [P] [US2] Add Playwright brew queue claim flow test with 15-second claim timing assertion in `apps/staff-web/tests/e2e/brew-queue.spec.ts`

### Implementation for User Story 2

- [ ] T051 [US2] Implement active queue query service in `apps/api/src/domain/queueService.ts`
- [ ] T052 [US2] Implement atomic queue claim service with conflict handling and in-progress status timestamp in `apps/api/src/domain/queueClaimService.ts`
- [ ] T053 [US2] Implement queue list and claim routes in `apps/api/src/routes/queueRoutes.ts`
- [ ] T054 [US2] Create brew queue page with waiting and in-progress sections in `apps/staff-web/src/pages/BrewQueuePage.tsx`
- [ ] T055 [US2] Create queue order card showing daily number, beverages, customizations, and assigned barista in `apps/staff-web/src/components/QueueOrderCard.tsx`
- [ ] T056 [US2] Wire queue list and claim client calls in `apps/staff-web/src/services/queueApi.ts`
- [ ] T057 [US2] Add conflict feedback when a queued order is already claimed in `apps/staff-web/src/components/QueueConflictMessage.tsx`

**Checkpoint**: User Stories 1 and 2 work independently after foundation.

---

## Phase 5: User Story 3 - Complete and Notify Pickup (Priority: P3)

**Goal**: Baristas can complete or cancel beverages, complete the order only when remaining beverages are done, notify by daily number, and confirm pickup.

**Independent Test**: Create a multi-beverage order, cancel one beverage, complete the remaining beverages, complete the order, and confirm pickup.

### Tests for User Story 3

- [ ] T058 [P] [US3] Add contract tests for beverage complete, beverage cancel, order complete, order pickup, order cancel routes, and status timestamp responses in `apps/api/tests/integration/order-fulfillment.contract.test.ts`
- [ ] T059 [P] [US3] Add state transition guard tests for valid transitions, invalid transitions, and required timestamp changes in `apps/api/tests/unit/order-state-machine.test.ts`
- [ ] T060 [P] [US3] Add partial beverage cancellation test in `apps/api/tests/integration/partial-cancellation.test.ts`
- [ ] T061 [P] [US3] Add Playwright complete and pickup flow test with 10-second pickup confirmation timing assertion in `apps/staff-web/tests/e2e/order-completion.spec.ts`

### Implementation for User Story 3

- [ ] T062 [US3] Implement order state machine rules in `apps/api/src/domain/orderStateMachine.ts`
- [ ] T063 [US3] Implement beverage completion and cancellation service in `apps/api/src/domain/beverageService.ts`
- [ ] T064 [US3] Implement order completion, pickup confirmation, and order cancellation service with completed, picked-up, and cancelled status timestamps in `apps/api/src/domain/orderFulfillmentService.ts`
- [ ] T065 [US3] Implement beverage and order fulfillment routes in `apps/api/src/routes/orderFulfillmentRoutes.ts`
- [ ] T066 [US3] Add beverage status controls to queue order cards in `apps/staff-web/src/components/BeverageStatusControls.tsx`
- [ ] T067 [US3] Add ready-for-pickup callout panel using daily order number in `apps/staff-web/src/components/PickupCalloutPanel.tsx`
- [ ] T068 [US3] Wire fulfillment client calls in `apps/staff-web/src/services/fulfillmentApi.ts`
- [ ] T069 [US3] Add pickup confirmation interaction with clear success or error feedback in `apps/staff-web/src/components/PickupConfirmationButton.tsx`

**Checkpoint**: User Stories 1 through 3 form the complete staff order fulfillment journey.

---

## Phase 6: User Story 4 - Maintain Menu Availability (Priority: P4)

**Goal**: Staff can maintain menu item details, scoped customizations, and availability for future counter orders.

**Independent Test**: Mark an item unavailable, verify it cannot be selected for a new order, restore it, and update customization groups such as syrup or milk choices.

### Tests for User Story 4

- [ ] T070 [P] [US4] Add contract tests for menu item create/update, customization group updates, and save error responses in `apps/api/tests/integration/menu.contract.test.ts`
- [ ] T071 [P] [US4] Add menu availability selection guard test in `apps/api/tests/integration/menu-availability.test.ts`
- [ ] T072 [P] [US4] Add Playwright menu maintenance flow test with save feedback and 20-second availability update timing assertion in `apps/staff-web/tests/e2e/menu-maintenance.spec.ts`

### Implementation for User Story 4

- [ ] T073 [US4] Implement menu maintenance service for item details, availability, active state, and customization groups in `apps/api/src/domain/menuMaintenanceService.ts`
- [ ] T074 [US4] Implement menu maintenance routes in `apps/api/src/routes/menuRoutes.ts`
- [ ] T075 [US4] Create menu maintenance page in `apps/staff-web/src/pages/MenuMaintenancePage.tsx`
- [ ] T076 [US4] Create menu item editor with availability, active controls, and save confirmation or error feedback in `apps/staff-web/src/components/MenuItemEditor.tsx`
- [ ] T077 [US4] Create customization group and choice editor in `apps/staff-web/src/components/CustomizationGroupEditor.tsx`
- [ ] T078 [US4] Wire menu maintenance client calls in `apps/staff-web/src/services/menuApi.ts`

**Checkpoint**: Menu changes affect future orders and preserve existing order snapshots.

---

## Phase 7: User Story 5 - Review Daily Activity (Priority: P5)

**Goal**: Staff can find current-day orders by daily order number, status, or pickup name.

**Independent Test**: Create, complete, cancel, and pick up sample orders, then locate them in current-day history.

### Tests for User Story 5

- [ ] T079 [P] [US5] Add contract tests for `GET /orders/history` filters in `apps/api/tests/integration/order-history.contract.test.ts`
- [ ] T080 [P] [US5] Add current-day history query test in `apps/api/tests/integration/current-day-history.test.ts`
- [ ] T081 [P] [US5] Add Playwright daily activity search test covering daily order number, status, pickup-name filters, and 45-second current-day order lookup timing assertion in `apps/staff-web/tests/e2e/daily-activity.spec.ts`

### Implementation for User Story 5

- [ ] T082 [US5] Implement current-day order history service in `apps/api/src/domain/orderHistoryService.ts`
- [ ] T083 [US5] Implement order history route in `apps/api/src/routes/orderHistoryRoutes.ts`
- [ ] T084 [US5] Create daily activity page with number, status, and pickup-name filters in `apps/staff-web/src/pages/DailyActivityPage.tsx`
- [ ] T085 [US5] Create order history result list in `apps/staff-web/src/components/OrderHistoryList.tsx`
- [ ] T086 [US5] Wire order history client calls in `apps/staff-web/src/services/historyApi.ts`

**Checkpoint**: Current-day activity review is independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validate the full workflow, improve reliability, and prepare the next Speckit phase.

- [ ] T087 [P] Add API README with local commands and service ports in `apps/api/README.md`
- [ ] T088 [P] Add staff web README with local commands and test flow in `apps/staff-web/README.md`
- [ ] T089 Update root README with Docker Compose, migration, seed, dev, and test commands in `README.md`
- [ ] T090 Add quickstart validation notes after manual walkthrough in `specs/001-staff-operations/quickstart.md`
- [ ] T091 Add cross-story Playwright smoke test for login, order creation, queue claim, completion, pickup, menu availability, and history in `apps/staff-web/tests/e2e/full-staff-workflow.spec.ts`
- [ ] T092 Add security hardening checklist for session cookies and auth middleware in `apps/api/tests/integration/auth-security.test.ts`
- [ ] T093 Run and document final validation commands and all timing evidence in `specs/001-staff-operations/checklists/implementation-validation.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies
- **Phase 2 Foundational**: Depends on Phase 1 and blocks all user stories
- **Phase 3 US1**: Depends on Phase 2 and is the MVP
- **Phase 4 US2**: Depends on Phase 2; can be implemented after US1 data exists or with seeded queued orders
- **Phase 5 US3**: Depends on Phase 2; integrates naturally after US2 queue claiming
- **Phase 6 US4**: Depends on Phase 2; can be developed in parallel after foundation
- **Phase 7 US5**: Depends on Phase 2 and benefits from completed/cancelled seeded orders
- **Phase 8 Polish**: Depends on selected story phases

### User Story Dependencies

- **US1 Take a Counter Order**: No dependency on other stories after foundation; suggested MVP
- **US2 Brew Orders from the Queue**: Needs orders that can be queued; can use US1 or seeded data
- **US3 Complete and Notify Pickup**: Needs queued/in-progress orders; can use US2 or seeded data
- **US4 Maintain Menu Availability**: Independent after foundation, but should not break US1 order creation
- **US5 Review Daily Activity**: Independent after foundation with seeded orders, strongest after US1-US3

### Within Each User Story

- Tests first for the story
- Domain/service implementation before routes
- API routes before staff web integration
- Staff web components before page wiring when components are reusable
- Run the story's independent test before moving to the next priority

## Parallel Opportunities

- Setup tasks T003-T005 and T007-T010 can run in parallel.
- Foundational shared domain tasks T017-T019 can run in parallel with test harness tasks T027-T031 after package setup.
- Test tasks within each user story can run in parallel before implementation.
- US4 menu maintenance can be implemented in parallel with US2 or US3 after foundation.
- US5 history can be implemented in parallel if seeded data is available.

## Parallel Example: User Story 1

```text
Task: "T032 [US1] Add contract tests in apps/api/tests/integration/order-create.contract.test.ts"
Task: "T033 [US1] Add daily order number concurrency test in apps/api/tests/integration/daily-order-number.test.ts"
Task: "T034 [US1] Add purchased customization snapshot test in apps/api/tests/integration/order-snapshot.test.ts"
Task: "T035 [US1] Add Playwright counter order flow test in apps/staff-web/tests/e2e/counter-order.spec.ts"
```

## Parallel Example: User Story 4

```text
Task: "T075 [US4] Create menu maintenance page in apps/staff-web/src/pages/MenuMaintenancePage.tsx"
Task: "T076 [US4] Create menu item editor in apps/staff-web/src/components/MenuItemEditor.tsx"
Task: "T077 [US4] Create customization group editor in apps/staff-web/src/components/CustomizationGroupEditor.tsx"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 Setup.
2. Complete Phase 2 Foundational.
3. Complete Phase 3 User Story 1.
4. Validate counter order creation, daily order number generation, customization snapshots, and queue submission.
5. Stop for review before expanding the workflow.

### Incremental Delivery

1. US1 creates queueable counter orders.
2. US2 lets baristas claim queued orders.
3. US3 completes the brewing and pickup journey.
4. US4 adds menu and customization maintenance.
5. US5 adds daily activity review.

### Risk-First Validation

- Validate daily order number concurrency before relying on order creation.
- Validate queue claim conflicts before using the brew queue during service.
- Validate state transition guards before pickup confirmation.
- Validate purchased customization snapshots before allowing menu edits.
- Validate auth middleware before exposing staff operations.

## Notes

- [P] tasks use different files or can be completed without waiting on another incomplete task in the same phase.
- [US1] through [US5] labels map directly to the feature spec user stories.
- Keep generated implementation aligned with `specs/001-staff-operations/plan.md` and `specs/001-staff-operations/contracts/openapi.yaml`.
- Commit after each story checkpoint or coherent implementation slice.
