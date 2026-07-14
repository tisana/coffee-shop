# Feature Specification: Loyalty Program

**Feature Branch**: `003-loyalty-program`  
**Created**: 2026-07-07  
**Status**: Draft  
**Input**: User description: "I want to have royalty program so I can retain customer and let them come back to the shop again. Loyalty program would need customer to register their name and phone number as primary identity. Phone number can be edit and change later but it must be unique per customer. Email address will be optional. Reward should be configurable such as rating how much amount customer need to buy to earn 1 point. Eg. $10 to 1 point. Or it can be per beverage. Redeem point must be configurable as well. Eg. 10 point can redeem 1 beverage, 5 point can get a size upgrade. Point expiration is another configurable needed."

## Clarifications

### Session 2026-07-10

- Q: Should point expiration use a rolling duration from each earning date, a calendar-month cutoff, or support both modes? → A: Use a configurable calendar-month cutoff.
- Q: How should equivalent local and international phone formats map to customer identity? → A: Normalize valid phone numbers to E.164 using the shop's configured phone region.
- Q: When can a loyalty customer be associated with an order? → A: Select one customer before submitting the counter order; post-creation association changes are outside this increment.
- Q: Which reward benefits and coverage rules are supported initially? → A: Support one non-stackable free-beverage or size-upgrade reward per beverage unit with immutable benefit type.
- Q: How can staff undo a redeemed reward before the customer receives it? → A: Allow standalone reward cancellation before pickup and return the original expiration buckets exactly once.

### Session 2026-07-14

- Q: Must customer phone numbers and email addresses both be unique while remaining editable? → A: Yes. Phone numbers are unique by normalized E.164 value; when supplied, email addresses are trimmed and compared case-insensitively for uniqueness. Staff may edit either value, but a collision is rejected without changing the customer account.
- Q: Must a supplied email address have valid email format before uniqueness is evaluated? → A: Yes. Reject malformed supplied email addresses before checking uniqueness.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Register and identify loyalty customers (Priority: P1)

Authorized staff can register a customer for the loyalty program using the customer's name and phone number, then find the customer again on later visits so orders can be associated with the same loyalty account.

**Why this priority**: The shop cannot retain returning customers or award points until customers have a reliable loyalty identity.

**Independent Test**: Can be fully tested by registering a customer with name, phone, and optional email, searching for the customer on a later visit, and confirming malformed or duplicate phone numbers and supplied email addresses are rejected during registration and editing.

**Acceptance Scenarios**:

1. **Given** no loyalty customer exists for a phone number, **When** staff register a customer with a name and that phone number, **Then** the customer becomes available for future loyalty lookup.
2. **Given** a loyalty customer already uses a phone number, **When** staff try to register another customer with the same phone number, **Then** the system prevents the duplicate and explains that the phone number is already registered.
3. **Given** a registered loyalty customer, **When** staff update the customer's phone number to a new unused phone number, **Then** the customer remains the same loyalty account and future lookup uses the new phone number.
4. **Given** a registered loyalty customer, **When** staff update the customer's phone number to one already used by another customer, **Then** the system rejects the change and keeps the original phone number.
5. **Given** a phone number entered in a valid local format, **When** another customer is registered with the equivalent international format for the shop's configured phone region, **Then** the system treats both values as the same E.164 identity and blocks the duplicate.
6. **Given** a loyalty customer already uses an email address, **When** staff register another customer with the same address using different letter case or surrounding whitespace, **Then** the system prevents the duplicate and explains that the email address is already registered.
7. **Given** a registered loyalty customer, **When** staff update the customer's email address to one already used by another customer, **Then** the system rejects the change and keeps the original email address and loyalty account unchanged.
8. **Given** staff enter a malformed non-empty email address, **When** they register or update a loyalty customer, **Then** the system rejects the value before checking email uniqueness and keeps existing customer data unchanged on an update.

---

