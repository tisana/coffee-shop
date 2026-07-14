# Data Model: Loyalty Program

## Loyalty Customer

Represents one customer identity enrolled by staff.

**Fields**

- `id`: UUID primary key
- `name`: required display name, 1-120 characters
- `phoneDisplay`: required staff-entered phone, 1-40 characters
- `phoneNormalized`: required E.164 phone produced with the configured shop region
- `email`: optional trimmed staff-entered email with valid email format, maximum 254 characters
- `enrolledAt`, `updatedAt`: timestamps

**Relationships**

- Has many loyalty order associations.
- Has many point ledger entries and reward redemptions.

**Rules**

- `phoneNormalized` is unique at the database level and contains a valid E.164 value.
- A supplied email must have valid email format after trimming and is rejected before the email unique index is evaluated.
- When present, `email` is unique at the database level after trimming and case-insensitive comparison; the named `loyalty_customers_email_ci_unique` partial unique index on `lower(email)` allows multiple customers with no email address.
- A follow-up migration trims existing non-null email values, converts blanks to null, and must report any duplicate `lower(email)` values for staff remediation before creating the named partial unique index; it must not silently merge customer accounts.
- Create, update, and phone search use `libphonenumber-js` with `SHOP_PHONE_REGION`; invalid numbers are rejected before uniqueness checks.
- Create and update map named phone and email unique-index conflicts to the corresponding staff-facing field; rejected updates leave the stored customer record unchanged.
- Editing name, phone, or email never changes `id` or historical relationships.
- Customer activation, deactivation, and deletion are outside this increment.

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
- `benefitType` is immutable; changing it requires retiring the option and creating another.
- A free beverage covers one complete unit of one target order beverage, including selected customizations.
- A size upgrade covers one selected positive-price size adjustment on the target beverage.
- Active rewards cannot exceed the target beverage quantity, so one beverage unit never receives stacked rewards.

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
- Staff select the customer before submitting the counter order; the association is created atomically with the order and cannot be added, replaced, or removed afterward in this increment.
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
- A free-beverage covered amount is one complete unit price including selected customizations; a size-upgrade covered amount is one selected positive-price adjustment.
- Active redemptions targeting one beverage row cannot exceed its quantity.
- Before pickup, staff may cancel an active redemption without cancelling the beverage or order; cancelling the redemption, target beverage, or order changes it to returned exactly once, removes active coverage, and appends returned point events using the original expiration buckets.

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

### Registration and identity update

1. Validate and normalize the submitted phone to E.164 with `libphonenumber-js` and `SHOP_PHONE_REGION`.
2. Trim a supplied email, validate its email format while preserving its display casing, and treat blank input as no email.
3. Insert or update the customer.
4. Let the named phone or partial case-insensitive email unique index resolve any concurrent duplicate as the corresponding conflict.
5. Preserve the same customer ID and all history on update; on conflict, persist no part of the requested update.

### Redemption during order creation

1. Lock the loyalty customer row.
2. Materialize any due expirations for that customer.
3. Validate active reward options and draft beverage targets.
4. Confirm available points cover all selected rewards.
5. Insert order, beverage snapshots, association, redemption snapshots, ledger debits, and allocations in one transaction.
6. Return order loyalty details and payable total.

### Standalone reward cancellation

1. Lock the order and associated loyalty customer.
2. Confirm the redemption belongs to the order, is active, and the order has not been picked up or cancelled.
3. Mark the redemption returned and remove its amount from active loyalty reward coverage.
4. Append returned credit entries for the original redemption allocations, preserving each expiration date.
5. Commit once and return the updated order; retries cannot issue points twice.

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
