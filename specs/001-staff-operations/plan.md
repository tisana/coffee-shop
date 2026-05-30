# Implementation Plan: Shop Staff Operations

**Branch**: `001-staff-operations` | **Date**: 2026-05-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-staff-operations/spec.md`

## Summary

Build the first staff-operated coffee shop workflow as a web application with a shared backend. Authorized staff can create counter orders, generate daily order numbers, push orders to a brew queue, let available baristas take queued orders, track beverage completion or cancellation, complete orders only when remaining beverages are ready, confirm pickup, maintain menu availability, and review current-day activity across all workflow statuses with received time.

The technical approach is a small TypeScript monorepo with a staff web UI, a backend API, shared domain types, PostgreSQL persistence, Drizzle migrations, HTTP-only session-cookie staff authentication, and Docker Compose for local services. This keeps development repeatable while still supporting real shared queue state, valid status transitions, daily order numbering, conflict-safe order claiming, and a deployable container path.

## Technical Context

**Language/Version**: TypeScript on Node.js 24  
**Primary Dependencies**: React, Vite, Express, PostgreSQL driver, Drizzle ORM, Drizzle Kit, Zod, Vitest, Playwright, Docker, Docker Compose  
**Storage**: PostgreSQL service managed by Docker Compose for local development and deployment-aligned environments  
**Testing**: Vitest for unit/integration tests; Playwright for staff workflow checks  
**Target Platform**: Browser-based staff web app backed by a Node.js service  
**Project Type**: Full-stack web application  
**Performance Goals**: Order creation <= 60 seconds, queued order take <= 15 seconds, pickup confirmation <= 10 seconds, menu availability update <= 20 seconds, current-day order lookup <= 45 seconds  
**Constraints**: Shared queue state, conflict-safe order claiming, daily order numbers reset by business day in the configured shop timezone (`SHOP_TIME_ZONE`, default `UTC`), purchased beverage details must not change after order creation, database schema changes must use migrations, staff operations must require authorized HTTP-only cookie sessions, database start/stop must be scriptable through containers
**Scale/Scope**: Single coffee shop first version; dozens of active orders per business day; simple authorized staff model

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Staff Workflow Integrity**: PASS. The plan models the required counter order -> brew queue -> in progress -> completed -> pickup-confirmed journey.
- **II. Daily Order Identity**: PASS. The plan includes a daily order sequence with historical uniqueness via configured shop business date plus daily order number.
- **III. Queue State Correctness**: PASS. The plan requires server-side status transitions and conflict-safe claiming of waiting orders.
- **IV. Purchased Detail Preservation**: PASS. The data model scopes allowed customizations per menu item and snapshots purchased beverage name, price, selected customizations, and instructions on order beverages.
- **V. Incremental, Spec-Driven Delivery**: PASS. Artifacts preserve prioritized user stories and keep implementation details in the plan, not the spec.
- **Product Scope and Constraints**: PASS. Customer self-ordering, payment handling, delivery, table service, and sales reporting remain out of scope.

**Post-Design Constitution Check**: PASS. The research, data model, contracts, and quickstart preserve all core principles and measurable operational constraints. No constitution violations require complexity tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-staff-operations/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── api/
│   ├── Dockerfile
│   ├── drizzle/
│   │   └── migrations/
│   ├── src/
│   │   ├── domain/
│   │   ├── routes/
│   │   ├── auth/
│   │   ├── storage/
│   │   └── app.ts
│   └── tests/
│       ├── integration/
│       └── unit/
└── staff-web/
    ├── Dockerfile
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── services/
    │   └── state/
    └── tests/
        └── e2e/

packages/
└── shared/
    └── src/
        ├── contracts/
        └── domain/

infra/
└── docker/
    ├── compose.yml
    └── postgres/
        └── init/
```

**Structure Decision**: Use a small TypeScript monorepo with a backend API, staff web app, shared domain contracts, and Docker Compose-managed infrastructure. This structure is larger than a single browser-only app, but it is necessary because the constitution requires shared queue state, conflict-safe order claiming between multiple baristas, repeatable database start/stop, and a practical deployment path.

## Complexity Tracking

No constitution violations.
