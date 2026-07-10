# Data Model: Loyalty Program

## Loyalty Customer

Represents one customer identity enrolled by staff.

**Fields**

- `id`: UUID primary key
- `name`: required display name, 1-120 characters
- `phoneDisplay`: required staff-entered phone, 1-40 characters
- `phoneNormalized`: required digits-only canonical phone
- `email`: optional trimmed email, maximum 254 characters
- `status`: `active` or `inactive`
- `enrolledAt`, `updatedAt`: timestamps

**Relationships**

- Has many loyalty order associations.
- Has many point ledger entries and reward redemptions.

**Rules**

- `phoneNormalized` is unique at the database level.
- Create, update, and phone search use the same normalizer.
- Editing name, phone, or email never changes `id` or historical relationships.
- Inactive customers remain searchable for history but cannot be attached to a new order.

## Earning Rule

Represents one version of the program's point earning configuration.

**Fields**

- `id`: UUID primary key
- `earningType`: `purchase_amount` or `beverage_count`
- `amountThreshold`: positive money when type is `purchase_amount`; otherwise null
- `beverageCountThreshold`: positive integer when type is `beverage_count`; otherwise null
- `pointsAwarded`: positive integer
- `active`: boolean
- `effectiveAt`, `retiredAt`: timestamps
- `createdByStaffId`: staff user reference

**Relationships**

- Referenced by earned ledger entries created under this version.

**Rules**

- Exactly one threshold field is populated according to `earningType`.
- At most one row is active.
- Updating configuration retires the active row and inserts a new version transactionally.
- Amount earning is `floor(eligibleAmount / amountThreshold) * pointsAwarded`.
- Beverage earning is `floor(eligibleBeverageCount / beverageCountThreshold) * pointsAwarded`.
- No partial progress carries to another order.

## Expiration Policy

Represents one version of the point expiration configuration.

**Fields**

- `id`: UUID primary key
- `enabled`: boolean
- `expirationMonths`: positive integer when enabled; otherwise null
- `active`: boolean
- `effectiveAt`, `retiredAt`: timestamps
- `createdByStaffId`: staff user reference

**Relationships**

- Referenced by positive point entries created under this version.

**Rules**

- At most one row is active.
- Updating configuration retires the active row and inserts a new version transactionally.
- A disabled policy produces no expiration date.
- With `N` months configured, points earned in month `M` expire after the final shop business day of month `M + N`.
- Example: points earned on any July date with `N = 3` have `expirationBusinessDate = October 31`, remain usable on October 31, and expire when the shop business date becomes November 1.
- Later policy changes do not alter existing entry expiration dates.

## Reward Option

Represents a staff-configured reward available for redemption.

**Fields**

- `id`: UUID primary key
- `name`: required label, 1-120 characters
- `pointsCost`: positive integer
- `benefitType`: `free_beverage` or `size_upgrade`
- `benefitDescription`: required staff-facing description, maximum 500 characters
- `active`: boolean
- `effectiveAt`, `updatedAt`: timestamps
- `createdByStaffId`, `updatedByStaffId`: staff references

**Relationships**

- Has many reward redemptions.

**Rules**

- Retired options cannot be newly redeemed.
- Editing or retiring an option does not change redemption snapshots.
- A free beverage covers one unit of one target order beverage.
- A size upgrade covers one selected positive customization price adjustment on the target beverage.

## Loyalty Order Association

Connects at most one loyalty customer to one shop order.

**Fields**

- `orderId`: order UUID and primary key
- `customerId`: loyalty customer reference
- `associatedByStaffId`: staff user reference
- `associatedAt`: timestamp

**Relationships**

- Belongs to one order and one loyalty customer.
- The order may have reward redemptions and earned/adjustment ledger entries.

**Rules**

- One order can have zero or one loyalty customer.
- The association is created atomically with the order in this increment.
- Order history displays the existing `businessDate + dailyOrderNumber` identity.

## Reward Redemption

Snapshots a configured benefit applied to an order.

**Fields**

- `id`: UUID primary key
- `orderId`, `customerId`, `rewardOptionId`: references
- `targetOrderBeverageId`: required target beverage reference
- `targetCustomizationChoiceId`: required only for `size_upgrade`
- `rewardNameSnapshot`: configured name at redemption
- `pointsCostSnapshot`: positive integer
- `benefitTypeSnapshot`: `free_beverage` or `size_upgrade`
- `benefitDescriptionSnapshot`: configured description at redemption
- `targetDescriptionSnapshot`: purchased beverage or upgrade description
- `coveredAmountSnapshot`: non-negative money excluded from payable and eligible purchase amount
- `coveredBeverageQuantity`: `1` for free beverage, `0` for size upgrade
- `status`: `active` or `returned`
- `redeemedAt`, `returnedAt`: timestamps
- `returnedReason`: nullable text
- `redeemedByStaffId`, `returnedByStaffId`: staff references; system lifecycle changes may reuse the acting order staff identity

