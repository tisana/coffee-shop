# Staff Web Coverage Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended for one coordinating session) or `superpowers:executing-plans` (recommended for a fresh implementation session) to execute this plan task-by-task. Track progress using the checkboxes below.

**Goal:** Raise `@coffee-shop/staff-web` Vitest coverage from 38.81% statements / 35.80% branches / 38.76% functions / 40.03% lines to at least 60% statements / 50% branches / 55% functions / 60% lines, then make those values the enforced quality gate.

**Architecture:** Backfill tests at two boundaries. Service tests exercise URL, method, request-body, query-string, CSRF, and error behavior without a server. Page tests mock only the page's service boundary and render real child components, so user flows contribute coverage through pages and components. Playwright remains the browser acceptance layer and is not counted in Vitest coverage.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, `@testing-library/jest-dom`, jsdom, V8 coverage, Playwright.

**Last updated:** 2026-08-04 — added mandatory model, reasoning, review, and merge routing.

---

## Baseline and diagnosis

Fresh baseline captured before this plan:

| Metric | Current | Target |
|---|---:|---:|
| Statements | 38.81% (512/1319) | 60% |
| Branches | 35.80% (343/958) | 50% |
| Functions | 38.76% (219/565) | 55% |
| Lines | 40.03% (474/1184) | 60% |

The primary gap is not missing browser scenarios. The eight Playwright specifications do not contribute to Vitest's LCOV result. In addition, `src/App.test.tsx` intentionally mocks every page, so it covers routing and the shell but none of the page implementations.

Coverage by area:

| Area | Lines | Functions | Branches |
|---|---:|---:|---:|
| App shell | 63.0% | 72.7% | 56.7% |
| Components | 59.7% | 54.8% | 44.9% |
| Pages | 21.0% | 23.4% | 18.7% |
| Services | 29.5% | 15.0% | 39.3% |

Largest uncovered files, by missed lines:

1. `src/pages/CounterOrderPage.tsx` — 147
2. `src/pages/MenuMaintenancePage.tsx` — 116
3. `src/pages/BrewQueuePage.tsx` — 71
4. `src/components/MenuItemEditor.tsx` — 56
5. `src/components/CustomizationTemplateManager.tsx` — 42
6. `src/pages/DailyActivityPage.tsx` — 26
7. `src/pages/LoyaltyPage.tsx` — 26
8. `src/components/OrderSummary.tsx` — 26
9. `src/services/apiClient.ts` — 25

## Delivery constraints

- Work in an isolated worktree on branch `codex/staff-web-coverage-improvement`.
- This is a test-backfill change. Do not change production behavior merely to make code easier to test.
- Mock network/service boundaries, not the page's child components.
- Tests must not require PostgreSQL, a running API, or external network access.
- Prefer role, accessible-name, label, and section-scoped selectors. Avoid broad duplicate text selectors.
- Do not add coverage exclusions, instrument Playwright, or lower the target thresholds.
- Do not commit generated `coverage/` output.
- A focused task can pass while the project-level target gate remains red. Only the convergence task owns the final gate.
- On Windows, if Vitest or Playwright fails with `spawn EPERM` or `CreateProcessAsUserW`, rerun the exact command with the required permission before diagnosing product code.

## Work ownership and dependency graph

Luna with maximum reasoning is the main implementer and execution coordinator. Tasks 2–8 can run independently after Task 1 and should be handed to separate agent sessions or sub-agents. Their bounded write sets and explicit acceptance checks are intentionally suitable for delegated implementation.

### Model routing and review gates

Model and reasoning assignments are requirements, not preferences. Do not silently substitute another model or lower the reasoning level. If an assigned model is unavailable, stop that task and report the routing blocker to the user.

- **Main implementer and coordinator:** Luna with `max` reasoning. Owns Task 1, the regular implementation Tasks 4 and 6, dispatch, progress tracking, and remediation returned by reviewers.
- **Complex-task implementer:** Terra with `high` reasoning. Owns Tasks 5, 7, and 8 because they contain stateful multi-component workflows and broad branch coverage.
- **Primary reviewer:** A fresh Terra session with `high` reasoning reviews every implementation commit from Tasks 2–8 and the proposed convergence diff before merge. A Terra implementer must not review its own work; dispatch a separate Terra/high reviewer session.
- **Security-related implementer:** Sol with `high` reasoning owns Tasks 2 and 3 because they cover CSRF, authentication, unsafe HTTP requests, error handling, and protected service boundaries.
- **Merger:** Sol with `high` reasoning owns Task 9, applies only changes accepted by the Terra/high primary reviewer, runs final verification, changes the threshold, and creates the convergence commit.

