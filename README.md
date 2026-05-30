# Coffee Shop Staff Operations

TypeScript monorepo for a staff-operated coffee shop workflow. The API owns
PostgreSQL-backed staff sessions, menu data, daily order numbers, queue state,
fulfillment, pickup, and history. The staff web app provides the browser UI for
baristas.

## Services

- Staff web: `http://localhost:5173`
- API: `http://localhost:3000`
- API health: `http://localhost:3000/health`
- PostgreSQL: `localhost:5432`

## Setup

```powershell
npm install
npm run db:up
npm run db:migrate
npm run db:seed
```

Database helpers:

```powershell
npm run db:down
npm run db:reset
npm run db:generate
```

`db:reset` removes the local database volume, starts a fresh PostgreSQL service,
then expects migrations and seed data to be run again.

## Run

Start the API and staff web app together:

```powershell
npm run dev
```

This writes API and staff web logs under `logs/`.

Start both apps without writing project-managed log files:

```powershell
npm run dev:console
```

Clean generated logs:

```powershell
npm run logs:clean
```

Start one workspace at a time:

```powershell
npm run dev --workspace @coffee-shop/api
npm run dev --workspace @coffee-shop/staff-web
```

## Validate

```powershell
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

Focused Phase 8 validation:

```powershell
npm run test --workspace @coffee-shop/api -- auth-security.test.ts
npm run test:e2e --workspace @coffee-shop/staff-web -- full-staff-workflow.spec.ts
```

## Containers

Start only PostgreSQL for local development:

```powershell
docker compose -f infra/docker/compose.yml up -d db
```

Stop local services:

```powershell
docker compose -f infra/docker/compose.yml down
```

Build the containerized stack for a smoke check:

```powershell
docker compose -f infra/docker/compose.yml up --build
```
