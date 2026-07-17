# Tasks: Loyalty Program

**Input**: Design documents from `/specs/003-loyalty-program/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/loyalty.openapi.yaml, quickstart.md

**Tests**: Required by the project constitution. For each executable behavior, write the listed tests first, run them, and confirm they fail for the expected reason before implementing.

**Organization**: Tasks are grouped by user story so customer identity can ship as the MVP before earning, redemption, and expiration are added incrementally.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with adjacent tasks because it uses different files and does not depend on incomplete behavior
- **[Story]**: Maps a task to its specification user story
- Every task includes the exact file path to change

## Phase 1: Setup (Shared Test Support)

**Purpose**: Establish reusable loyalty fixtures and browser mocks without changing production behavior.

- [x] T001 Create API loyalty customer fixtures with E.164 identities plus rule, reward, order, redemption-cancellation, and ledger builders in `apps/api/tests/integration/loyaltyTestFixtures.ts`
- [x] T002 [P] Create staff-web loyalty customer, point history, configuration, and reward test data in `apps/staff-web/src/test/loyaltyTestData.ts`
- [x] T003 [P] Extend authenticated loyalty API route mocks, standalone reward cancellation responses, and mutable balance fixtures in `apps/staff-web/tests/e2e/testApiMocks.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the shared contract and persistent model required by every loyalty story.

**Critical**: No user story implementation begins until the migration, schema, contracts, and test cleanup support are complete.

### Tests for Foundation (write first)

- [x] T004 Write failing database constraint tests for normalized phone uniqueness, one-active-policy indexes, ledger signs and allocation references, and loyalty discount bounds in `apps/api/tests/integration/loyalty-schema.test.ts`

### Foundation Implementation

- [x] T005 [P] Define loyalty enums, customers, configurations, rewards, point events, applied rewards, and order loyalty totals in `packages/shared/src/domain/types.ts`
- [x] T006 [P] Define the customer, point, configuration, reward, and extended order request/response contracts from the OpenAPI design in `packages/shared/src/contracts/api.ts`
- [x] T007 Add loyalty enums, customers, earning rules, expiration policies, reward options, order associations, redemptions, ledger entries, allocations, indexes, checks, and order discount storage in `apps/api/src/storage/schema.ts`
- [x] T008 Create the matching PostgreSQL DDL, constraints, partial unique indexes, and existing-order backfill in `apps/api/drizzle/migrations/0003_loyalty_program.sql`
- [x] T009 Extend integration database cleanup and deterministic fixture teardown for all loyalty tables in `apps/api/tests/integration/testFixtures.ts`

**Checkpoint**: The complete loyalty storage model migrates cleanly, shared contracts compile, and the foundation constraint test passes.

---

## Phase 3: User Story 1 - Register and Identify Loyalty Customers (Priority: P1) MVP

**Goal**: Authorized staff can register, search, view, and edit one durable customer account using a required unique E.164 phone identity derived from the configured shop region and an optional valid email identity that is unique ignoring letter case.

**Independent Test**: Register a customer without email using a valid local phone, find them by equivalent international phone and name, reject equivalent dial-prefix and invalid phones, reject malformed supplied email before uniqueness, create or edit a second customer with the same trimmed case-insensitive email, and confirm each rejected update leaves the original account unchanged.

### Tests for User Story 1 (write first)

- [X] T010 [P] [US1] Write failing unit tests for `SHOP_PHONE_REGION`, valid E.164 normalization, equivalent local/international/dial-prefix input, invalid phones, customer creation, search ordering, profile edits, and duplicate conflicts in `apps/api/tests/unit/loyaltyCustomerService.test.ts`
- [X] T011 [P] [US1] Write failing authorized and unauthorized contract tests for `GET/POST /loyalty/customers` and `GET/PATCH /loyalty/customers/:customerId` in `apps/api/tests/integration/loyalty.customer.contract.test.ts`
- [X] T012 [P] [US1] Write failing component tests for customer search, no-result, registration, duplicate error, selection, profile edit, loading, and optional email states in `apps/staff-web/src/components/LoyaltyCustomerComponents.test.tsx`
- [X] T013 [P] [US1] Write the failing Playwright local-phone registration, international lookup, equivalent dial-prefix duplicate, invalid-phone, and edit journey in `apps/staff-web/tests/e2e/loyalty-program.spec.ts`

### Implementation for User Story 1