| Task | Role | Model | Reasoning | Primary reviewer | Exclusive write set | Depends on |
|---|---|---|---|---|---|---|
| 1 | Main implementer/coordinator | Luna | `max` | none | none | none |
| 2 | Security HTTP client implementer | Sol | `high` | Terra / `high` | `src/services/apiClient.test.ts` | 1 |
| 3 | Security service-boundary implementer | Sol | `high` | Terra / `high` | `src/services/serviceModules.test.ts` | 1 |
| 4 | Regular page implementer | Luna | `max` | Terra / `high` | three page test files | 1 |
| 5 | Complex counter-flow implementer | Terra | `high` | separate Terra / `high` | counter and order component test files | 1 |
| 6 | Regular queue-flow implementer | Luna | `max` | Terra / `high` | queue page/component test files | 1 |
| 7 | Complex menu-components implementer | Terra | `high` | separate Terra / `high` | three menu component test files | 1 |
| 8 | Complex menu-page implementer | Terra | `high` | separate Terra / `high` | `src/pages/MenuMaintenancePage.test.tsx` | 1 |
| 9 | Reviewed merger and gate owner | Sol | `high` | Terra / `high` reviews proposed diff | `vitest.config.ts`, integration fixes | 2–8 and all reviews |

Agents must not edit another task's write set. Only Task 9 may change coverage thresholds.

### Review contract

After an implementation task returns, the Luna/max coordinator sends its commit and task section to the assigned Terra/high reviewer. The reviewer checks task scope, test quality, branch coverage, production-file safety, and command evidence, then returns exactly one verdict:

```text
Task:
Reviewer model: Terra
Reasoning: high
Verdict: ACCEPT | REVISE
Blocking findings:
Non-blocking observations:
Verified command and result:
```

`REVISE` returns to the original implementer model. `ACCEPT` makes the commit eligible for Task 9. Sol/high must not merge an unreviewed or `REVISE` task.

### Required return contract for Tasks 2–8

Every implementing agent returns:

```text
Task:
Implementer model:
Reasoning:
Commit:
Files changed:
Focused command:
Focused result:
Coverage contribution:
Production files changed: none
Concerns:
```

If production code appears defective, report the suspected defect and stop before editing it. The coordinator decides whether that becomes a separately approved bug-fix task.

### Common test conventions

Use this structure for React tests:

```tsx
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
```

When a module mock must be referenced by tests, declare it with `vi.hoisted`:

```tsx
const serviceMocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
}));

vi.mock("../services/exampleApi", () => serviceMocks);
```

Run focused coverage without applying the final global thresholds:

```powershell
npm run test:coverage --workspace @coffee-shop/staff-web -- <test-file> `
  --coverage.thresholds.statements=0 `
  --coverage.thresholds.branches=0 `
  --coverage.thresholds.functions=0 `
  --coverage.thresholds.lines=0
```

---

### Task 1: Establish the isolated RED baseline

**Owner:** Main implementer and coordinator

**Assigned model:** Luna

**Reasoning:** `max`

- [ ] **Step 1: Create the isolated worktree**

Use `superpowers:using-git-worktrees` and create branch:

```text
codex/staff-web-coverage-improvement
```

- [ ] **Step 2: Confirm the existing staff test suite is green**

Run:

```powershell
npm test --workspace @coffee-shop/staff-web
```

Expected: 12 files and 54 tests pass.

- [ ] **Step 3: Confirm the proposed gate is red**

Run:

```powershell
npm run test:coverage --workspace @coffee-shop/staff-web -- `
  --coverage.thresholds.statements=60 `
  --coverage.thresholds.branches=50 `
  --coverage.thresholds.functions=55 `
  --coverage.thresholds.lines=60
```

Expected: tests pass, then Vitest exits non-zero because all four baseline metrics are below target. Record the exact metrics in the implementation log.

- [ ] **Step 4: Dispatch Tasks 2–8**

Give each worker:

1. This plan.
2. Its single task number.
3. Its exclusive write set.
4. The required return contract.
5. The exact model and reasoning assignment from the routing table.
6. An instruction to commit only its own test files.
7. An instruction that completion is provisional until a Terra/high primary reviewer returns `ACCEPT`.