### User Story 2 - Award points from eligible purchases (Priority: P2)

Authorized staff can attach a registered loyalty customer to an eligible shop order so the customer earns points according to the active earning configuration, either by purchase amount or by beverages purchased.

**Why this priority**: Earning points is the core reason customers return and the shop needs the rule to be configurable as the program changes.

**Independent Test**: Can be fully tested by configuring an earning rule, attaching a loyalty customer to an order, completing the order, and confirming the correct points are added only for eligible non-cancelled purchases.

**Acceptance Scenarios**:

1. **Given** earning is configured as "10.00 purchase amount earns 1 point", **When** a loyalty customer completes an eligible 25.00 order, **Then** the customer earns 2 points and the remaining 5.00 does not create a partial point.
2. **Given** earning is configured as "1 beverage earns 1 point", **When** a loyalty customer completes an eligible order with 3 non-cancelled beverages, **Then** the customer earns 3 points.
3. **Given** a loyalty customer is attached to an order that is fully cancelled, **When** staff review the customer's loyalty balance, **Then** no points from that order are included.
4. **Given** an order contains cancelled and non-cancelled beverages, **When** points are awarded, **Then** only non-cancelled eligible beverages and eligible sales amounts contribute points.
5. **Given** staff submit a new order without selecting a loyalty customer, **When** the order is created, **Then** it remains a non-loyalty order and cannot be associated with a customer later in this increment.

---

### User Story 3 - Redeem configurable rewards (Priority: P3)

Authorized staff can configure reward options and redeem a customer's available points for benefits such as a free beverage or size upgrade during a shop order.

**Why this priority**: Redemption turns the point balance into a customer-facing reason to revisit the shop.

**Independent Test**: Can be fully tested by configuring reward options, giving a customer enough points, redeeming a reward during an order, and confirming the points are deducted only when the customer has enough unexpired points.

**Acceptance Scenarios**:

1. **Given** a reward is configured as "10 points redeem 1 beverage" and a customer has 12 available points, **When** staff apply it to one beverage unit, **Then** the reward covers that unit's complete purchased price including selected customizations, the order shows the reward, and the customer has 2 available points remaining.
2. **Given** a reward is configured as "5 points redeem a size upgrade" and a customer has 4 available points, **When** staff attempt the redemption, **Then** the system prevents the redemption and shows the points needed.
3. **Given** a reward was redeemed on an order that is later cancelled before pickup, **When** staff review the customer's balance, **Then** the redeemed points are returned to the customer.
4. **Given** a size-upgrade reward and a beverage with a selected positive-price size adjustment, **When** staff apply the reward, **Then** only that selected adjustment is covered and the beverage remains eligible for beverage-count earning.
5. **Given** a beverage unit already has a loyalty reward, **When** staff try to apply another reward to the same unit, **Then** the system prevents reward stacking.
6. **Given** an active reward redemption on an order that has not been picked up, **When** staff cancel only the reward benefit, **Then** the beverage and order remain active, the reward coverage is removed, and the consumed points are returned exactly once with their original expiration dates.

---

### User Story 4 - Configure and enforce point expiration (Priority: P4)

Authorized staff can configure whether points expire and, when expiration is enabled, customers can only redeem points that are still valid.

**Why this priority**: Expiration is important for program cost control, but customer registration, earning, and redemption can deliver value first.

**Independent Test**: Can be fully tested by enabling a calendar-month expiration period, awarding points in different months, and confirming each month's points expire after the configured future month while remaining visible in customer history.

**Acceptance Scenarios**:

1. **Given** point expiration is disabled, **When** a customer earns points, **Then** those points remain available until redeemed or adjusted.
2. **Given** point expiration is configured as 3 calendar months after the earning month, **When** points earned during July reach the end of the October 31 shop business day, **Then** those points expire and are no longer redeemable.
3. **Given** a customer has both expired and available points, **When** staff view the loyalty account, **Then** the account clearly separates available, redeemed, and expired points.