- [X] T014 [US1] Add `libphonenumber-js` to `apps/api/package.json` and `package-lock.json`, then implement configured-region E.164 normalization and transactional customer create, search, get, and update operations in `apps/api/src/domain/loyaltyCustomerService.ts`
- [X] T015 [US1] Add customer query, create, path, and patch Zod schemas with valid regional phone, email, and pagination validation in `apps/api/src/routes/validators.ts`
- [X] T016 [US1] Implement protected customer search, registration, profile, and edit endpoints with duplicate conflict mapping in `apps/api/src/routes/loyaltyCustomerRoutes.ts`
- [X] T017 [US1] Mount the protected loyalty route group in `apps/api/src/app.ts`
- [X] T018 [P] [US1] Implement customer search, registration, profile, and edit client calls in `apps/staff-web/src/services/loyaltyApi.ts`
- [X] T019 [US1] Implement debounced phone/name search, quick registration, exact selection, and clear-selection behavior in `apps/staff-web/src/components/LoyaltyCustomerPicker.tsx`
- [X] T020 [P] [US1] Implement identity display and editable name, phone, and optional email form states without customer activation controls in `apps/staff-web/src/components/LoyaltyCustomerProfile.tsx`
- [X] T021 [US1] Build the customer search, registration, and profile workspace in `apps/staff-web/src/pages/LoyaltyPage.tsx`
- [X] T022 [US1] Add the `#loyalty` sidebar entry and route `LoyaltyPage` inside the existing authorized staff shell in `apps/staff-web/src/App.tsx`
- [X] T023 [US1] Add compact responsive customer picker, registration, profile, error, loading, and empty-state styles in `apps/staff-web/src/styles.css`
- [X] T024 [US1] Run the focused API, component, and Playwright US1 checks and record E.164 equivalence plus the 45-second registration and 15-second lookup evidence in `specs/003-loyalty-program/quickstart.md`

### Email Identity Follow-up (write tests first)

- [X] T025 [P] [US1] Write failing unit tests for malformed email rejection before uniqueness, trimming supplied email, case-insensitive duplicate creates and edits, blank-email handling, named phone/email constraint mapping, and unchanged customer data after a rejected update in `apps/api/tests/unit/loyaltyCustomerService.test.ts`
- [X] T026 [P] [US1] Extend failing customer API contract tests for malformed-email `400` responses before uniqueness, email-specific `409` responses on create and update, mixed-case and surrounding-whitespace collisions, and preserved account data in `apps/api/tests/integration/loyalty.customer.contract.test.ts`
- [X] T027 [P] [US1] Add failing migration and database tests for existing-email trimming, blank-to-null conversion, named partial `lower(email)` uniqueness, concurrent conflicts, and duplicate-data preflight failure in `apps/api/tests/integration/loyalty-schema.test.ts`
- [X] T028 [P] [US1] Extend failing customer component tests for malformed-email and email-specific duplicate messages plus retained form/profile values after rejected edits in `apps/staff-web/src/components/LoyaltyCustomerComponents.test.tsx`
- [X] T029 [P] [US1] Extend the failing Playwright customer journey for malformed-email rejection, case-insensitive email duplicate registration, duplicate email edit, and unchanged profile state in `apps/staff-web/tests/e2e/loyalty-program.spec.ts`

### Email Identity Follow-up Implementation

- [X] T030 [US1] Add the `0004_loyalty_customer_email_identity.sql` migration and matching named partial unique-index definition with collision preflight in `apps/api/drizzle/migrations/0004_loyalty_customer_email_identity.sql` and `apps/api/src/storage/schema.ts`
- [X] T031 [US1] Normalize optional email by trimming while preserving display casing, distinguish named phone versus email unique-constraint violations, and preserve atomic update behavior in `apps/api/src/domain/loyaltyCustomerService.ts`
- [X] T032 [US1] Return malformed-email validation before field-specific customer identity conflicts from protected create and update routes in `apps/api/src/routes/loyaltyCustomerRoutes.ts`
- [X] T033 [US1] Surface email-specific create and edit conflicts without clearing the customer form or profile in `apps/staff-web/src/services/loyaltyApi.ts`, `apps/staff-web/src/components/LoyaltyCustomerPicker.tsx`, `apps/staff-web/src/components/LoyaltyCustomerProfile.tsx`, and `apps/staff-web/src/styles.css`
- [X] T034 [US1] Run focused schema, customer service, customer contract, component, and Playwright email-identity checks and record format validation, migration, collision, and unchanged-update evidence in `specs/003-loyalty-program/quickstart.md`