Do not dispatch Task 9.

---

### Task 2: Cover the shared HTTP client

**Owner:** Security HTTP client implementer

**Assigned model:** Sol

**Reasoning:** `high`

**Primary reviewer:** Fresh Terra session with `high` reasoning

**Files:**

- Create: `apps/staff-web/src/services/apiClient.test.ts`
- Test: `apps/staff-web/src/services/apiClient.ts`

- [ ] **Step 1: Add deterministic response helpers**

Create a helper that returns a minimal `Response` and a `clientFor(fetcher)` helper using the client's injected fetcher. Do not patch global `fetch`.

- [ ] **Step 2: Write the failing behavioral tests**

Cover these cases:

1. A safe GET sends the expected URL/options and does not request a CSRF token.
2. The first unsafe request fetches the CSRF token and sends it; a second unsafe request reuses the cached token.
3. A successful `204` resolves to `undefined`.
4. A structured JSON error becomes `ApiClientError` with status, code, message, and details.
5. A non-JSON error gets the documented fallback message.
6. A failed or malformed CSRF response prevents the unsafe application request.

Run:

```powershell
npm test --workspace @coffee-shop/staff-web -- src/services/apiClient.test.ts
```

Expected before assertions are complete: RED. Expected after completing the cases: PASS.

- [ ] **Step 3: Verify focused coverage**

Run the common focused-coverage command for `src/services/apiClient.test.ts`.

Acceptance:

- `apiClient.ts` reaches at least 90% lines.
- `apiClient.ts` reaches at least 80% branches and functions.
- No production file changes.

- [ ] **Step 4: Commit**

```powershell
git add apps/staff-web/src/services/apiClient.test.ts
git commit -m "test(staff-web): cover API client behavior"
```

---

### Task 3: Cover service URL, payload, and response mapping

**Owner:** Security service-boundary implementer

**Assigned model:** Sol

**Reasoning:** `high`

**Primary reviewer:** Fresh Terra session with `high` reasoning

**Files:**

- Create: `apps/staff-web/src/services/serviceModules.test.ts`
- Test: `apps/staff-web/src/services/authApi.ts`
- Test: `apps/staff-web/src/services/fulfillmentApi.ts`
- Test: `apps/staff-web/src/services/historyApi.ts`
- Test: `apps/staff-web/src/services/loyaltyApi.ts`
- Test: `apps/staff-web/src/services/menuApi.ts`
- Test: `apps/staff-web/src/services/ordersApi.ts`
- Test: `apps/staff-web/src/services/queueApi.ts`

- [ ] **Step 1: Mock the shared client once**

Mock `apiClient.request` with `vi.hoisted`. Reset it before every test.

- [ ] **Step 2: Add table-driven tests**

Cover every exported function in these groups:

- Authentication and queue: login, logout/session lookup, queue listing, and queue actions.
- Orders and fulfillment: create order, enqueue/advance/complete, and cancellation paths exposed by the modules.
- Activity history: default query plus populated date/status/cursor query serialization.
- Menu: category/menu loading, create, update, availability changes, and deletion.
- Loyalty: customer lookup, points, history, earn/redeem, configuration, and rewards. Verify response unwrapping where the service converts an envelope to a domain value.

For each function assert:

1. HTTP method.
2. Exact route.
3. Query string when applicable.
4. Request body when applicable.
5. Returned value.

- [ ] **Step 3: Run focused tests and coverage**

```powershell
npm test --workspace @coffee-shop/staff-web -- src/services/serviceModules.test.ts
```

Then run the common focused-coverage command.

Acceptance:

- Every previously untested exported service function is called.
- Each targeted service module reaches at least 90% lines and functions.
- No production file changes.

- [ ] **Step 4: Commit**

```powershell
git add apps/staff-web/src/services/serviceModules.test.ts
git commit -m "test(staff-web): cover service request mapping"
```

---

### Task 4: Cover login, daily activity, and loyalty pages

**Owner:** Main implementer

**Assigned model:** Luna

**Reasoning:** `max`

**Primary reviewer:** Fresh Terra session with `high` reasoning

**Human-approved scope amendment (2026-08-21):** Task 4 remains a test-backfill against the current staff-web behavior. The login rejection requirement is a visible semantic error paragraph with restored form controls; live-region/alert announcement semantics are outside this task. Daily activity remains current-day history, so coverage targets the existing daily-order-number, status, and pickup-name filters; date selection and a historical-date API contract are outside this task.

