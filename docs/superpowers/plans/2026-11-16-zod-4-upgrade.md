# Zod 4.6.7 Upgrade Implementation Plan

> **For agentic workers** — Use `superpowers:executing-plans` to implement this plan task by task. Track completed steps with the checkboxes below.

**Goal** — Upgrade the API from Zod 3.25.76 to exactly 4.6.7 with verified request compatibility, repeatable installation, and a tested rollback path.

**Architecture** — Keep validation in the existing API route schemas and preserve the HTTP error envelope. Remove unused Zod declarations from staff-web and shared. Resolve compatibility questions through consumer inspection and comparison of existing data before releasing.

**Tech stack** — Node.js 24, npm workspaces, TypeScript 5.9.3 in the lockfile, Express 5, PostgreSQL 17, Vitest, React 19, and Playwright.

**Context** — Read `AGENTS.md`, `specs/003-loyalty-program/plan.md`, and this document. The user requested a safe upgrade plan and selected “Unsure — include a compatibility check before release” for legacy UUIDs and exact validation messages.

## Decisions and evidence

- The approach is a direct, exact-version upgrade with targeted regression coverage. The user accepts rejection of unsafe integers and UUIDs rejected by Zod 4, and confirmed no external client relies on exact field-error wording.
- Pinning 4.6.7 and removing the two unused declarations are implementation recommendations. Recheck imports before removal.
- Before the upgrade, source imported Zod only in `apps/api/src/routes/validators.ts` and `apps/api/src/routes/errors.ts`. All three workspace manifests declared `^3.23.0`, and the lockfile resolved 3.25.76.
- The November 14 assessment compared 18 inputs against both versions. It confirmed stricter UUID and safe-integer validation and changes to default error wording. Tested defaults and optional email behavior matched.
- The November 14 assessment used an API Zod resolution override and passed nine focused tests. Its temporary install and database tests were blocked. The November 17 upgrade subsequently passed clean installation, build, database-backed tests, and browser tests.
- Implementation is committed on `zod-4-upgrade` at `6840665`, based on `4c6eb154008fc5e25a864200838977f79084d50b`. CI, the full live smoke flow, and release work remain open.
- The user confirmed there are no external dependencies and authorized a read-only check of the existing PostgreSQL data. The check compared 22,443 non-null UUID column values and 57 menu image URLs. Zod 4 rejected none that Zod 3 accepted, and the parsed URL outputs matched. The 1,534 beverage snapshots contained names, prices, and choices without ID fields. Loyalty tables contained no customer, reward, or email records, so those values were assessed using repository tests and synthetic inputs rather than existing records.
- The implementation retains Zod 4's stricter UUID and safe-integer validation and its default validation messages. The user accepts rejecting integers above `Number.MAX_SAFE_INTEGER` and UUIDs rejected by Zod 4. The staff UI preserves `details` on `ApiClientError` but does not inspect `fieldErrors` or `formErrors`; it displays the top-level message, which remains unchanged. The user confirmed no external client depends on exact field-error text.
- Direct upgrade keeps this small change easy to review. A staged `zod/v4` import migration would add an intermediate dependency state without addressing the outstanding integration checks. Use compatibility handling only where the audit identifies a need.

## Global constraints

- Use the exact target `4.6.7`, including when newer releases become available during execution.
- Preserve successful staff workflows, parsed defaults, whitespace normalization, and the distinction between omitted values and explicit clearing values.
- Preserve HTTP status 400, code `BAD_REQUEST`, message `Request validation failed.`, and `details` containing `formErrors` and `fieldErrors`.
- Resolve legacy UUID and error-wording dependencies before release. Document any approved behavior changes.
- Use a dedicated disposable PostgreSQL instance for tests. `cleanupLoyaltyFixtureData()` deletes whole loyalty tables, and several tests under `tests/unit` access PostgreSQL.
- Follow `AGENTS.md` for linked worktrees. Install dependencies before starting `npm.cmd run dev:worktree`, and use its assigned API and web ports.
- Keep production code changes focused on dependency declarations and validation compatibility. Database schema changes and new runtime dependencies are outside the expected upgrade scope.

## Files and responsibilities

| File | Planned responsibility |
| --- | --- |
| `apps/api/package.json` | Pin `zod` to `4.6.7` |
| `apps/staff-web/package.json` | Remove unused Zod declaration after checking imports |
| `packages/shared/package.json` | Remove unused Zod declaration after checking imports |
| `package-lock.json` | Record the resulting workspace dependency graph |
| `apps/api/src/routes/errors.ts` | Use `z.flattenError(error)` while preserving the API envelope |
| `apps/api/src/routes/validators.ts` | Make only compatibility adjustments justified by tests or the audit |
| `apps/api/tests/unit/validators.test.ts` | Pin defaults, partial updates, coercion, and accepted/rejected inputs |
| `apps/api/tests/unit/app.test.ts` | Exercise validation through an actual HTTP request |
| Existing API integration tests | Verify database-backed order, menu, reports, and loyalty workflows |

