# Quickstart: Loyalty Program

This guide validates the loyalty program end to end after implementation.

## Prerequisites

- Node.js 24 and npm 10 or newer
- Docker available for local PostgreSQL
- Repository root: `D:\dev\workspaces\coffee-shop`
- `SHOP_TIME_ZONE` set to the shop's operating time zone when it is not UTC

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

1. Register a customer with a name and formatted phone such as `+66 81-234-5678`; leave email empty.
2. Search using the same digits without punctuation and confirm the customer appears within 15 seconds.
3. Attempt to register another customer with the same digits in a different display format.
4. Edit the original customer to a new unused phone and optional email.
5. Attempt to change the phone to one already used by another customer.

Expected outcomes:

- Registration completes within 45 seconds without email.
- Formatting differences do not create a duplicate normalized phone.
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
3. Confirm the order summary shows the reward, point cost, gross total, reward coverage, and payable total.
4. Create and queue the order.
5. Confirm the customer's available balance decreases by 10 points and the redemption appears in history.
6. Cancel the reward-targeted beverage or fully cancel the order before pickup.

Expected outcomes:

- Redemption is blocked when the latest balance has fewer than 10 available points.
- Two concurrent redemptions cannot spend the same points.
- Earliest-expiring credits are consumed first.
- Cancellation returns the consumed points once with their original expiration cutoff.
- Returned rewards no longer reduce the order's active payable amount or sales value.

Repeat with the 5-point size-upgrade reward on a selected positive-price size customization. Confirm the reward covers only that selected adjustment and the beverage remains eligible for beverage-count earning.

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
npm run test --workspace @coffee-shop/api -- loyalty.contract.test.ts
npm run test --workspace @coffee-shop/api -- loyalty-order-lifecycle.test.ts
npm run test --workspace @coffee-shop/api -- loyalty-redemption-concurrency.test.ts
```

The tests must cover:

- normalized-phone uniqueness on create and update, including a database race
- rule versioning and amount/beverage calculations
- calendar-month cutoff calculations in the shop time zone
- earliest-expiring allocation, insufficient points, return, and expiration
- idempotent earning, reversal, redemption return, and expiration
- full and beverage-level cancellation integration
- staff authorization and request validation for every loyalty endpoint
- reward coverage in payable totals, earning basis, and sales reports

## Staff Web Checks

```powershell
npm run test --workspace @coffee-shop/staff-web
npm run test:e2e --workspace @coffee-shop/staff-web -- loyalty-program.spec.ts
```

The UI checks must confirm:

- `#loyalty` opens inside the existing sidebar/topbar shell
- customer registration, search, duplicate errors, editing, totals, and history states
- earning, reward, and expiration configuration controls
- counter customer selection and clearing
- reward availability based on the latest balance and valid beverage target
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