**Checkpoint**: User Story 1 is a complete staff-only customer identity MVP with unique phone and supplied email identities, independently demonstrable without earning, rewards, or expiration.

---

## Phase 4: User Story 2 - Award Points From Eligible Purchases (Priority: P2)

**Goal**: Staff can configure one active amount- or beverage-based rule, associate a customer during order creation, and post or reverse whole points exactly once through the existing order lifecycle.

**Independent Test**: Configure `10.00 -> 1 point`, complete an associated `25.00` order and receive 2 points; switch to `1 beverage -> 1 point`, cancel one of three beverage units and receive 2 points; fully cancel another order and receive none.

### Tests for User Story 2 (write first)

- [X] T035 [P] [US2] Write failing rule-versioning, threshold validation, amount calculation, beverage calculation, and no-carryover unit tests in `apps/api/tests/unit/loyaltyConfigurationService.test.ts`
- [X] T036 [P] [US2] Write failing earned, balance summary, readable history, idempotent post, and earning-reversal unit tests in `apps/api/tests/unit/loyaltyLedgerService.test.ts`
- [X] T037 [P] [US2] Extend failing contract tests for active earning rule get/replace, customer point summary, create-time order association payloads, and absence of a post-creation association API in `apps/api/tests/integration/loyalty.customer.contract.test.ts`
- [X] T038 [P] [US2] Write failing amount, beverage, immutable create-time association, no-customer order, partial-cancellation, full-cancellation, completed-order reversal, and duplicate-completion integration tests in `apps/api/tests/integration/loyalty-order-lifecycle.test.ts`
- [X] T039 [P] [US2] Write failing component tests for earning rule controls, balance totals, point history, and counter customer selection in `apps/staff-web/src/components/LoyaltyEarningComponents.test.tsx`
- [X] T040 [P] [US2] Extend the failing Playwright journey for customer association, amount earning, beverage earning, partial cancellation, and history in `apps/staff-web/tests/e2e/loyalty-program.spec.ts`

### Implementation for User Story 2

- [X] T041 [US2] Implement active earning rule reads and transactional retire-and-insert version replacement in `apps/api/src/domain/loyaltyConfigurationService.ts`
- [X] T042 [US2] Implement amount and beverage calculations, earned and adjusted ledger posting, available/lifetime totals, readable order labels, and idempotency keys in `apps/api/src/domain/loyaltyLedgerService.ts`
- [X] T043 [US2] Implement immutable create-time order association and eligible amount/beverage calculation from non-cancelled purchased snapshots in `apps/api/src/domain/loyaltyOrderService.ts`
- [X] T044 [US2] Add earning rule, customer point response, and order loyalty association validation schemas in `apps/api/src/routes/validators.ts`
- [X] T045 [US2] Add protected earning rule get/replace and customer point summary/history endpoints in `apps/api/src/routes/loyaltyCustomerRoutes.ts`
- [X] T046 [US2] Extend order creation to validate a registered customer and insert the immutable loyalty order association atomically, with no post-creation reassignment path, in `apps/api/src/domain/orderCreationService.ts`
- [X] T047 [US2] Map loyalty customer identity, point effects, gross total, zero reward coverage, and payable total into order responses in `apps/api/src/domain/orderMapper.ts`
- [X] T048 [US2] Post configured earning in the same transaction as the successful `in_progress -> completed` transition in `apps/api/src/domain/orderFulfillmentService.ts`
- [X] T049 [US2] Append one adjusted earning reversal when a completed loyalty order is fully cancelled before pickup in `apps/api/src/domain/orderFulfillmentService.ts`
- [X] T050 [P] [US2] Implement earning rule and customer point summary/history client calls in `apps/staff-web/src/services/loyaltyApi.ts`
- [X] T051 [US2] Implement amount/beverage segmented controls, thresholds, points, active rule display, and save conflicts in `apps/staff-web/src/components/LoyaltyProgramSettings.tsx` and mount the settings workspace in `apps/staff-web/src/pages/LoyaltyPage.tsx`
- [X] T052 [US2] Extend the customer profile with available, lifetime earned, redeemed, returned, expired, adjusted totals and order-labelled point history in `apps/staff-web/src/components/LoyaltyCustomerProfile.tsx`
- [X] T053 [US2] Embed the compact customer picker in the counter flow and include the selected customer in order creation in `apps/staff-web/src/pages/CounterOrderPage.tsx`
- [X] T054 [US2] Run focused rule, ledger, lifecycle, contract, component, and Playwright US2 checks and record earning evidence in `specs/003-loyalty-program/quickstart.md`

