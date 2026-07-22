# Quickstart: Loyalty Program

This guide validates the loyalty program end to end after implementation.

## Prerequisites

- Node.js 24 and npm 10 or newer
- Docker available for local PostgreSQL
- Repository root: `D:\dev\workspaces\coffee-shop`
- `SHOP_TIME_ZONE` set to the shop's operating time zone when it is not UTC
- `SHOP_PHONE_REGION` set to the shop's ISO 3166-1 alpha-2 phone region, such as `TH`

## Local Setup

```powershell
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

The API runs at `http://localhost:3000` and staff web at `http://localhost:5173`. Sign in with a configured authorized staff account.

## Program Configuration

1. Open the `Loyalty` sidebar item at `/#loyalty`.
2. Configure amount earning as `10.00 purchase amount -> 1 point`.
3. Configure expiration as enabled with `3 calendar months`.
4. Create these active rewards:
   - `Free beverage`, 10 points, free-beverage benefit
   - `Size upgrade`, 5 points, size-upgrade benefit
5. Confirm each update completes within two minutes and the active rule/policy is clearly shown.

Expected outcomes:

- Only one earning rule and expiration policy are active.
- Replacing either configuration creates a new effective version without changing historical entries.
- Retiring a reward removes it from new order redemption while past redemptions retain its snapshot.

## Customer Identity

1. With `SHOP_PHONE_REGION=TH`, register a customer with a name and a valid local phone such as `081-234-5678`; leave email empty.
2. Search using the equivalent `+66 81-234-5678` international form and confirm the customer appears within 15 seconds.
3. Attempt to register another customer using the equivalent `0066 81-234-5678` international-dial-prefix form.
4. Edit the original customer to a new unused phone and `Ada@Example.com` email.
5. Attempt to register a second customer with a different phone and ` ada@example.com ` as the email.
6. Attempt to change the original phone to one already used by another customer.
7. Attempt registration with an invalid phone for the configured region.
8. Attempt registration and an edit with `not-an-email` as the non-empty email value.

Expected outcomes:

- Registration completes within 45 seconds without email.
- Equivalent local, international, and international-dial-prefix forms normalize to one E.164 identity and cannot create duplicates.
- A supplied email is trimmed, case-insensitively unique, and returns an email-specific conflict when another customer uses the same address.
- Invalid phone input is rejected before uniqueness is evaluated.
- A malformed non-empty email is rejected before email uniqueness is evaluated; an invalid-email edit preserves the stored customer data.
- Duplicate create and update attempts return a clear conflict and preserve existing data.
- The original account ID and point history survive profile edits.

## Amount-Based Earning

1. From `Counter Order`, find and select the loyalty customer.
2. Create and queue an order with an eligible gross value of `25.00` and no reward.
3. Complete all beverages and complete the order.
4. Open the customer profile.

Expected outcomes:

- The order shows the selected loyalty customer.
- Completion posts exactly 2 earned points once.
- The history identifies the order by business date and daily order number, the amount rule version, and the expiration date.
- Repeating or racing completion cannot post points twice.

## Beverage-Based Earning and Cancellation

1. Replace the active earning rule with `1 beverage -> 1 point`.
2. Create a loyalty order with three beverage units.
3. Cancel one beverage before completing the remaining beverages and order.
4. Fully cancel a separate associated order.

Expected outcomes:

- The partially cancelled order earns 2 points.
- The fully cancelled order earns no points.
- If an already completed associated order is cancelled before pickup, its earned points receive one visible adjusted reversal.
- Existing entries from the previous amount rule keep their original values and labels.

## Reward Redemption and Return

Use a seeded/test customer with enough unexpired points for this flow.

1. Select the customer on `Counter Order` and add a beverage.
2. Apply the 10-point free-beverage reward to one beverage unit.
3. Confirm the reward covers that complete unit including selected customizations and the order summary shows the reward, point cost, gross total, reward coverage, and payable total.
4. Create and queue the order.
5. Confirm the customer's available balance decreases by 10 points and the redemption appears in history.
6. Cancel only the reward before pickup and confirm the beverage and order remain active.
7. On separate orders, cancel the reward-targeted beverage and fully cancel the order before pickup.

Expected outcomes:

