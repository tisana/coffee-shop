# Research: Loyalty Program

## Decision: Extend the existing staff order workflow and shell

**Rationale**: `CounterOrderPage` already owns draft beverages and creates and queues an order. Loyalty customer selection and reward redemption belong in that flow before submission. Customer history and program configuration need more room, so the existing sidebar gains one `#loyalty` item and a compact `LoyaltyPage`; no second application or alternate order flow is needed.

**Alternatives considered**:

- Build a separate loyalty application. Rejected because it would duplicate authorization, navigation, API access, and order selection.
- Put every loyalty control on the counter page. Rejected because configuration and full point history would make the service-time order surface too dense.
- Hide loyalty under Reports or Menu. Rejected because customer accounts and program rules are operational records, not reporting or menu maintenance.

## Decision: Normalize phone identity to E.164 with a configured shop region

**Rationale**: Require `SHOP_PHONE_REGION` and use `libphonenumber-js` in the API to validate local, international, and international-dial-prefix input and normalize it to E.164. Store the staff-entered phone for display and the E.164 value for lookup and uniqueness. The API uses one normalizer for create, update, and search, while a database unique index closes concurrency races. This makes values such as a valid local number, its `+` country-code form, and its `00` dialing form one customer identity without hard-coding regional numbering rules.

**Alternatives considered**:

- Enforce uniqueness on the display string. Rejected because spaces, parentheses, dashes, and plus signs would bypass uniqueness.
- Rely only on an API pre-check. Rejected because concurrent requests can both pass before either insert commits.
- Strip punctuation or implement regional prefix rules manually. Rejected because punctuation-only normalization misses equivalent national/international forms and custom phone parsing is error-prone.
- Infer the region from the server or user locale. Rejected because deployment locale is not a reliable shop identity rule; the shop must configure it explicitly.

## Decision: Create the customer association only with a new order

**Rationale**: Staff select at most one registered customer while composing a counter order. The association is inserted atomically with order creation and remains immutable afterward. This matches the current create-and-queue counter flow, gives earning and redemption one stable customer boundary, and avoids post-creation reassignment of already-earned or redeemed events.

**Alternatives considered**:

- Attach or replace a customer until completion. Rejected for this increment because it introduces reassignment, audit, stale-balance, and reward-ownership rules beyond the requested counter flow.
- Add a customer after completion. Rejected because it could retroactively change earning eligibility and applied rule timing.

## Decision: Version earning and expiration configuration

**Rationale**: Updating a rule creates a new active row and retires the previous row in one transaction. Earning ledger entries reference the exact earning rule and expiration policy used when points post. This preserves understandable history and keeps policy changes prospective.

Amount rules store a positive monetary threshold and positive whole points. Beverage rules store a positive beverage-count threshold and positive whole points. One active rule is enforced by a partial unique index. Expiration policies are either disabled or contain a positive number of calendar months; one active policy is enforced the same way.

**Alternatives considered**:

- Mutate one configuration row in place. Rejected because historical point events would no longer explain which rule applied.
- Copy only human-readable rule text into the ledger. Rejected because structured version references are easier to validate and report while snapshots can still provide readable history.
- Support overlapping campaigns. Rejected because the specification explicitly assumes one active earning rule and one active expiration policy.

## Decision: Use an append-only point ledger plus explicit allocations

**Rationale**: Every balance change is an immutable signed event: earned, redeemed, returned, expired, or adjusted. A point allocation maps each negative event to the positive credit entries it consumes. Redemptions allocate credits by earliest expiration date, then oldest event, which minimizes avoidable customer loss. A returned credit retains the expiration date of the points consumed by the original redemption.

This model supports exact available, redeemed, returned, expired, adjusted, and lifetime totals without storing a mutable customer balance. PostgreSQL transactions lock the customer row while redeeming, expiring, returning, or posting order effects, and unique source indexes make completion and cancellation handling idempotent.

**Alternatives considered**:

- Store only a mutable balance. Rejected because it cannot explain history or enforce expiration by earning month.
- Store ledger events without allocations. Rejected because the system could not determine which expiration bucket a redemption consumed or restore the original cutoff on cancellation.
- Create a separate loyalty service or event broker. Rejected because the current single-shop scale and existing transactional API do not justify another deployable component.

## Decision: Materialize expiration lazily at loyalty boundaries

**Rationale**: The app has no background scheduler and does not need one for a single shop. Before returning a customer point summary/history or attempting redemption, the ledger service finds unspent positive credits whose `expirationBusinessDate` is earlier than the current shop business date, appends idempotent expired events, and allocates them to those credits in the same transaction. Points remain available while the current business date equals the cutoff and expire only on the next business date.

**Alternatives considered**:

- Add a nightly scheduler. Rejected because it introduces deployment and recovery behavior solely to update balances that are only needed when a loyalty account is used.
- Treat expiration only as a computed display value. Rejected because the specification requires expired point changes to remain visible in history.
- Expire at a UTC timestamp. Rejected because the clarified policy is based on the shop's final business day, not server time.

## Decision: Post earning at order completion and reverse it on later cancellation

**Rationale**: The specification's earning scenario awards points when an eligible order completes, while the existing state machine still permits cancellation from `completed` before pickup. `completeOrder` therefore posts earning in the same transaction as the successful status transition. A later full cancellation appends an adjusted reversal of the earned points and returns any active redemption points. Unique order-source constraints prevent duplicate earning or reversal.

Cancelled beverages are excluded when the earning basis is calculated. If a reward-targeted beverage is cancelled before completion, that redemption is returned immediately so the customer does not lose points for an undelivered benefit. Staff may also cancel only an active reward before pickup without cancelling its beverage or order; the same return service removes coverage and restores the original expiration buckets exactly once.

**Alternatives considered**:

- Award at order creation. Rejected because beverages and whole orders may still be cancelled.
- Award only at pickup. Rejected because it conflicts with the specified completed-order earning behavior.
- Recalculate and overwrite the original earned entry. Rejected because ledger history must remain immutable and explain cancellations.

## Decision: Apply rewards atomically during order creation

**Rationale**: Extend `CreateOrderRequest` with an optional loyalty customer and reward selections. Each selection names a reward option and target draft beverage index; size-upgrade rewards also name the selected customization choice being covered. The order service validates the customer, active reward, target, one-reward-per-unit rule, and balance, then inserts the order, beverage snapshots, customer association, redemption snapshots, ledger debits, and allocations in one transaction. A failed redemption therefore cannot leave a partially created order.

The first increment supports exactly two immutable benefit types. A free-beverage reward covers one complete unit of the target beverage, including selected customizations. A size-upgrade reward covers one selected positive-price size adjustment and leaves the beverage eligible for beverage-count earning. Rewards do not stack on one beverage unit. Each redemption snapshots the reward label, point cost, benefit type, target description, and covered amount so later menu or reward edits do not alter the order. Changing benefit type requires retiring the option and creating another.

**Alternatives considered**:

- Redeem after the order has already queued. Rejected because failure would require staff to unwind an accepted order and the benefit might not be visible to brewing staff.
- Store only a textual reward note. Rejected because earning and sales calculations need the covered amount and target.
- Stack multiple rewards on one beverage unit. Rejected because overlapping monetary coverage and point-return ordering add ambiguity without a current business requirement.
- Add a generalized discount engine. Rejected because the current scope contains only two loyalty benefit types and excludes unrelated discounts and coupons.

## Decision: Cancel active rewards through the order-fulfillment boundary

**Rationale**: Add `POST /orders/:orderId/loyalty-rewards/:redemptionId/cancel` under the existing protected order-fulfillment route. Before pickup, it locks the customer and order, validates that the active redemption belongs to that order, marks it returned, removes its active monetary coverage, appends returned credits with the original expiration dates, and returns the updated order. Repeated cancellation is rejected or returns the already-current state without issuing points twice.

**Alternatives considered**:

- Require cancelling the beverage or entire order. Rejected because FR-015 explicitly allows the reward benefit itself to be cancelled.
- Delete the redemption and debit rows. Rejected because immutable history must explain both redemption and return.

## Decision: Preserve gross order value and store loyalty coverage separately

**Rationale**: Keep the existing `orders.total` as the captured gross beverage value and add `loyaltyRewardDiscountTotal`. API responses expose the payable total as gross minus active loyalty coverage. Amount-based earning subtracts active reward coverage, and beverage-based earning subtracts complimentary free-beverage units while retaining a beverage that only received a size upgrade.

Sales reporting must subtract active reward coverage from the affected item and order totals. This prevents free benefits from inflating revenue while preserving purchased menu snapshots and existing gross captured totals.

**Alternatives considered**:

- Rewrite `orders.total` as the net value. Rejected because existing orders and reports use it as the captured creation-time total.
- Ignore loyalty rewards in reports. Rejected because sales and average order value would be overstated.
- Build payment processing. Rejected because payment collection remains outside this feature.

## Decision: Keep all loyalty endpoints staff-authorized and use existing contract patterns

**Rationale**: A protected `/loyalty` route group uses `requireStaff`, existing CSRF handling, Zod validation, shared TypeScript contracts, and standard API errors. Customer CRUD/search, point summary/history, active configuration, and reward option endpoints follow current route/service boundaries. Order creation remains the command for association and redemption.

**Alternatives considered**:

- Add customer-facing authentication. Rejected because customer self-service is explicitly out of scope.
- Let the browser calculate balances or points. Rejected because concurrent orders and configuration changes require one authoritative transaction boundary.