**Checkpoint**: User Stories 1 and 2 work independently; an associated completed order produces an auditable point balance without requiring reward or expiration configuration.

---

## Phase 5: User Story 3 - Redeem Configurable Rewards (Priority: P3)

**Goal**: Staff can configure immutable free-beverage and size-upgrade benefit types, redeem one reward per beverage unit from the latest unexpired balance during order creation, show covered and payable values, and cancel only the reward before pickup with an exact point return.

**Independent Test**: Give a customer 12 points, redeem a 10-point complete-unit free beverage and see 2 remain, prevent stacking on that unit, block a 5-point size upgrade at 4 points, then cancel only an applied reward and confirm the beverage/order remain active while original point buckets return once.

### Tests for User Story 3 (write first)

- [ ] T055 [P] [US3] Write failing reward create, edit, retire, active-list, immutable benefit type, free-unit coverage, size-adjustment coverage, non-stacking, validation, and immutable snapshot unit tests in `apps/api/tests/unit/loyaltyConfigurationService.test.ts`
- [ ] T056 [P] [US3] Write failing earliest-expiring allocation, insufficient balance, redemption debit, standalone cancellation, multi-bucket original-expiration return, stale balance, and idempotent return unit tests in `apps/api/tests/unit/loyaltyLedgerService.test.ts`
- [ ] T057 [P] [US3] Write failing simultaneous-redemption and customer-row-lock integration tests in `apps/api/tests/integration/loyalty-redemption-concurrency.test.ts`
- [ ] T058 [P] [US3] Extend failing contract tests for reward CRUD/list, immutable benefit type, atomic non-stackable order reward selections, targets, totals, conflicts, and `POST /orders/:orderId/loyalty-rewards/:redemptionId/cancel` in `apps/api/tests/integration/loyalty.customer.contract.test.ts`
- [ ] T059 [P] [US3] Extend failing lifecycle tests for complete-unit free beverage coverage, selected size adjustment, non-stacking, standalone reward cancellation, target beverage cancellation, full order cancellation, returned points, and reward snapshots in `apps/api/tests/integration/loyalty-order-lifecycle.test.ts`
- [ ] T060 [P] [US3] Write failing unit tests for reward-covered item sales, order sales, popularity, amount earning basis, and beverage earning basis in `apps/api/tests/unit/reportingService.test.ts`
- [ ] T061 [P] [US3] Extend failing report contract tests for gross captured totals, reward coverage, payable/reportable totals, and returned rewards in `apps/api/tests/integration/reports.contract.test.ts`
- [ ] T062 [P] [US3] Write failing component tests for immutable reward configuration, affordability, non-stacking beverage targets, size-choice selection, draft/created/queue/history reward display, standalone cancellation action, stale conflicts, and returns in `apps/staff-web/src/components/LoyaltyRewardComponents.test.tsx`
- [ ] T063 [P] [US3] Extend the failing Playwright journey for reward configuration, complete-unit coverage, size adjustment, non-stacking, successful redemption, insufficient points, standalone cancellation, target cancellation, and point return in `apps/staff-web/tests/e2e/loyalty-program.spec.ts`

### Implementation for User Story 3