## Review focus

1. Existing identifiers accepted by Zod 3 but rejected by Zod 4 must be identified by Task 2 and covered by a compatibility test if support is required.
2. Consumers matching exact error strings must be identified by Task 2. Task 3 verifies the HTTP envelope and any message commitments found.
3. Omitted loyalty email, `null`, blank strings, and name-only updates must retain distinct effects, covered in Task 3.
4. Menu defaults, money conversion, report defaults, and omitted update fields must preserve their output, covered in Task 3.
5. Numeric strings, missing required values, unsafe integers, and nested validation failures must have explicit expectations, covered in Task 3.

## Task 1 — Establish a reproducible baseline

- [x] Record the starting commit and inspect the worktree. Created the requested `zod-4-upgrade` branch at baseline `4c6eb154008fc5e25a864200838977f79084d50b`.
- [x] Record Node 24.22.1, npm 11.19.1, baseline Zod 3.25.76, and the registry version and integrity for 4.6.7.
- [x] Run `npm.cmd ci` on the baseline checkout.
- [x] Provision a disposable PostgreSQL 17 container on an isolated host port. The actual container name was `coffee-shop-zod-4-upgrade-test`. Environment variables were set only in the relevant command processes.

```powershell
$zodContainer = 'coffee-shop-zod-' + [Guid]::NewGuid().ToString('N').Substring(0, 12)
docker run --detach --name $zodContainer --publish 127.0.0.1::5432 --env POSTGRES_USER=zod_test --env POSTGRES_PASSWORD=zod_test --env POSTGRES_DB=zod_test postgres:17-alpine
# Wait for this command to exit successfully before continuing.
docker exec $zodContainer pg_isready -U zod_test -d zod_test
$zodPort = (docker port $zodContainer 5432/tcp).Trim().Split(':')[-1]
$env:DATABASE_URL = "postgres://zod_test:zod_test@127.0.0.1:${zodPort}/zod_test"
$env:SHOP_PHONE_REGION = 'TH'
$env:SHOP_TIME_ZONE = 'Asia/Bangkok'
```

- [x] Verify database identity with `SELECT current_database(), current_user`. Both values were `zod_test`.
- [x] Apply existing migrations and run baseline typecheck, lint, tests, and build. They passed. Lint reported two pre-existing worktree launcher warnings and the build reported a bundle-size warning.

**Completion evidence** — A recorded baseline, successful ordinary installation, a verified disposable database, and baseline check results. Any baseline failures have a documented disposition before candidate results are interpreted.

## Task 2 — Resolve compatibility with existing consumers and data

- [x] Search repository clients, fixtures, and integration scripts for Zod imports, UUID assumptions, and exact error strings. Inspect the staff API client's treatment of `details`. The user was unsure about external clients or imported records and requested that compatibility remain open for PR review.
- [x] Compare UUID columns in the authorized PostgreSQL database in a read-only transaction, and inspect order snapshot keys. All 22,443 non-null UUID column values accepted by Zod 3 were accepted by Zod 4. The database contained no loyalty IDs, and beverage snapshots had no ID fields.
- [x] Compare all 57 non-null menu image URLs using the project's trim, URL, and length validation. Acceptance and parsed output matched. The database contained no customer emails to compare. Email omission, clearing, trimming, and synthetic validation cases are covered by existing tests and the prior comparison.
- [x] Compare 18 synthetic inputs using the project schemas and error handler with separately resolved 3.25.76 and 4.6.7. Compare acceptance, parsed output, and the HTTP error envelope. This does not establish representative existing-data compatibility.
- [x] Review known differences against repository consumers and the available database. No stored UUID or URL required a compatibility adjustment, and the user confirmed no external dependencies. Keep the existing top-level error contract and Zod 4 default field messages.
- [x] Confirm acceptance of rejecting integers above `Number.MAX_SAFE_INTEGER`. The user accepted this behavior.
- [x] Confirm field-error wording compatibility. The user reported no external dependency, and the repository UI does not inspect the field-error text.
- [x] Confirm acceptance of Zod 4's stricter handling of UUIDs. The user confirmed that UUIDs rejected by Zod 4 should be rejected by the API. The available database did not contain loyalty data or email addresses.

**Completion evidence** — The inspected consumer/data scope, a list of differences, and an agreed policy for every meaningful compatibility difference.

## Task 3 — Upgrade and protect API behavior

- [x] Add the validator and error-path cases below. Existing preservation cases passed against Zod 3 before the upgrade and Zod 4 afterward. The user accepted stricter integer and UUID validation.