- Redemption is blocked when the latest balance has fewer than 10 available points.
- Two concurrent redemptions cannot spend the same points.
- Earliest-expiring credits are consumed first.
- A second reward cannot be stacked on the same beverage unit.
- Standalone reward, target-beverage, and full-order cancellation each return consumed points once with their original expiration cutoff.
- Returned rewards no longer reduce the order's active payable amount or sales value.

Repeat with the 5-point size-upgrade reward on a selected positive-price size customization. Confirm the reward covers only that selected adjustment, the beverage remains eligible for beverage-count earning, and changing the option's benefit type requires retirement and replacement.

## Calendar-Month Expiration

Use a controllable clock or database fixture to create credits earned in July under a 3-month policy.

1. Read the balance on October 31 in the configured shop time zone.
2. Attempt a valid redemption on October 31.
3. Read the balance on November 1.

Expected outcomes:

- July points remain available through October 31's shop business day.
- On November 1, remaining July points are excluded from available balance and one expired history event accounts for the unspent amount.
- Repeated reads do not create duplicate expiration entries.
- Credits earned after the policy is changed retain the policy version and cutoff assigned at earning time.

## API and Domain Checks

Write failing tests first, then implement and run the focused suites:

```powershell
npm run test --workspace @coffee-shop/api -- loyaltyCustomerService.test.ts
npm run test --workspace @coffee-shop/api -- loyaltyConfigurationService.test.ts
npm run test --workspace @coffee-shop/api -- loyaltyLedgerService.test.ts
npm run test --workspace @coffee-shop/api -- loyalty.customer.contract.test.ts
npm run test --workspace @coffee-shop/api -- loyalty-order-lifecycle.test.ts
npm run test --workspace @coffee-shop/api -- loyalty-redemption-concurrency.test.ts
```

The tests must cover:

- E.164 phone validation and local/international equivalence using `SHOP_PHONE_REGION`, plus supplied-email trimming, format validation before uniqueness, case-insensitive uniqueness, field-specific conflict responses, and database uniqueness races
- rule versioning and amount/beverage calculations
- calendar-month cutoff calculations in the shop time zone
- earliest-expiring allocation, insufficient points, standalone reward return, beverage/order return, and expiration
- idempotent earning, reversal, redemption return, and expiration
- full and beverage-level cancellation integration
- staff authorization and request validation for every loyalty endpoint
- non-stackable free-beverage and size-upgrade coverage in payable totals, earning basis, and sales reports

## Staff Web Checks

```powershell
npm run test --workspace @coffee-shop/staff-web
npm run test:e2e --workspace @coffee-shop/staff-web -- loyalty-program.spec.ts
```

The UI checks must confirm:

- `#loyalty` opens inside the existing sidebar/topbar shell
- customer registration, search, email format and field-specific phone/email duplicate errors, editing, totals, and history states
- earning, reward, and expiration configuration controls
- counter customer selection and clearing
- reward availability based on the latest balance and valid beverage target
- standalone reward cancellation before pickup without cancelling the beverage or order
- gross, covered, and payable values remain readable in the order summary
- loading, empty, validation, conflict, and stale-balance states do not overlap or shift core controls
- timed enrollment, lookup, configuration, and redemption goals from the specification