**Relationships**

- Has one redeemed ledger debit.
- A returned redemption creates one or more returned point credits preserving original expiration dates.

**Rules**

- The customer must match the order association.
- The reward option must be active when redemption occurs.
- The target beverage must be part of the same order and not cancelled.
- The covered amount is computed from the purchased snapshot, not later menu values.
- Cancelling the target beverage or order changes an active redemption to returned exactly once and appends returned point events.

## Point Ledger Entry

Represents one immutable signed point event.

**Fields**

- `id`: UUID primary key
- `customerId`: loyalty customer reference
- `eventType`: `earned`, `redeemed`, `returned`, `expired`, or `adjusted`
- `pointsDelta`: non-zero signed integer
- `orderId`: optional order reference
- `rewardRedemptionId`: optional redemption reference
- `earningRuleId`: optional earning rule reference
- `expirationPolicyId`: optional expiration policy reference
- `earnedBusinessDate`: shop business date for positive credits
- `expirationBusinessDate`: nullable cutoff copied onto positive credits
- `reason`: required readable explanation
- `createdByStaffId`: nullable staff reference for system-generated expiration
- `occurredAt`: timestamp

**Relationships**

- Positive entries are consumed by point allocations.
- Negative entries own one or more allocations to positive entries.

**Rules**

- Entries are append-only after insertion.
- `earned` and `returned` deltas are positive.
- `redeemed` and `expired` deltas are negative.
- `adjusted` may be positive or negative; order cancellation uses a negative adjustment to reverse previously earned points.
- One order may produce at most one earned entry and one earning-reversal adjustment.
- One reward redemption may produce at most one redeemed debit and one logical return operation.
- Lifetime earned is the sum of `earned` deltas only; available balance is unallocated positive credit whose expiration cutoff has not passed.

## Point Allocation

Maps a negative point event to the positive credits it consumes.

**Fields**

- `id`: UUID primary key
- `customerId`: loyalty customer reference
- `creditEntryId`: positive point ledger entry reference
- `debitEntryId`: negative point ledger entry reference
- `points`: positive integer
- `createdAt`: timestamp

**Relationships**

- Belongs to one positive credit and one negative debit for the same customer.

**Rules**

- Allocated points for a credit cannot exceed its positive `pointsDelta`.
- Allocations for a debit must sum to the absolute value of its negative `pointsDelta`.
- Redemption allocation order is earliest non-null expiration date first, non-expiring credits last, then oldest event.
- Expiration allocates all still-unspent points from a credit after its cutoff.
- Return credits copy the expiration dates represented by the original redemption allocations.

## Order Loyalty Totals

Extends the existing order value without replacing purchased snapshots.

**Fields**

- `total`: existing gross captured beverage value
- `loyaltyRewardDiscountTotal`: new total of active redemption covered amounts, default `0.00`
- `payableTotal`: response value derived as `total - loyaltyRewardDiscountTotal`

**Rules**

- `loyaltyRewardDiscountTotal` cannot be negative or exceed `total`.
- Returning a reward removes its covered amount from the active loyalty discount total.
- Amount-based earning uses non-cancelled beverage value minus active reward coverage.
- Beverage-count earning excludes cancelled quantity and complimentary free-beverage quantity; a size-upgraded beverage still counts.
- Sales summaries subtract active reward coverage from the target item and order sales values while preserving gross captured totals for audit.

## Lifecycle Sequences

### Registration and phone update

1. Normalize the submitted phone.
2. Insert or update the customer.
3. Let the database unique index resolve any concurrent duplicate as a conflict.
4. Preserve the same customer ID and all history on update.

### Redemption during order creation

1. Lock the loyalty customer row.
2. Materialize any due expirations for that customer.
3. Validate active reward options and draft beverage targets.
4. Confirm available points cover all selected rewards.
5. Insert order, beverage snapshots, association, redemption snapshots, ledger debits, and allocations in one transaction.
6. Return order loyalty details and payable total.

### Order completion

1. Enforce the existing order completion transition.
2. If the order has a loyalty association and no prior earning event, read the active earning and expiration policy.
3. Calculate eligible amount or beverage quantity from non-cancelled snapshots and active reward coverage.
4. Append one earned entry when the result is positive, including the rule version and computed expiration date.
5. Commit the status transition and point event together.

### Cancellation and return

1. Enforce the existing order or beverage cancellation transition.
2. Return each affected active redemption once and append returned credits using the original expiration buckets.
3. For a full order cancellation after earning, append one negative adjusted entry allocated against the earned credit.
4. Recalculate active loyalty reward coverage for the order.
5. Commit the operational and loyalty changes together.

### Expiration

1. Resolve the current shop business date.
2. Lock the customer and select positive credits with a cutoff before the current business date.
3. For each credit with unallocated points, append an expired debit and allocation.
4. Return the current summary/history or continue redemption using the refreshed available balance.
