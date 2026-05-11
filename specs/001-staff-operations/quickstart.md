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

## Test Commands

```powershell
npm run db:generate
npm run db:migrate
npm run test
npm run test:e2e
```

## Container Smoke Check

```powershell
docker compose -f infra/docker/compose.yml up --build
```