- [ ] T064 [US3] Implement reward option create, active/all list, editable metadata, immutable benefit type, and retirement/replacement behavior while preserving redemption snapshots in `apps/api/src/domain/loyaltyConfigurationService.ts`
- [ ] T065 [US3] Add reward create/update/query, non-stackable order selection, conditional size-choice, and standalone reward cancellation path validation in `apps/api/src/routes/validators.ts`
- [ ] T066 [US3] Add protected reward list, create, edit, and retire endpoints in `apps/api/src/routes/loyaltyCustomerRoutes.ts`
- [ ] T067 [US3] Implement customer locking, latest balance refresh, earliest-expiring debit allocation, and idempotent standalone/beverage/order return credits that retain original expiration dates in `apps/api/src/domain/loyaltyLedgerService.ts`
- [ ] T068 [US3] Implement complete-unit free-beverage coverage including customizations, selected positive size-adjustment coverage, one-reward-per-unit validation, snapshots, complimentary quantity, and active coverage calculations in `apps/api/src/domain/loyaltyOrderService.ts`
- [ ] T069 [US3] Extend order creation to insert beverage snapshots, immutable association, non-stackable redemption snapshots, ledger debits, allocations, and loyalty discount total in one transaction in `apps/api/src/domain/orderCreationService.ts`
- [ ] T070 [US3] Extend order mapping and order/queue/history loaders with loyalty customer, applied reward snapshots, active coverage, and payable total in `apps/api/src/domain/orderMapper.ts`, `apps/api/src/domain/orderCreationService.ts`, `apps/api/src/domain/queueService.ts`, and `apps/api/src/domain/orderHistoryService.ts`
- [ ] T071 [US3] Return an active targeted redemption exactly once when its beverage is cancelled in `apps/api/src/domain/beverageService.ts`
- [ ] T072 [US3] Implement standalone reward cancellation plus full-order reward returns and earning-reversal ordering in `apps/api/src/domain/orderFulfillmentService.ts`, and expose the protected cancellation command in `apps/api/src/routes/orderFulfillmentRoutes.ts`
- [ ] T073 [US3] Load active reward coverage with report orders and attribute covered amounts to target beverage snapshots in `apps/api/src/domain/reportingService.ts`
- [ ] T074 [US3] Subtract active reward coverage from reportable order/item sales and keep free-beverage versus size-upgrade earning quantities correct in `apps/api/src/domain/reportingService.ts`
- [ ] T075 [P] [US3] Implement reward option list/create/update calls in `apps/staff-web/src/services/loyaltyApi.ts`, serialize non-stackable selections in `apps/staff-web/src/services/ordersApi.ts`, and add standalone reward cancellation in `apps/staff-web/src/services/fulfillmentApi.ts`
- [ ] T076 [US3] Add reward list, create-only benefit type, editable name/cost/description/availability, retirement/replacement guidance, and controls in `apps/staff-web/src/components/LoyaltyProgramSettings.tsx` and expose them from `apps/staff-web/src/pages/LoyaltyPage.tsx`
- [ ] T077 [US3] Implement affordable reward choices, complete-unit free-beverage targets, selected positive size adjustments, one-reward-per-unit enforcement, unavailable explanations, and remove behavior in `apps/staff-web/src/components/LoyaltyRewardSelector.tsx`
- [ ] T078 [US3] Show applied rewards, points spent, gross total, reward coverage, payable total, and pre-pickup standalone cancellation action without layout shift across `apps/staff-web/src/components/OrderSummary.tsx`, `apps/staff-web/src/components/OrderCreatedBanner.tsx`, `apps/staff-web/src/components/QueueOrderCard.tsx`, and `apps/staff-web/src/components/OrderHistoryList.tsx`
- [ ] T079 [US3] Connect selected customer balance, rewards, stale-balance refresh, and reward payloads to order creation in `apps/staff-web/src/pages/CounterOrderPage.tsx`
- [ ] T080 [US3] Add responsive reward configuration, selection, target, totals, returned, and conflict-state styles in `apps/staff-web/src/styles.css`
- [ ] T081 [US3] Run focused reward, allocation, concurrency, lifecycle, report, component, and Playwright US3 checks and record coverage, non-stacking, and standalone cancellation evidence in `specs/003-loyalty-program/quickstart.md`

**Checkpoint**: User Stories 1-3 are independently testable; reward spending cannot overspend a balance, benefits affect order/report values correctly, and cancellation restores points exactly once.

---

## Phase 6: User Story 4 - Configure and Enforce Point Expiration (Priority: P4)

**Goal**: Staff can disable expiration or configure calendar months, while point reads and redemptions materialize month-end expiration once using the shop business date.

**Independent Test**: With a 3-month policy, verify all July points remain available through October 31, become expired on November 1, remain visible in history, and cannot be redeemed after the cutoff.

### Tests for User Story 4 (write first)