| Status | Case | Required assertion |
| --- | --- | --- |
| Done | Order with quantity `"2"` | Parsed quantity is `2`, omitted customizations become `[]` |
| Done | Loyalty omitted versus customer supplied | Omitted loyalty stays absent, supplied customer with omitted rewards gets `rewards: []` |
| Done | New menu with price `4.5` | Price becomes `"4.50"`, booleans and nested group/choice defaults match the baseline |
| Done | Menu update omitting groups | `customizationGroups` stays absent |
| Done | Empty report query | Period is `daily`, statuses are `completed` and `picked_up` |
| Done | Customer name-only update | Parsed output omits email |
| Done | Email clearing and normalization | Blank email becomes `null`, explicit `null` stays `null`, surrounding whitespace is trimmed, omitted email stays absent |
| Done | Empty customer update | Validation fails with the existing custom message |
| Done | IDs | Valid test UUIDs pass, malformed and invalid-variant UUIDs fail. The available stored UUIDs were compatible |
| Done | Integer limits | Numeric strings coerce, fractions and missing required quantity fail, and an explicit test checks that Zod 4 rejects an unsafe integer |
| Done | Refinements and nested failures | Reversed dates and incompatible thresholds fail, nested issue paths are asserted, and an HTTP test checks the flattened beverage field errors |

- [x] In `app.test.ts`, assert the HTTP 400 login validation envelope. Existing report integration assertions were retained.
- [x] Pin API Zod to `4.6.7`, remove the unused declarations, install, and inspect the lockfile diff.
- [x] Replace `error.flatten()` with `z.flattenError(error)` while keeping the existing dispatch and error envelope.
- [x] Review validator changes against Task 2. No schema adjustment was needed. Existing string format methods remain supported in Zod 4.
- [x] Run the focused validator and app tests. All 19 passed with the upgraded dependency after the compatibility checks.

**Completion evidence** — A focused manifest/lockfile/source/test diff and passing targeted regression tests.

## Task 4 — Verify the installed candidate and staff workflows

- [x] Run the checks below against the disposable database. All passed and `npm ls` showed only Zod 4.6.7. The candidate clean install required a retry with elevated permissions after Windows returned `EPERM`. Lint retained two baseline warnings, and the build retained its bundle-size warning.

```powershell
npm.cmd ci
npm.cmd ls zod --all
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
git diff --check
```

- [x] Run the full API suite, including menu/order creation, reports, customer identity, reward redemption, order completion/cancellation, and expiration contracts. All 100 API tests passed.
- [x] Install dependencies and run `dev:worktree` against the disposable database. The API used port 4281 and the staff web app used port 6281.
- [x] Use a temporary Playwright config with the worktree web URL, then remove it. All 17 browser tests passed. The working command was `npm.cmd run test:e2e --workspace @coffee-shop/staff-web -- --config playwright.zod.config.ts`.

```typescript
import { defineConfig } from "@playwright/test";
import original from "./playwright.config";

if (!process.env.PLAYWRIGHT_BASE_URL) {
  throw new Error("Set PLAYWRIGHT_BASE_URL to the running worktree web URL.");
}

export default defineConfig({
  ...original,
  webServer: [],
  use: { ...original.use, baseURL: process.env.PLAYWRIGHT_BASE_URL }
});
```

- [x] Seed the disposable database and verify live invalid login, login, customer enrollment and edit, and sales reports.
- [x] Complete the live API smoke flow against a disposable PostgreSQL database. Edited a menu item, enrolled and edited a customer, configured an earning rule and reward, completed a paid order, redeemed the reward on a second order, completed it, and checked the balance, history, and reports. Also verified login and the validation error envelope.
- [ ] Require the existing CI validation job to pass on the candidate commit. It provides PostgreSQL 17, ordinary `npm ci`, coverage, build, and Chromium tests. Its isolated runner can use the existing browser configuration.

**Completion evidence** — Successful ordinary install, dependency graph, typecheck, lint, coverage, build, browser tests, live smoke check, and CI results for the candidate commit.

## Task 5 — Release and rollback

The user confirmed that the project is not live in production. Deployment, release, and rollback tasks are skipped for this upgrade. CI validation remains required for the pull request.

- [x] Review the final diff and keep dependency/source changes in one revertible upgrade commit, `6840665`, based on `4c6eb154008fc5e25a864200838977f79084d50b`.
- [x] Record the final compatibility decisions.
- [ ] Complete PR CI verification.
- [x] Stop the assessment's dev processes, remove the dedicated disposable container and temporary Playwright config. Database environment values were scoped to the relevant command processes.

**PR verification** — Compatibility review and live smoke checks are complete. The PR CI checks must pass.

## References

- Zod documents UUID, integer, default, and API changes in its [migration guide](https://zod.dev/v4/changelog).
- `z.flattenError()` produces the shallow form/field structure used by this API. See [error formatting](https://zod.dev/error-formatting).
- Repository test and worktree rules come from `AGENTS.md`, `.github/workflows/ci.yml`, `apps/api/tests/integration/testFixtures.ts`, and `apps/staff-web/playwright.config.ts`.
