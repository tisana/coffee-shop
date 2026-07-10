# Implementation Plan: Loyalty Program

**Branch**: `003-loyalty-program` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-loyalty-program/spec.md`

## Summary

Add a staff-managed loyalty program to the existing counter workflow. Staff can register and find customers by a unique E.164 phone identity normalized with the shop's configured phone region, select one customer before submitting an order, award points from the active amount- or beverage-based rule when the order completes, redeem one non-stackable free-beverage or size-upgrade reward per beverage unit during order creation, cancel an active reward independently before pickup, return points with their original expiration buckets, and enforce a configurable calendar-month expiration cutoff.

The implementation extends the current TypeScript monorepo and adds `libphonenumber-js` to the API for region-aware validation and E.164 normalization. PostgreSQL stores versioned earning and expiration policies, reward definitions, order associations, redemptions, an append-only point ledger, and point allocations. Express services perform identity, balance, redemption, earning, expiration, and standalone reward cancellation work transactionally. Shared contracts expose the loyalty state to the React staff app. The existing counter page gains a compact customer and reward section, while a new `#loyalty` page in the current staff shell provides customer history and program configuration.

## Technical Context

**Language/Version**: TypeScript on Node.js 24

**Primary Dependencies**: React 19, Vite 8, Express 5, PostgreSQL driver, Drizzle ORM, Zod, libphonenumber-js, lucide-react

**Storage**: Existing PostgreSQL database, extended with loyalty customer, configuration, reward, order-association, redemption, ledger, and allocation tables

**Testing**: TDD test pyramid with broad loyalty domain/service and React component tests; targeted migration, API contract, transaction, authorization, and order-lifecycle integration tests; focused Playwright coverage for enrollment, earning, redemption, cancellation return, and expiration

**Target Platform**: Browser-based staff web app backed by the existing Node.js service

**Project Type**: Full-stack web application in the existing API/staff-web/shared monorepo

**Performance Goals**: Preserve the specification's 45-second enrollment, 15-second lookup, 20-second redemption decision, and 2-minute configuration targets; indexed customer and balance API operations should normally complete within 500 ms at single-shop scale

**Constraints**: Authorized staff only; `SHOP_PHONE_REGION` is required for E.164 phone normalization; one customer may be selected only before order submission and the association cannot change after creation; no customer activation lifecycle; one active earning rule and expiration policy at a time; whole points only; earning posts exactly once when an associated order completes; free-beverage and size-upgrade benefit types are immutable, do not stack on one beverage unit, and use purchased snapshots for coverage; standalone reward, order, and beverage cancellation before pickup must return applicable points exactly once using original expiration dates; points remain valid through the final shop business day of their expiration month; historical rules, reward labels, costs, benefits, and expiration dates remain understandable after configuration changes; no customer self-service, marketing automation, payment integration, tiers, referrals, menu/category reward eligibility, or cross-location balances

**Scale/Scope**: One shop, thousands of loyalty customers, dozens of orders per business day, and a growing append-only point history; optimize indexed point reads and redemptions without adding a scheduler, cache, queue, or separate loyalty service

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Staff Workflow Integrity**: PASS. Loyalty selection and redemption occur inside the existing counter-order journey. Point earning is attached to the existing completion transition and does not bypass queue, brewing, completion, or pickup rules.
- **II. Daily Order Identity**: PASS. Loyalty records reference the durable order UUID while staff-facing history continues to display `businessDate + dailyOrderNumber`.
- **III. Queue State Correctness**: PASS. No new order states are introduced. Earning, redemption return, and cancellation adjustments execute in the same transactions as valid order or beverage transitions.
- **IV. Purchased Detail Preservation**: PASS. Reward redemptions snapshot the configured name, point cost, benefit, target, and covered amount. Earning uses non-cancelled purchased beverage snapshots and does not recalculate past events from mutable menu data.
- **V. Incremental, Spec-Driven Delivery**: PASS. P1 customer identity, P2 earning, P3 redemption, and P4 expiration remain independently testable story increments over shared storage and contract foundations.
- **VI. Simple, Necessary Design**: PASS with documented allocation and phone-normalization rationale. The design reuses the existing database, API, shared package, staff shell, order lifecycle, and test tools. It adds no new service, scheduler, cache, or queue; the one new runtime dependency avoids unsafe regional phone parsing.
- **VII. Test-First, Risk-Based Quality**: PASS. Tasks must place failing tests before implementation for phone uniqueness, rule calculation, ledger allocation, concurrent redemption, order completion/cancellation integration, expiration boundaries, authorization, and critical staff UI flows.
- **Product Scope and Constraints**: PASS. The feature remains staff-operated and single-location. It does not add customer applications, payment processing, delivery, or marketing workflows.