---

### Edge Cases

- Valid local, international, and international-dial-prefix representations of the same phone number must normalize to one E.164 customer identity using the shop's configured phone region.
- Invalid phone numbers must be rejected before customer uniqueness is evaluated.
- Customers may not have an email address; email must not block registration or lookup, but a supplied email must have valid email format and must not match another customer's email after surrounding whitespace is removed and letter case is ignored.
- Updating a customer's name, phone number, or email address must not create a new loyalty identity or lose point history; a rejected phone or email collision leaves the existing customer data unchanged.
- If the active earning rule changes, past point ledger entries keep their original earned amounts while future eligible orders use the new rule.
- If a reward option changes or is retired, past redemptions remain visible in customer history while future redemptions use only currently available reward options.
- A reward option's benefit type cannot be edited; staff must retire it and create a new option to change the benefit type.
- A free-beverage reward covers one complete beverage unit including selected customizations; a size-upgrade reward covers one selected positive-price size adjustment; rewards cannot stack on the same beverage unit.
- Cancelling only a reward before pickup must not cancel its beverage or order, must remove its active coverage, and must not return points more than once.
- If points expire after staff open a customer profile but before redemption is completed, redemption must use the latest available balance.
- Points remain redeemable through the final shop business day of their configured expiration month and become expired after that business day ends.
- Staff need a clear explanation when a customer cannot earn points, cannot redeem a reward, or has no available points.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow authorized staff to create a loyalty customer with customer name and phone number as required information.
- **FR-002**: System MUST allow authorized staff to optionally store an email address for a loyalty customer; every supplied email address MUST have valid email format and MUST be unique after surrounding whitespace is removed and letter case is ignored.
- **FR-003**: System MUST validate and normalize phone numbers to E.164 using the shop's configured phone region and MUST enforce uniqueness so equivalent local and international representations identify the same loyalty customer.
- **FR-004**: System MUST allow authorized staff to edit a loyalty customer's name, phone number, and email address while preserving the same loyalty account and point history.
- **FR-005**: System MUST prevent customer registration or customer updates that would duplicate another loyalty customer's normalized phone number or supplied email address, explain the conflicting field to staff, and preserve the existing customer account data when an update is rejected.
- **FR-006**: System MUST allow authorized staff to find an existing loyalty customer by phone number and by customer name.
- **FR-007**: System MUST allow authorized staff to select at most one registered loyalty customer before submitting a new counter order and MUST create the association atomically with that order; adding or changing the association after order creation is outside this increment.
- **FR-008**: System MUST allow authorized staff to configure the active point earning rule as either purchase-amount based or beverage-count based.
- **FR-009**: System MUST award whole points according to the active earning rule when an associated order becomes eligible for points.
- **FR-010**: System MUST exclude fully cancelled orders and cancelled beverages from point earning.
- **FR-011**: System MUST preserve a staff-visible customer account point history showing earned, redeemed, returned, expired, and adjusted point changes with the reason for each change.
- **FR-012**: System MUST allow authorized staff to configure free-beverage and size-upgrade reward options with a reward name, point cost, benefit description, and availability; benefit type is immutable after creation, a free-beverage reward covers one complete beverage unit including selected customizations, a size-upgrade reward covers one selected positive-price size adjustment, and rewards MUST NOT stack on the same beverage unit.
- **FR-013**: System MUST prevent redemption when the customer does not have enough available unexpired points.
- **FR-014**: System MUST deduct points when a reward is redeemed and show the redeemed reward on the associated order.
- **FR-015**: System MUST allow authorized staff to cancel an active reward redemption before order pickup without cancelling the beverage or order, return the consumed points exactly once using their original expiration dates, remove the reward's active monetary coverage, and apply the same return behavior when the associated beverage or order is cancelled before pickup.
- **FR-016**: System MUST allow authorized staff to configure point expiration as disabled or as a number of calendar months after the month in which points are earned; points earned in the same calendar month MUST share an expiration cutoff after the final shop business day of the configured future month.
- **FR-017**: System MUST exclude expired points from the customer's available redeemable balance.
- **FR-018**: System MUST show available, redeemed, expired, returned, and lifetime earned point totals for a loyalty customer.
- **FR-019**: System MUST keep historical earning and redemption records understandable after customer information, earning rules, reward options, or expiration settings change.
- **FR-020**: System MUST keep loyalty actions available only to authorized staff users.