## Full Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e --workspace @coffee-shop/staff-web -- loyalty-program.spec.ts
git diff --check
```

Review the implementation against [data-model.md](./data-model.md) and [contracts/loyalty.openapi.yaml](./contracts/loyalty.openapi.yaml) before marking the feature complete.

## Phase 3 Verification Evidence

On 2026-07-13, the US1 focused checks passed:

```powershell
npm run test --workspace @coffee-shop/api -- loyaltyCustomerService.test.ts loyalty.customer.contract.test.ts
npm run test --workspace @coffee-shop/staff-web -- LoyaltyCustomerComponents.test.tsx App.test.tsx
npm run test:e2e --workspace @coffee-shop/staff-web -- loyalty-program.spec.ts
```

The API tests verify that `081-234-5678`, `+66 81-234-5678`, and `0066 81-234-5678` normalize to the same E.164 identity and that the duplicate form is rejected. The Playwright registration, international lookup, duplicate, invalid-phone, and edit flow completed in 1.6 seconds, below both the 45-second registration target and the 15-second lookup target. This evidence predates the email-uniqueness clarification and does not replace the required case-insensitive email create, edit, and migration-collision checks above.

On 2026-07-14, the email identity follow-up checks passed after applying `0004_loyalty_customer_email_identity`:

```powershell
npm run db:migrate
npm run test --workspace @coffee-shop/api -- loyaltyCustomerService.test.ts loyalty.customer.contract.test.ts loyalty-schema.test.ts
npm run test --workspace @coffee-shop/staff-web -- LoyaltyCustomerComponents.test.tsx
npm run test:e2e --workspace @coffee-shop/staff-web -- loyalty-program.spec.ts
npm run typecheck
npm run lint
git diff --check
```

The API suite passed 12 tests, covering malformed-email `400` validation before conflicts; trim-preserved casing; named phone/email `409` responses; same-customer email updates; unchanged records after rejected updates; whitespace cleanup; blank-to-null conversion; collision preflight; and case-insensitive uniqueness races. The component suite passed 6 tests and retained rejected registration/profile values. The focused Playwright journey passed in 1.5 seconds and confirmed duplicate-email create/edit feedback plus native malformed-email rejection without leaving the existing staff shell.

## Phase 4 Verification Evidence

On 2026-07-17, the earning and order-association checks passed:

```powershell
npm run test --workspace @coffee-shop/api -- loyalty.customer.contract.test.ts loyaltyConfigurationService.test.ts loyaltyLedgerService.test.ts loyalty-order-lifecycle.test.ts
npm run test --workspace @coffee-shop/staff-web -- LoyaltyEarningComponents.test.tsx LoyaltyCustomerComponents.test.tsx
npm run test:e2e --workspace @coffee-shop/staff-web -- loyalty-program.spec.ts
npm test
npm run lint
npm run typecheck
npm run build
git diff --check
```

The focused API suite passed 9 tests: earning-rule version replacement, whole-point amount and beverage calculations, no carryover, create-time association, completed-order idempotency, partial beverage cancellation, completed-order reversal, point totals, history labels, and protected rule/point endpoints. The staff component suite passed 8 tests and the browser suite passed 2 tests for rule configuration and point history. The complete workspace suite passed 114 tests across 36 files before the final import-only cleanup; the final focused checks, lint, typecheck, build, and diff validation then passed.

## Phase 5 Verification Evidence

On 2026-07-17, the implemented reward path was verified with:

```powershell
npm run test --workspace @coffee-shop/api -- tests/unit/loyaltyConfigurationService.test.ts tests/unit/loyaltyLedgerService.test.ts tests/unit/reportingService.test.ts tests/integration/loyalty-order-lifecycle.test.ts
npm run test --workspace @coffee-shop/staff-web -- src/components/LoyaltyEarningComponents.test.tsx
npm run typecheck
npm run lint
npm run build
git diff --check
```

The focused API suite covered reward creation, earliest-expiring allocation, original-expiration returns, free-beverage creation-time coverage, point debits, standalone/order cancellation returns, and net report line calculations. The counter fetches the current balance and reward list, serializes reward selections, shows the payable total after redemption, and offers pre-pickup reward cancellation. The remaining unchecked US3 tasks retain the required concurrency, contract, detailed component, and Playwright coverage for a subsequent verification pass.

### Phase 5 Completion Evidence (2026-07-18)

```powershell
npm run test --workspace @coffee-shop/api -- tests/unit/loyaltyConfigurationService.test.ts tests/unit/loyaltyLedgerService.test.ts tests/unit/reportingService.test.ts tests/unit/app.test.ts tests/integration/loyalty-redemption-concurrency.test.ts tests/integration/loyalty.customer.contract.test.ts tests/integration/loyalty-order-lifecycle.test.ts tests/integration/order-history.contract.test.ts tests/integration/reports.contract.test.ts
npm run test --workspace @coffee-shop/staff-web -- src/components/LoyaltyRewardComponents.test.tsx
npm run test:e2e --workspace @coffee-shop/staff-web -- loyalty-program.spec.ts
npm run typecheck
npm run lint
npm run build
git diff --check
```

Evidence covers immutable reward benefits with editable metadata, active-list retirement, earliest-expiring allocation and insufficient balances, simultaneous redemption protection, order-time reward selection and duplicate cancellation conflicts, complete-unit and selected-adjustment coverage, non-stacking, standalone/target/full-order returns, loyalty-aware history and report values, per-unit staff selection, reward display and cancellation, and the staff configuration browser flow.

## Phase 6 Verification Evidence

On 2026-07-18, the calendar-month expiration implementation was verified with:

```powershell
npm test --workspace @coffee-shop/api -- loyaltyConfigurationService.test.ts loyaltyLedgerService.test.ts loyalty.customer.contract.test.ts loyalty-order-lifecycle.test.ts
npm test --workspace @coffee-shop/staff-web -- LoyaltyEarningComponents.test.tsx LoyaltyExpirationComponents.test.tsx
npm run test:e2e --workspace @coffee-shop/staff-web -- loyalty-program.spec.ts
npm run typecheck
npm run lint
npm run build
git diff --check
```

The focused API suite passed 23 tests. It verifies enabled and disabled policy versioning, month validation, July-to-October and year-rollover cutoffs, shop business-date resolution, policy assignment to earned credits, lazy expiration of only unspent points after the final cutoff day, idempotent repeated refreshes, blocked redemption after expiration, and immediate re-expiry of returned points that retain an elapsed original cutoff. The component suite passed 4 tests for the staff controls, cutoff explanation, expired total, and dated history. The four-flow Playwright suite passed, including the staff expiration configuration and visible expiration-date history. Typecheck, lint, build, and diff validation passed; the production staff build reported the existing non-fatal Vite chunk-size warning.

## Phase 7 and Convergence Verification Evidence

On 2026-07-22, the final cross-cutting and convergence checks passed against a migrated PostgreSQL 17 fixture:

```powershell
npm test --workspace @coffee-shop/api -- auth-security.test.ts loyalty-performance.test.ts loyalty.customer.contract.test.ts
npm test
npm run test:e2e --workspace @coffee-shop/staff-web -- loyalty-program.spec.ts
npm run typecheck
npm run lint
npm run build
python -c 'import yaml; d=yaml.safe_load(open(r"specs/003-loyalty-program/contracts/loyalty.openapi.yaml", encoding="utf-8")); print("paths=%d,schemas=%d" % (len(d["paths"]), len(d["components"]["schemas"])))'
git diff --check
```

The focused API release suite passed 3 files and 12 tests. It covers every loyalty read and mutation without staff authorization, every mutation without a valid CSRF token, active-only reward listing with explicit inactive inclusion, reward snapshot and associated-order point history after reward configuration changes, and 2,000-customer/1,000-entry lookup, balance, history, and redemption fixtures with each measured API operation asserted below 500 ms.

The complete workspace suite passed 40 files and 150 tests: API 27 files/94 tests, staff web 12 files/54 tests, and shared 1 file/2 tests. The staff component coverage includes keyboard focus, labels, loading and empty shell states, mobile shell structure, exact unavailable reward explanations, earning eligibility explanations, historical reward readability, active-only standalone cancellation, and returned reward labels across created, queue, and history surfaces.

The final loyalty Playwright suite passed 9 flows in 26.6 seconds. The individual observed flows completed well inside the specification targets: registration/lookup/edit in 3.2 seconds, reward configuration in 1.8 seconds, expiration configuration in 1.8 seconds, amount plus beverage earning with partial cancellation in 4.2 seconds, redemption plus standalone and target cancellation in 3.6 seconds, stale-balance refresh in 1.4 seconds, and mobile focus/overflow checks in under 1 second. The flows verify non-stackable redemption decisions, exact point returns, October 31 availability, November 1 lazy expiration, blocked post-cutoff redemption, retained expired history, and no document-level horizontal overflow at a 390 by 844 viewport.

OpenAPI reconciliation added the implemented phone-region read, CSRF `403` mutation responses, exact rule/policy nullability, complete order and beverage response fields, and active/inactive reward list semantics. The parsed contract contains 10 paths and 24 schemas. Typecheck and lint completed without errors. The production build completed with the existing non-fatal staff bundle warning for a chunk larger than 500 kB.
