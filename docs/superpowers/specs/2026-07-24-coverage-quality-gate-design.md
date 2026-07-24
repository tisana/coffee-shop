# Coverage quality gate design

## Goal

Make automated source coverage visible and enforce a stable minimum quality floor for the API and staff-web workspaces.

## Design

- Add Vitest's V8 coverage provider as a root development dependency.
- Configure each workspace to collect coverage only from production source files, excluding test files, generated output, configuration, and browser E2E specs.
- Add a root `test:coverage` command that runs every workspace coverage command sequentially and produces terminal, HTML, and LCOV reports in each workspace's ignored `coverage/` directory. The explicit sequence avoids the observed Windows `npm --workspaces` API-process abort.
- Make the existing root `test` command run the enforced coverage check so local and CI callers use the same gate.
- Use global statement, branch, function, and line thresholds derived from the first measured baseline, rounded down to the nearest whole percent. This prevents regressions immediately; the thresholds can be intentionally raised in subsequent changes.

## Initial thresholds

| Workspace | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| API | 78% | 69% | 81% | 80% |
| Staff web | 38% | 35% | 38% | 40% |
| Shared | 83% | 100% | 50% | 83% |

The staff-web measurement excludes `src/test/**` helpers; these support tests and are not production source.

## Boundaries

The quality gate covers API and staff-web production code. The shared package is included only when it has production TypeScript files beyond its tests. Playwright remains a separate browser-level command and is not included in Vitest's source-coverage figures.

## Verification

Run the coverage command and confirm all workspace reports are generated and each threshold passes. Run the normal root test command to confirm it invokes the same gate.