### Key Entities _(include if feature involves data)_

- **Loyalty Customer**: A registered customer identity for the program. Key attributes include customer name, unique E.164 phone identity, staff-entered phone display value, optional case-insensitively unique email identity, enrollment date, and point summary.
- **Earning Rule**: The active configuration that determines how eligible purchases earn points. Key attributes include earning type, amount threshold or beverage count threshold, point amount earned, effective date, and active status.
- **Reward Option**: A configurable redemption choice. Key attributes include reward name, point cost, reward benefit, availability status, and effective date.
- **Point Ledger Entry**: An immutable customer point event. Key attributes include customer, point amount, event type, reason, associated order or reward when applicable, earned date, expiration date when applicable, and event date.
- **Loyalty Order Association**: The connection between a shop order and a loyalty customer, including earned points and redeemed rewards tied to that order.
- **Expiration Policy**: The active rule for whether earned points expire and, when enabled, the number of calendar months after the earning month used to determine the shared month-end expiration cutoff.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Staff can register a new loyalty customer during counter service in under 45 seconds.
- **SC-002**: Staff can find an existing loyalty customer by phone number or name in under 15 seconds.
- **SC-003**: 100% of attempted duplicate normalized-phone and supplied-email registrations and updates are blocked with a clear staff-facing explanation that identifies the conflicting field.
- **SC-004**: For eligible completed loyalty orders, awarded points match the active earning configuration in 100% of tested amount-based and beverage-count scenarios.
- **SC-005**: Staff can configure or update an earning rule, reward option, and expiration policy in under 2 minutes each.
- **SC-006**: Staff can determine whether a customer can redeem a configured reward in under 20 seconds from the customer or order view.
- **SC-007**: Expired points are excluded from redeemable balances in 100% of tested expiration scenarios while remaining visible in history.
- **SC-008**: A customer account's point history explains the source of every earned, redeemed, returned, expired, or adjusted point change without requiring staff to inspect unrelated order records.

## Assumptions

- "Royalty program" in the request means a customer loyalty program for retaining repeat customers.
- The first increment is staff-managed inside the existing staff operations product; customer self-service signup, customer-facing apps, and marketing message automation are out of scope.
- The shop remains single-location for this feature; cross-location customer balances and reward policies are out of scope.
- All authorized staff may perform loyalty enrollment, lookup, order association, reward redemption, and program configuration unless a later specification introduces distinct staff roles.
- The shop provides one configured phone region for E.164 normalization; supporting customers whose valid phone number cannot be parsed under that region is outside this increment.
- Loyalty association is selected only while composing a new counter order and cannot be added, replaced, or removed after the order is created in this increment.
- The first reward benefit types are free beverage and size upgrade; menu/category eligibility rules and reward stacking are out of scope.
- Loyalty customers do not have an active/inactive lifecycle in this increment; enrolled identities and their history are retained.
- Only one earning rule and one expiration policy are active at a time; historical records preserve the rule that applied when points were earned.
- Eligible purchase amount means the order amount that remains after cancellations and non-eligible reward benefits are considered.
- Point earning uses whole points only; partial purchase progress does not carry over unless a later specification adds stored fractional progress.
- Payment processing, discounts outside configured reward benefits, loyalty tiers, referrals, coupons, and bulk import/export are out of scope for this feature.