**Post-Design Constitution Check**: PASS. Research, data model, contracts, and quickstart preserve the existing staff workflow and order state machine. The point-allocation table is the only non-obvious addition and is justified below because calendar expiration and exact redemption returns cannot be represented safely by an aggregate balance alone.

## Project Structure

### Documentation (this feature)

```text
specs/003-loyalty-program/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- loyalty.openapi.yaml
`-- tasks.md                 # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
apps/
|-- api/
|   |-- package.json
|   |-- drizzle/migrations/
|   |   `-- 0003_loyalty_program.sql
|   |-- src/
|   |   |-- domain/
|   |   |   |-- loyaltyCustomerService.ts
|   |   |   |-- loyaltyConfigurationService.ts
|   |   |   |-- loyaltyLedgerService.ts
|   |   |   |-- loyaltyOrderService.ts
|   |   |   |-- orderCreationService.ts
|   |   |   |-- orderFulfillmentService.ts
|   |   |   |-- beverageService.ts
|   |   |   `-- reportingService.ts
|   |   |-- routes/
|   |   |   |-- loyaltyRoutes.ts
|   |   |   |-- orderFulfillmentRoutes.ts
|   |   |   `-- validators.ts
|   |   |-- storage/schema.ts
|   |   `-- app.ts
|   `-- tests/
|       |-- integration/loyalty.contract.test.ts
|       |-- integration/loyalty-order-lifecycle.test.ts
|       |-- integration/loyalty-redemption-concurrency.test.ts
|       `-- unit/
|           |-- loyaltyCustomerService.test.ts
|           |-- loyaltyConfigurationService.test.ts
|           `-- loyaltyLedgerService.test.ts
`-- staff-web/
    |-- src/
    |   |-- components/
    |   |   |-- LoyaltyCustomerPicker.tsx
    |   |   |-- LoyaltyCustomerProfile.tsx
    |   |   |-- LoyaltyProgramSettings.tsx
    |   |   `-- LoyaltyRewardSelector.tsx
    |   |-- pages/
    |   |   |-- CounterOrderPage.tsx
    |   |   `-- LoyaltyPage.tsx
    |   |-- services/loyaltyApi.ts
    |   |-- App.tsx
    |   `-- styles.css
    `-- tests/e2e/loyalty-program.spec.ts

packages/shared/src/
|-- contracts/api.ts
`-- domain/types.ts
```

**Structure Decision**: Extend the existing API/staff-web/shared workspaces. Customer and program management live behind one protected loyalty route group, while standalone reward cancellation follows the existing protected order-fulfillment route boundary. Ledger calculations remain in API domain services so balances and order effects have one authoritative implementation. The counter page reuses the order-creation transaction for immutable customer association and redemption, and `LoyaltyPage` is added to the existing sidebar shell for profile/history/configuration work. Shared request and response types remain in `packages/shared`.

## Complexity Tracking

| Violation                                                   | Why Needed                                                                                                                                                                                                                  | Simpler Alternative Rejected Because                                                                                                                                     |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add a point-allocation table alongside the immutable ledger | Redemption must consume the earliest-expiring credits, expiration must remove only unspent points, and cancellation must return points with their original cutoff. Allocations provide that trace without mutating history. | A single aggregate balance cannot prove which earning batch was redeemed or expired and would either extend returned-point lifetime or make calendar cutoffs inaccurate. |
| Add `libphonenumber-js` to the API                          | Equivalent local, international, and international-dial-prefix values must normalize to one valid E.164 identity using a configured shop region.                                                                            | Ad hoc regional parsing is error-prone, while punctuation-only normalization does not satisfy identity equivalence.                                                      |
| Extend report calculations with active reward coverage      | Free-beverage and size-upgrade rewards reduce the amount actually attributable to an order and must not generate points or sales as if fully paid.                                                                          | Leaving reports and earning based on gross beverage snapshots would overstate sales and award points on the rewarded benefit.                                            |