**Files:**

- Create: `apps/staff-web/src/pages/LoginPage.test.tsx`
- Create: `apps/staff-web/src/pages/DailyActivityPage.test.tsx`
- Create: `apps/staff-web/src/pages/LoyaltyPage.test.tsx`

- [ ] **Step 1: Test `LoginPage`**

Mock only the auth service. Cover:

1. Rendering `Sign in for service` and submitting valid credentials.
2. Disabled/pending behavior and successful completion callback.
3. Rejected login with a visible semantic error paragraph containing the service error and restored form controls. Do not add or require production live-region/alert semantics in this test-backfill task.

- [ ] **Step 2: Test `DailyActivityPage`**

Mock only the history service. Cover:

1. Initial loading and populated history.
2. Existing current-day filters (daily order number, status, and pickup name) causing the correct reload. Do not add or require a date control or historical-date query contract in this test-backfill task.
3. Empty and rejected states, including recovery through a subsequent filter or retry action available in the UI.

- [ ] **Step 3: Test `LoyaltyPage`**

Mock only loyalty services and reuse `src/test/loyaltyTestData.ts`. Cover:

1. Initial empty state: `Select a customer to view the profile.`
2. Customer search and populated profile/points/history/rewards.
3. Empty search and service failure without stale profile data.

- [ ] **Step 4: Verify**

Run all three files in one Vitest invocation, then focused coverage.

Acceptance:

- Each page reaches at least 70% lines.
- Tests render real page children.
- Tests match the current page and service contracts; no date selector, historical-date API behavior, or production accessibility markup is required.
- No production file changes.

- [ ] **Step 5: Commit**

```powershell
git add apps/staff-web/src/pages/LoginPage.test.tsx apps/staff-web/src/pages/DailyActivityPage.test.tsx apps/staff-web/src/pages/LoyaltyPage.test.tsx
git commit -m "test(staff-web): cover staff utility pages"
```

---

### Task 5: Cover the counter-order flow and its high-value components

**Owner:** Complex counter-flow implementer

**Assigned model:** Terra

**Reasoning:** `high`

**Primary reviewer:** Separate fresh Terra session with `high` reasoning; the implementer cannot self-review

**Files:**

- Create: `apps/staff-web/src/pages/CounterOrderPage.test.tsx`
- Create: `apps/staff-web/src/components/OrderSummary.test.tsx`
- Create: `apps/staff-web/src/components/CustomizationSelector.test.tsx`

- [ ] **Step 1: Build small typed fixtures**

Include at least two categories, one unavailable item, a customizable item, and one loyalty customer. Keep fixtures local unless an existing fixture already expresses the same domain object.

- [ ] **Step 2: Test `CounterOrderPage` with real children**

Mock the menu, order, queue, and loyalty service modules only. Cover:

1. Loading, menu failure, and empty menu.
2. Category selection/filtering and unavailable-item behavior.
3. Selecting `Latte`, changing quantity, adding special instructions, and `Customize & add`.
4. Adding multiple lines, increasing/decreasing quantity, and removing a line.
5. `Create and queue order` sends the exact order payload and then queues the returned order.
6. Order/queue failure and stale or failed loyalty lookup recover without losing unrelated order state.

- [ ] **Step 3: Test `OrderSummary` directly**

Cover:

1. `Add beverages from the menu.` empty state.
2. Totals and customization labels.
3. Quantity callbacks.
4. Remove and submit-disabled/pending states.

- [ ] **Step 4: Test `CustomizationSelector` directly**

Cover required/optional groups, single/multiple choice, validation, and confirm/cancel callbacks.

- [ ] **Step 5: Verify**

Acceptance:

- `CounterOrderPage.tsx` reaches at least 65% lines.
- `OrderSummary.tsx` and `CustomizationSelector.tsx` each reach at least 80% lines.
- Assertions use section-scoped queries where labels repeat.
- No production file changes.

- [ ] **Step 6: Commit**

```powershell
git add apps/staff-web/src/pages/CounterOrderPage.test.tsx apps/staff-web/src/components/OrderSummary.test.tsx apps/staff-web/src/components/CustomizationSelector.test.tsx
git commit -m "test(staff-web): cover counter order workflow"
```

---

### Task 6: Cover the brew queue workflow

