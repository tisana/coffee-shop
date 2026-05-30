# Coffee Shop API

Express API for the staff-operated coffee shop workflow. It owns staff sessions,
menu maintenance, order creation, queue state transitions, fulfillment, pickup,
and current-day history.

## Local Service

- API: `http://localhost:3000`
- Health check: `GET http://localhost:3000/health`
- PostgreSQL: `localhost:5432` through `infra/docker/compose.yml`
- Staff session cookie: `staff_session`

## Commands

Run commands from the repository root unless noted.

```powershell
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev --workspace @coffee-shop/api
```

Useful validation commands:

```powershell
npm run test --workspace @coffee-shop/api
npm run test --workspace @coffee-shop/api -- auth-security.test.ts
npm run typecheck --workspace @coffee-shop/api
npm run build --workspace @coffee-shop/api
```

Database migration checks:

```powershell
npm run db:generate --workspace @coffee-shop/api
npm run db:migrate --workspace @coffee-shop/api
```

## Environment

The local Docker database defaults are defined in `infra/docker/compose.yml`.
For direct API runs, keep `DATABASE_URL` pointed at the local PostgreSQL service.
Set `SHOP_TIME_ZONE` to the shop's IANA timezone when daily order numbers and
current-day history need to follow local shop time; it defaults to `UTC`.
In production, set `NODE_ENV=production` so session cookies include the `Secure`
attribute in addition to `HttpOnly`, `SameSite=Lax`, `Max-Age`, and `Path=/`.
