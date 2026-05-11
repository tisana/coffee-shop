<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- PRINCIPLE_1_NAME -> I. Staff Workflow Integrity
- PRINCIPLE_2_NAME -> II. Daily Order Identity
- PRINCIPLE_3_NAME -> III. Queue State Correctness
- PRINCIPLE_4_NAME -> IV. Purchased Detail Preservation
- PRINCIPLE_5_NAME -> V. Incremental, Spec-Driven Delivery
Added sections:
- Product Scope and Constraints
- Development Workflow and Quality Gates
Removed sections:
- None
Templates requiring updates:
- .specify/templates/plan-template.md: reviewed, no change required
- .specify/templates/spec-template.md: reviewed, no change required
- .specify/templates/tasks-template.md: reviewed, no change required
- .specify/templates/commands/*.md: not present in this repo
Follow-up TODOs:
- None
-->
# Coffee Shop Constitution

## Core Principles

### I. Staff Workflow Integrity

The system MUST model the real staff-operated counter journey: an authorized
barista creates an accepted order, pushes it to the brew queue, another
available barista may take it, beverages are brewed, the order is completed,
the customer is notified by order number, and pickup is confirmed. Features
that bypass or blur this workflow MUST be rejected unless a newer specification
explicitly amends the operating model.

Rationale: the current product value is operational accuracy for shop staff
during service, not generic ordering or reporting.

### II. Daily Order Identity

Every accepted order MUST receive a short customer-facing order number for the
current business day before it enters the brew queue. Daily order numbers MUST
be allowed to reset each business day, and the system MUST still distinguish
historical orders by combining the business date with the daily order number.
Customer notification and pickup flows MUST use the daily order number as the
primary staff-facing callout.

Rationale: staff and customers need quick numbers during service, while the
system still needs durable identity across days.

### III. Queue State Correctness

The order workflow MUST enforce valid status transitions from created, queued,
in progress, completed, picked up, or cancelled states. The system MUST prevent
two baristas from taking the same waiting order, MUST prevent completion before
all remaining non-cancelled beverages are done, and MUST prevent pickup
confirmation before completion. If a beverage in a multi-beverage order is
cancelled or unavailable, the remaining beverages MUST continue through brewing
and the customer MUST be notified only when the remaining beverages are ready.

Rationale: incorrect queue state causes duplicate work, incomplete customer
handoffs, and unreliable pickup calls during busy service.

### IV. Purchased Detail Preservation

Order beverages MUST preserve the purchased details captured at order time,
including beverage name, quantity, selected options, special instructions, and
price. Later menu edits, retirement, or availability changes MUST affect future
orders only. Menu availability controls MUST stop unavailable items from being
selected for new orders while keeping existing orders fulfillable or cancellable
according to their own state.

Rationale: staff need the order as sold when brewing and resolving customer
questions, even when the menu changes mid-day.

### V. Incremental, Spec-Driven Delivery

Work MUST proceed from specification to plan to tasks to implementation, using
the active feature directory under `specs/` as the source of truth. User stories
MUST stay independently testable and priority ordered so the P1 journey can be
implemented, validated, and demonstrated before lower-priority capabilities.
Implementation details MUST NOT leak into feature specifications; planning may
choose technologies only after the constitution check passes.

Rationale: this repo is in its first staff-operations feature, so disciplined
increments matter more than broad platform assumptions.

## Product Scope and Constraints

This project currently covers barista-run counter ordering and staff operations
for a pickup coffee shop workflow. Customer self-ordering, payment handling,
delivery, table service, and daily sales reporting are out of scope unless a
future specification explicitly brings them in.

Staff operations MUST be available only to authorized staff users. The first
version uses simple staff authorization: authorized staff can take orders, brew
queued orders, update order status, confirm pickup, cancel beverages or orders,
and maintain menu items.

Operational interfaces MUST remain fast and scannable during service. Plans and
acceptance tests MUST preserve the measurable outcomes in the active spec,
including order creation within 60 seconds, taking a queued order within 15
seconds, confirming pickup within 10 seconds, marking menu availability within
20 seconds, and locating a current-day order within 45 seconds.

## Development Workflow and Quality Gates

Each feature spec MUST include prioritized user stories, independent tests,
acceptance scenarios, edge cases, functional requirements, measurable success
criteria, and assumptions. A feature is not ready for planning while unresolved
clarification markers remain or while requirements are not testable.

Each implementation plan MUST include a Constitution Check that evaluates this
feature against all core principles, product scope, and measurable operational
constraints. Any violation MUST be documented in Complexity Tracking with the
reason it is necessary and the simpler alternative that was rejected.

Task lists MUST preserve user-story grouping and dependency order. Foundational
work may block stories, but individual user stories MUST remain independently
implementable and independently verifiable wherever the spec claims they are.
Tests are required when the active specification, plan, or risk profile calls
for them; concurrency, state transitions, authorization, and purchased-detail
preservation are high-risk areas that SHOULD receive automated coverage.

Before work is considered complete, the relevant spec checklist, plan
Constitution Check, generated tasks, and implemented behavior MUST agree with
one another. Validation evidence SHOULD include the lightest reliable command
or manual flow that proves the changed behavior.

## Governance

This constitution supersedes conflicting local practice for the Coffee Shop
project. Feature specifications, implementation plans, task lists, and code
reviews MUST verify compliance with these principles. If a requested change
conflicts with the constitution, the constitution wins unless it is amended in
the same change.

Amendments require a documented reason, a semantic version change, and a review
of dependent templates and runtime guidance. MAJOR versions redefine or remove
core principles, MINOR versions add principles or materially expand governance,
and PATCH versions clarify wording without changing obligations.

Ratification date is the date this template first became concrete project
governance. Last amended date MUST change whenever the constitution content
changes. The current active feature branch and AGENTS.md guidance MUST continue
to point contributors toward the current plan once planning artifacts exist.

**Version**: 1.0.0 | **Ratified**: 2026-05-11 | **Last Amended**: 2026-05-11