**Owner:** Main implementer

**Assigned model:** Luna

**Reasoning:** `max`

**Primary reviewer:** Fresh Terra session with `high` reasoning

**Files:**

- Create: `apps/staff-web/src/pages/BrewQueuePage.test.tsx`
- Create: `apps/staff-web/src/components/QueueWorkflowComponents.test.tsx`
- Test: `apps/staff-web/src/components/BeverageStatusControls.tsx`
- Test: `apps/staff-web/src/components/OrderCreatedBanner.tsx`
- Test: `apps/staff-web/src/components/PickupCalloutPanel.tsx`
- Test: `apps/staff-web/src/components/PickupConfirmationButton.tsx`
- Test: `apps/staff-web/src/components/QueueConflictMessage.tsx`
- Test: `apps/staff-web/src/components/QueueOrderCard.tsx`

- [ ] **Step 1: Define queue fixtures**

Create typed waiting, in-progress, and ready orders with distinguishable numbers and timestamps.

- [ ] **Step 2: Test the page**

Mock only queue services. Cover:

1. Initial loading and all three sections: `Waiting`, `In progress`, `Ready for pickup`.
2. Empty text for each section.
3. Advancing a waiting order.
4. Marking an in-progress order ready.
5. Completing a ready order.
6. Load/action failure, pending-button protection, and refreshed state after success.

- [ ] **Step 3: Test action components directly**

Exercise any queue row/card/action component branches not naturally reached by the page: status-specific controls, disabled/pending state, and order detail rendering.

- [ ] **Step 4: Verify**

Acceptance:

- `BrewQueuePage.tsx` reaches at least 75% lines.
- Status-specific action components reach at least 80% lines.
- No production file changes.

- [ ] **Step 5: Commit**

```powershell
git add apps/staff-web/src/pages/BrewQueuePage.test.tsx apps/staff-web/src/components/QueueWorkflowComponents.test.tsx
git commit -m "test(staff-web): cover brew queue workflow"
```

---

### Task 7: Cover menu editors and customization templates

**Owner:** Complex menu-components implementer

**Assigned model:** Terra

**Reasoning:** `high`

**Primary reviewer:** Separate fresh Terra session with `high` reasoning; the implementer cannot self-review

**Files:**

- Create: `apps/staff-web/src/components/MenuItemEditor.test.tsx`
- Create: `apps/staff-web/src/components/CustomizationTemplateManager.test.tsx`
- Create: `apps/staff-web/src/components/CustomizationGroupEditor.test.tsx`

- [ ] **Step 1: Test `MenuItemEditor`**

Cover create/edit initialization, field updates, category selection, numeric parsing, validation, save payload, cancel, and pending state.

- [ ] **Step 2: Test `CustomizationTemplateManager`**

Cover empty state, creating a template, editing/duplicating or deleting according to available controls, selecting a template, and persistence under:

```text
coffee-shop.customizationTemplates.v1
```

Reset `localStorage` before every test.

- [ ] **Step 3: Test `CustomizationGroupEditor`**

Cover name/type/required fields, adding/editing/removing options, validation, emitted group shape, cancel, and disabled state.

- [ ] **Step 4: Verify**

Acceptance:

- Each targeted component reaches at least 75% lines.
- Each targeted component reaches at least 65% branches.
- No production file changes.

- [ ] **Step 5: Commit**

```powershell
git add apps/staff-web/src/components/MenuItemEditor.test.tsx apps/staff-web/src/components/CustomizationTemplateManager.test.tsx apps/staff-web/src/components/CustomizationGroupEditor.test.tsx
git commit -m "test(staff-web): cover menu editor components"
```

---

### Task 8: Cover menu-maintenance page orchestration

**Owner:** Complex menu-page implementer

**Assigned model:** Terra

**Reasoning:** `high`

**Primary reviewer:** Separate fresh Terra session with `high` reasoning; the implementer cannot self-review

**Files:**

- Create: `apps/staff-web/src/pages/MenuMaintenancePage.test.tsx`

- [ ] **Step 1: Create minimal domain fixtures**

Use exact `MenuCategory`/`MenuItem` shapes. Include a category with an item and an empty category.

- [ ] **Step 2: Test the page with real editor children**

Mock only menu services. Cover:

1. Loading, populated, empty, and rejected menu states.
2. Selecting an item, editing it, and sending the exact update payload.
3. Starting a new-item draft and creating it in the selected category.
4. The no-category create error path.
5. Deleting an item with the page's confirmation behavior.
6. Switching between `Menu items` and `Customization templates`, including persisted template state.

- [ ] **Step 3: Verify**

Acceptance:

- `MenuMaintenancePage.tsx` reaches at least 70% lines.
- It reaches at least 60% branches.
- Editor children are not mocked.
- No production file changes.

- [ ] **Step 4: Commit**

```powershell
git add apps/staff-web/src/pages/MenuMaintenancePage.test.tsx
git commit -m "test(staff-web): cover menu maintenance orchestration"
```

---

### Task 9: Integrate, close residual gaps, and enable the gate

**Owner:** Merger and quality-gate owner

**Assigned model:** Sol

**Reasoning:** `high`

**Primary reviewer:** Fresh Terra session with `high` reasoning reviews the complete proposed convergence diff before the final commit

**Files:**

- Modify: `apps/staff-web/vitest.config.ts`
- Modify: test files from Tasks 2–8 only when required to close an evidenced gap

- [ ] **Step 1: Integrate worker commits**

Confirm every worker commit has a Terra/high `ACCEPT` verdict. Cherry-pick or merge accepted commits only. Resolve only test-file conflicts. If a production-file change appears, stop and return it to that task owner.

- [ ] **Step 2: Run the complete staff suite**

```powershell
npm test --workspace @coffee-shop/staff-web
```

Expected: all tests pass.

- [ ] **Step 3: Measure against the proposed target before editing config**

```powershell
npm run test:coverage --workspace @coffee-shop/staff-web -- `
  --coverage.thresholds.statements=60 `
  --coverage.thresholds.branches=50 `
  --coverage.thresholds.functions=55 `
  --coverage.thresholds.lines=60
```

Expected: PASS.

If any metric is below target:

1. Inspect `apps/staff-web/coverage/lcov-report/index.html` or `coverage/lcov.info`.
2. Rank remaining files by uncovered branches/lines.
3. Add tests to the existing owner test file.
4. Rerun the focused test, then the target command.
5. Do not lower a target and do not add an exclusion.

- [ ] **Step 4: Enable the permanent quality gate**

Change only the thresholds in `apps/staff-web/vitest.config.ts`:

```ts
thresholds: {
  statements: 60,
  branches: 50,
  functions: 55,
  lines: 60,
},
```

- [ ] **Step 5: Run final verification**

```powershell
npm run test:coverage --workspace @coffee-shop/staff-web
npm run typecheck --workspace @coffee-shop/staff-web
npm run lint
git diff --check
npm test
```

All commands must exit zero. Record final percentages and test counts from fresh output.

- [ ] **Step 6: Obtain primary review of the convergence diff**

Before committing, send the complete diff, final coverage output, verification results, and Task 9 scope to a fresh Terra/high reviewer. Do not continue until the reviewer returns `ACCEPT`. Apply any `REVISE` findings with Sol/high, rerun the affected verification, and request another fresh review verdict.

- [ ] **Step 7: Audit scope**

Confirm:

- No production `.ts`/`.tsx` file changed other than `vitest.config.ts`.
- Coverage include/exclude patterns did not change.
- Playwright configuration/specifications did not change.
- `coverage/` is not tracked.
- The final thresholds are exactly 60/50/55/60.

- [ ] **Step 8: Commit convergence**

```powershell
git add apps/staff-web/vitest.config.ts apps/staff-web/src
git status --short
git commit -m "test(staff-web): raise coverage quality gate"
```

Before committing, verify the staged `src` changes contain test files only.

## Completion report template

The coordinator hands back:

```text
Branch/worktree:
Main implementer: Luna / max
Complex implementers: Terra / high
Security implementers: Sol / high
Primary reviewer: Terra / high
Merger: Sol / high
Commits integrated:
Review verdicts:
Staff tests:
Final coverage:
  Statements:
  Branches:
  Functions:
  Lines:
Quality gate: 60 / 50 / 55 / 60
Typecheck:
Lint:
Root test suite:
git diff --check:
Production behavior changes: none
Residual risks:
```

## Done criteria

- All Tasks 1–9 are checked.
- Fresh coverage is at or above all four targets.
- The normal `test:coverage` command enforces those targets.
- Every final verification command passes.
- The implementation contains test backfill and the threshold change only.
- The completion report includes exact command evidence rather than a summary based on memory.
