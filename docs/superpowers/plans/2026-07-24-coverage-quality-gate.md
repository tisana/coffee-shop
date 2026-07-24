# Coverage Quality Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate source-coverage reports and reject test runs that fall below the repository's initial coverage floor.

**Architecture:** Vitest's V8 provider is configured independently in the API, staff-web, and shared workspaces. Each workspace emits text, HTML, and LCOV output into its ignored local `coverage/` directory and applies a global threshold; the root command runs every workspace gate.

**Tech Stack:** Node.js 24, npm workspaces, Vitest 4.1.8, `@vitest/coverage-v8` 4.1.8.

## Global Constraints

- Keep the existing API Node environment and staff-web jsdom environment unchanged.
- Cover only production source under each workspace's `src/` directory; exclude test files, declaration files, dependencies, build output, and browser E2E specs.
- Enforce the measured API, staff-web, and shared baseline thresholds documented in `docs/superpowers/specs/2026-07-24-coverage-quality-gate-design.md`.
- Preserve the separate `npm run test:e2e` browser workflow.
- Do not add application runtime dependencies or alter application source.

---

### Task 1: Configure per-workspace V8 coverage gates

**Files:**

- Modify: `package.json`
- Modify: `apps/api/package.json`
- Modify: `apps/api/vitest.config.ts`
- Modify: `apps/staff-web/package.json`
- Modify: `apps/staff-web/vitest.config.ts`
- Modify: `packages/shared/package.json`
- Modify: `packages/shared/vitest.config.ts`
- Modify: `package-lock.json`

**Interfaces:**

- Consumes: existing workspace `test` commands and Vitest configuration.
- Produces: `npm run test:coverage`, which executes all workspace coverage gates and writes `coverage/index.html` plus `coverage/lcov.info` in each workspace.

- [ ] **Step 1: Establish the configuration-only baseline**

Run: `npm test`

Expected: the pre-change workspace suite completes without introducing coverage output or threshold failures. If the API process exits unexpectedly, run `npm run test --workspace @coffee-shop/api` and record the isolated result before proceeding.

- [ ] **Step 2: Add the coverage provider and root quality-gate command**

Modify the root `package.json` scripts and development dependencies to contain:

```json
{
  "scripts": {
    "test": "npm run test:coverage",
    "test:coverage": "npm run test:coverage --workspaces --if-present"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^4.1.8"
  }
}
```

Run: `npm install --package-lock-only`

Expected: `package-lock.json` locks `@vitest/coverage-v8` at the compatible Vitest 4.1.8 release without changing production dependencies.

- [ ] **Step 3: Add coverage commands to all workspaces**

In `apps/api/package.json`, `apps/staff-web/package.json`, and `packages/shared/package.json`, add this script next to the existing test script:

```json
"test:coverage": "vitest run --coverage"
```

Expected: `npm run test:coverage --workspace @coffee-shop/api`, `npm run test:coverage --workspace @coffee-shop/staff-web`, and `npm run test:coverage --workspace @coffee-shop/shared` are callable by the root workspace command.

- [ ] **Step 4: Configure production-source reports and thresholds**

In `apps/api/vitest.config.ts`, add the following inside `test`:

```ts
coverage: {
  provider: "v8",
  reporter: ["text", "html", "lcov"],
  include: ["src/**/*.ts"],
  exclude: ["src/**/*.test.ts", "src/**/*.d.ts"],
      thresholds: { statements: 78, branches: 69, functions: 81, lines: 80 }
}
```

In `apps/staff-web/vitest.config.ts`, add:

```ts
coverage: {
  provider: "v8",
  reporter: ["text", "html", "lcov"],
  include: ["src/**/*.{ts,tsx}"],
  exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.d.ts", "src/test/**", "tests/e2e/**"],
  thresholds: { statements: 38, branches: 35, functions: 38, lines: 40 }
}
```

In `packages/shared/vitest.config.ts`, add:

```ts
coverage: {
  provider: "v8",
  reporter: ["text", "html", "lcov"],
  include: ["src/**/*.ts"],
  exclude: ["src/**/*.test.ts", "src/**/*.d.ts"],
  thresholds: { statements: 83, branches: 100, functions: 50, lines: 83 }
}
```

Expected: every workspace measures only application source and uses the same initial floor.

- [ ] **Step 5: Verify the gate and reports**

Run: `npm run test:coverage`

Expected: 40 test files and 150 tests pass, each workspace prints coverage percentages at or above the configured thresholds, and these files exist:

```text
apps/api/coverage/index.html
apps/api/coverage/lcov.info
apps/staff-web/coverage/index.html
apps/staff-web/coverage/lcov.info
packages/shared/coverage/index.html
packages/shared/coverage/lcov.info
```

Run: `npm test`

Expected: the normal root command invokes the same enforced coverage gate.

- [ ] **Step 6: Review the change**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only the root package files, three workspace package/config pairs, and the design/plan documentation are modified. Do not commit unless the user explicitly requests it.