- [ ] T082 [P] [US4] Write failing policy versioning, disabled policy, positive month validation, July-to-October cutoff, year rollover, and shop business-date unit tests in `apps/api/tests/unit/loyaltyConfigurationService.test.ts`
- [ ] T083 [P] [US4] Write failing lazy expiration, partial unspent expiration, idempotent repeated reads, redemption cutoff, returned-after-cutoff, and historical policy unit tests in `apps/api/tests/unit/loyaltyLedgerService.test.ts`
- [ ] T084 [P] [US4] Extend failing contract tests for expiration policy get/replace and point summary materialization as of the shop business date in `apps/api/tests/integration/loyalty.customer.contract.test.ts`
- [ ] T085 [P] [US4] Write failing component tests for enabled/disabled expiration controls, month input, active cutoff explanation, expired totals, and expired history in `apps/staff-web/src/components/LoyaltyExpirationComponents.test.tsx`
- [ ] T086 [P] [US4] Extend the failing Playwright journey for October 31 availability, November 1 expiration, blocked redemption, and visible history in `apps/staff-web/tests/e2e/loyalty-program.spec.ts`

### Implementation for User Story 4

- [ ] T087 [US4] Implement expiration policy reads, transactional version replacement, and end-of-future-month cutoff calculation in `apps/api/src/domain/loyaltyConfigurationService.ts`
- [ ] T088 [US4] Add expiration policy input validation and enforce enabled/month consistency in `apps/api/src/routes/validators.ts`
- [ ] T089 [US4] Add protected expiration policy get and replace endpoints in `apps/api/src/routes/loyaltyCustomerRoutes.ts`
- [ ] T090 [US4] Assign the active policy version and calculated expiration business date when earned points post in `apps/api/src/domain/loyaltyLedgerService.ts`
- [ ] T091 [US4] Materialize unspent expired debits and allocations transactionally before point reads and redemptions without duplicate events in `apps/api/src/domain/loyaltyLedgerService.ts`
- [ ] T092 [US4] Invoke expiration refresh before returning customer totals/history and expose the `asOfBusinessDate` in `apps/api/src/routes/loyaltyCustomerRoutes.ts`
- [ ] T093 [P] [US4] Implement expiration policy get/replace client calls in `apps/staff-web/src/services/loyaltyApi.ts`
- [ ] T094 [US4] Add disabled/enabled controls, calendar-month input, active policy display, and cutoff explanation in `apps/staff-web/src/components/LoyaltyProgramSettings.tsx` and expose them from `apps/staff-web/src/pages/LoyaltyPage.tsx`
- [ ] T095 [US4] Render expired totals and expiration-date history distinctly while keeping returned and adjusted entries understandable in `apps/staff-web/src/components/LoyaltyCustomerProfile.tsx`
- [ ] T096 [US4] Add expiration policy and history state styles that remain readable in the staff shell in `apps/staff-web/src/styles.css`
- [ ] T097 [US4] Run focused policy, ledger, contract, component, and Playwright US4 checks and record calendar-cutoff evidence in `specs/003-loyalty-program/quickstart.md`

**Checkpoint**: All four stories work and the clarified calendar-month cutoff is enforced consistently in balances, history, and redemption.

---

## Phase 7: Polish and Cross-Cutting Verification

**Purpose**: Close authorization, accessibility, performance, contract parity, and full-suite risks across the complete feature.

- [ ] T098 [P] Add an explicit unauthorized/CSRF matrix for every loyalty mutation and read endpoint in `apps/api/tests/integration/auth-security.test.ts`
- [ ] T099 [P] Add large-fixture lookup, balance, history, and redemption timing coverage for required indexes and 500 ms API targets in `apps/api/tests/integration/loyalty-performance.test.ts`
- [ ] T100 [P] Add keyboard, labels, focus, loading, empty, overflow, and responsive regression tests for the loyalty route and counter integration in `apps/staff-web/src/App.test.tsx`
- [ ] T101 Reconcile implemented request/response fields, errors, security, and nullability against `specs/003-loyalty-program/contracts/loyalty.openapi.yaml`
- [ ] T102 Run all shared, API, and staff-web unit/integration tests and record any required corrections in `specs/003-loyalty-program/quickstart.md`
- [ ] T103 Run the focused loyalty Playwright flow and manually verify E.164 registration/lookup, configuration, non-stackable redemption, standalone cancellation, and expiration timing targets in `specs/003-loyalty-program/quickstart.md`
- [ ] T104 Run `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`, then record final validation evidence in `specs/003-loyalty-program/quickstart.md`
- [ ] T105 Perform the final spec, plan, data model, contract, checklist, tasks, and implementation consistency review in `specs/003-loyalty-program/checklists/requirements.md`

