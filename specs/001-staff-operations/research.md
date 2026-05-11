# Research: Shop Staff Operations

## Decision: Full-stack TypeScript web application

**Rationale**: Staff operations need a fast browser UI and a shared backend to coordinate queue state between baristas. TypeScript keeps domain types consistent across the API and staff web app.

**Alternatives considered**:
- Browser-only local state: rejected because two baristas could not safely share queue state.
- Native desktop app: rejected because the first version benefits from browser deployment and simpler iteration.
- Backend-only service: rejected because the primary users need an interactive staff interface.

## Decision: PostgreSQL in Docker Compose for first-version persistence

**Rationale**: PostgreSQL gives reliable transactional behavior for daily order numbers and queue claiming, while Docker Compose makes the database easy to start, stop, reset, and align with deployment. This slightly increases setup compared with an embedded database, but it prevents the first implementation from needing a storage migration as soon as deployment or multi-device staff use matters.

**Alternatives considered**:
- In-memory storage: rejected because orders, history, and daily sequences would disappear on restart.
- SQLite: rejected for this plan because it does not benefit from container-managed database start/stop and is less representative of deployment.
- Flat files: rejected because queue transitions and daily sequence generation need reliable atomic writes.

## Decision: Drizzle ORM and Drizzle Kit for schema changes

**Rationale**: Drizzle keeps the backend close to SQL while giving TypeScript schema definitions, typed queries, and generated migrations. That fits the risk profile: queue claiming, daily order number generation, and state transitions need explicit transaction control, while menu customization tables will evolve.

**Alternatives considered**:
- Raw SQL migrations only: rejected because schema and TypeScript types would drift more easily.
- Prisma: rejected for this feature because the generated client/runtime adds more abstraction than needed around transaction-sensitive workflows.
- No migration tool: rejected because menu customization and staff auth schema are expected to change during early iterations.

## Decision: Docker Compose for local development services

**Rationale**: Compose gives developers one command to start and stop PostgreSQL and, later, optionally the API and staff web app. It also documents environment variables, ports, and service dependencies in versioned infrastructure files.

**Alternatives considered**:
- Manual database installation: rejected because it makes onboarding and environment cleanup inconsistent.
- Fully containerized development only: deferred because running Node directly remains faster while the app structure is still being built.
- Production orchestration in this feature: deferred because the first requirement only needs a deployment-aligned container path, not a full platform decision.

## Decision: Server-owned order state machine

**Rationale**: The backend must enforce valid transitions so staff clients cannot complete an order too early, confirm pickup before completion, or take an already claimed order.

**Alternatives considered**:
- Client-side status rules only: rejected because concurrent baristas could bypass or race the UI.
- Free-form status updates: rejected because the constitution requires explicit queue state correctness.

## Decision: Daily order number generated inside accepted-order creation

**Rationale**: The order number must exist before queueing and reset each business day. Generating it in the same transaction as order creation avoids duplicate numbers.

**Alternatives considered**:
- Generate number in the browser: rejected because multiple order-taking baristas could collide.
- Use globally increasing numbers only: rejected because the constitution requires short daily customer-facing numbers.

## Decision: Snapshot purchased beverage details

**Rationale**: Order beverages must preserve the name, quantity, price, options, and instructions captured at order time so later menu edits do not change what staff brew or what customers bought.

**Alternatives considered**:
- Reference menu items live during brewing: rejected because menu edits would alter active or historical orders.
- Copy only menu item ids: rejected because it is insufficient for purchased detail preservation.

## Decision: Simple staff authorization for first version

**Rationale**: The constitution says authorized staff can perform all staff operations in version one. The plan uses local staff accounts, password hashes, and HTTP-only session cookies to provide a real authorization boundary without introducing role complexity.

**Alternatives considered**:
- Role-based permissions: deferred until a future spec introduces separate manager or cashier permissions.
- No authorization: rejected because the constitution requires staff operations only for authorized staff.
- OAuth/SSO: deferred because it adds integration complexity before the first staff workflow needs it.

## Decision: OpenAPI contract for API planning

**Rationale**: A lightweight OpenAPI document gives the future task phase a concrete interface for order, queue, menu, and history behavior without locking implementation internals into the feature spec.

**Alternatives considered**:
- No contract artifact: rejected because the project exposes a staff web UI backed by a service.
- GraphQL schema: rejected because the first workflow maps cleanly to resource and action endpoints.
