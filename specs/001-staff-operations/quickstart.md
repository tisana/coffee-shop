# Quickstart: Shop Staff Operations

This quickstart describes the expected developer flow after implementation tasks create the app structure.

## Prerequisites

- Node.js 24
- npm
- Docker Desktop or Docker Engine with Docker Compose

## Setup

```powershell
npm install
docker compose -f infra/docker/compose.yml up -d db
npm run db:migrate
npm run db:seed
```

## Run Locally

```powershell
npm run dev
```

Expected local services:
- Staff web app: `http://localhost:5173`
- API service: `http://localhost:3000`
- PostgreSQL database: `localhost:5432`

## Stop Local Services

```powershell
docker compose -f infra/docker/compose.yml down
```

## Reset Local Database

```powershell
docker compose -f infra/docker/compose.yml down -v
docker compose -f infra/docker/compose.yml up -d db
npm run db:migrate
npm run db:seed
```

## Validate Core Journey

1. Sign in or start as an authorized staff user.
2. Create a counter order with multiple beverages.
3. Confirm a short daily order number is assigned.
4. Push the order to the brew queue.
5. Claim the queued order as an available barista.
6. Mark one beverage cancelled and keep remaining beverages active.
7. Complete the remaining beverages.
8. Mark the order completed and verify the daily order number is used for pickup notification.
9. Confirm customer pickup.
10. Locate the order in current-day history.

## Phase 8 Walkthrough Notes

The cross-story smoke path is captured in
`apps/staff-web/tests/e2e/full-staff-workflow.spec.ts`. It verifies login,
counter order creation, automatic queue submission, queue claim, beverage
completion, pickup confirmation, menu availability update, and current-day
history lookup in one browser flow.

Security hardening checks are captured in
`apps/api/tests/integration/auth-security.test.ts`. They verify that staff
session cookies carry `HttpOnly`, `SameSite=Lax`, `Max-Age`, and `Path=/`
constraints and that tampered or inactive staff sessions are rejected by the
auth middleware.

Manual walkthrough should use the same service ports:

- Staff web: `http://localhost:5173`
- API: `http://localhost:3000`
- Health check: `http://localhost:3000/health`

## Test Commands

```powershell
npm run db:generate
npm run db:migrate
npm run test
npm run test:e2e
npm run test --workspace @coffee-shop/api -- auth-security.test.ts
npm run test:e2e --workspace @coffee-shop/staff-web -- full-staff-workflow.spec.ts
```

## Container Smoke Check

```powershell
docker compose -f infra/docker/compose.yml up --build
```