---

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1 Setup**: Starts immediately.
- **Phase 2 Foundation**: Depends on Phase 1 and blocks every story.
- **Phase 3 US1**: Depends on Foundation and delivers the MVP customer identity; the email identity follow-up T025-T034 completes before US2 begins.
- **Phase 4 US2**: Depends on the complete US1 identity implementation because orders require a registered customer.
- **Phase 5 US3**: Depends on US2's ledger and order association foundations.
- **Phase 6 US4**: Depends on US2's earned credits and ledger; it can be developed alongside US3 with coordination around shared ledger, route, service, and UI files.
- **Phase 7 Polish**: Depends on every story selected for the release.

### User Story Dependency Graph

```text
Foundation
    |
    v
US1 Customer identity (MVP)
    |
    v
US2 Earning and order association
    |
    +------------------+
    |                  |
    v                  v
US3 Redemption     US4 Expiration
    |                  |
    +--------+---------+
             |
             v
       Cross-cutting verification
```

### Within Each User Story

1. Write all listed tests and confirm each fails for the intended missing behavior.
2. Implement domain rules and transaction boundaries.
3. Implement route validation and protected contracts.
4. Implement staff-web services and components.
5. Run the story's focused unit, integration, component, and end-to-end checks.
6. Stop at the checkpoint before starting the next priority.

## Parallel Opportunities

### User Story 1

```text
T010 customer service unit tests
T011 customer API contract tests
T012 customer component tests
T013 customer Playwright journey
T025 email identity unit tests
T026 email identity API contract tests
T027 email identity migration tests
T028 email identity component tests
T029 email identity Playwright journey
```

After the migration and API contract are stable, `T033` can proceed before the focused validation task `T034`.

### User Story 2

```text
T035 earning configuration unit tests
T036 earning ledger unit tests
T037 earning API contract tests
T038 order lifecycle integration tests
T039 earning UI component tests
T040 earning Playwright journey
```

`T050` can proceed alongside server integration once the shared contract from Foundation is stable.

### User Story 3

```text
T055 reward configuration unit tests
T056 point allocation unit tests
T057 concurrent redemption integration tests
T058 reward API contract tests
T059 reward cancellation lifecycle tests
T060 reporting unit tests
T061 report contract tests
T062 reward component tests
T063 redemption Playwright journey
```

After server contracts stabilize, `T075` can proceed while report calculations and cancellation integration are completed.

### User Story 4

```text
T082 expiration policy unit tests
T083 expiration ledger unit tests
T084 expiration API contract tests
T085 expiration component tests
T086 expiration Playwright journey
```

`T093` can proceed alongside server implementation after the shared expiration contract is stable.

## Implementation Strategy

### MVP First

1. Complete Setup and Foundation.
2. Complete User Story 1, including T025-T034 email identity follow-up.
3. Run the US1 focused tests and timed registration/lookup flow.
4. Demonstrate or release customer enrollment and lookup before introducing point state.

### Incremental Delivery

1. **US1**: Durable customer identity.
2. **US2**: Configurable earning and auditable balances.
3. **US3**: Configurable redemption, cancellation returns, and net sales integration.
4. **US4**: Configurable calendar-month expiration.
5. **Polish**: Full authorization, accessibility, performance, contract, and regression verification.

### Test Pyramid

- Keep most coverage in domain/service and React component tests.
- Use contract and integration tests for database constraints, protected routes, transaction idempotency, lifecycle hooks, and concurrent redemption.
- Keep Playwright focused on one critical journey per story plus measurable staff task timing.
- Use deterministic shop business dates and isolated database fixtures so month boundaries and concurrency tests remain repeatable.

## Notes

- Every implementation task follows its story's failing tests.
- `[P]` marks work in distinct files; tasks that share `loyaltyLedgerService.ts`, `loyaltyCustomerRoutes.ts`, `LoyaltyProgramSettings.tsx`, or `styles.css` remain sequential.
- Do not mutate historical earning, reward, redemption, or expiration records to satisfy a current-state test; append the required event or configuration version.
- Preserve existing order state transitions, purchased snapshots, report graph/table parity, staff authorization, and business-date behavior while adding loyalty effects.
- Commit only when explicitly requested or when the `/speckit-git-commit` workflow is invoked.
