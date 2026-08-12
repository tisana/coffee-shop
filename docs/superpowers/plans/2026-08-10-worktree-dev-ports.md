# Worktree Development Ports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let every Git worktree start paired, deterministic API and staff-web dev servers without changing the main checkout defaults.

**Architecture:** A small Node helper maps a checkout path to an API/web-port pair or validates explicit overrides. A dedicated launcher applies those values to the existing logged launcher, and Vite reads its paired values from the environment. Documentation directs agents to the new command and warns that PostgreSQL remains shared.

**Tech Stack:** Node.js 24 ESM, npm workspaces, Vite 8, TypeScript, Git worktrees.

## Global Constraints

- `npm run dev` must remain API `3000` and staff web `5173`.
- `npm run dev:worktree` uses API `4100 + slot` and staff web `6100 + slot`, where `slot` is `0..999` from a SHA-256 path hash.
- `WORKTREE_API_PORT` and `WORKTREE_WEB_PORT` must override only with integers from `1024` through `65535`.
- Do not change Playwright defaults, Docker Compose, database schema, migrations, or seeds.
- Keep the local `.worktrees/` directory ignored.
- Do not commit any changes unless the user expressly requests a commit.

---

### Task 1: Add a tested worktree-port resolver and launcher

**Files:**

- Create: `scripts/worktree-dev-ports.mjs`
- Create: `scripts/worktree-dev-ports.test.mjs`
- Create: `scripts/run-worktree-dev.mjs`
- Create: `scripts/process-control.mjs`
- Create: `scripts/process-control.test.mjs`
- Create: `scripts/worktree-launcher-control.mjs`
- Create: `scripts/worktree-launcher-control.test.mjs`
- Modify: `scripts/run-logged-dev.mjs`
- Modify: `scripts/run-worktree-dev.mjs`
- Modify: `package.json`

**Interfaces:**

- Produces `resolveWorktreePorts({ worktreePath, environment })`, returning `{ slot, apiPort, webPort }`.
- Consumes optional `WORKTREE_API_PORT` and `WORKTREE_WEB_PORT` strings.
- Produces `npm run dev:worktree`, which sets `PORT`, `STAFF_WEB_PORT`, and `API_PROXY_PORT` before delegating to `scripts/run-logged-dev.mjs`.

- [ ] **Step 1: Write the failing resolver tests**

Create `scripts/worktree-dev-ports.test.mjs` using `node:test` and
`node:assert/strict`. Import `resolveWorktreePorts` and assert that:

```js
const first = resolveWorktreePorts({
  worktreePath: "D:/dev/workspaces/coffee-shop-feature-a",
  environment: {}
});
const second = resolveWorktreePorts({
  worktreePath: "D:/dev/workspaces/coffee-shop-feature-a",
  environment: {}
});

assert.deepEqual(second, first);
assert.ok(first.slot >= 0 && first.slot <= 999);
assert.equal(first.apiPort, 4100 + first.slot);
assert.equal(first.webPort, 6100 + first.slot);
```

Add an override case for `WORKTREE_API_PORT: "4510"` and
`WORKTREE_WEB_PORT: "6510"`, plus invalid cases for `"1023"`, `"65536"`, and
`"not-a-port"` that assert a descriptive `RangeError`.

- [ ] **Step 2: Verify the tests fail for the missing module**

Run:

```powershell
node --test scripts/worktree-dev-ports.test.mjs
```

Expected: FAIL because `scripts/worktree-dev-ports.mjs` does not yet exist.

- [ ] **Step 3: Implement the resolver**

Create `scripts/worktree-dev-ports.mjs` with these concrete behaviors:

```js
export function resolveWorktreePorts({ worktreePath, environment = process.env }) {
  // Normalize resolved path separators and case, hash it with SHA-256,
  // read the first uint32, and take modulo 1000 for slot.
  // Validate overrides as base-10 integer ports in the inclusive 1024..65535 range.
  // Return the override or 4100 + slot for apiPort and 6100 + slot for webPort.
}
```

The validation helper must throw `RangeError` identifying the invalid variable,
not silently fall back. Empty or absent override values use the derived value.

- [ ] **Step 4: Implement the worktree launcher and npm script**

Create `scripts/run-worktree-dev.mjs`. Resolve the physical current working
directory with `realpath`, call `resolveWorktreePorts`, print both URLs, and
spawn the current Node executable with `scripts/run-logged-dev.mjs`. Forward
stdio, preserve the parent environment, and set:

```js
PORT: String(apiPort),
STAFF_WEB_PORT: String(webPort),
API_PROXY_PORT: String(apiPort),
```

Forward the child exit code and `SIGINT`/`SIGTERM` shutdown behavior. Add this
root script to `package.json`:

```json
"dev:worktree": "node scripts/run-worktree-dev.mjs"
```

- [ ] **Step 5: Verify the resolver is green**

Run:

```powershell
node --test scripts/worktree-dev-ports.test.mjs
```

Expected: all resolver tests pass.

- [ ] **Step 6: Add Windows child-tree shutdown coverage and implementation**

Create `scripts/process-control.test.mjs` first. With injected fake child and
spawn functions, assert that a Windows child with a PID invokes:

```js
taskkill /pid <pid> /T /F
```

and that a non-Windows child receives its normal `kill()` call. Implement the
minimal exported helper in `scripts/process-control.mjs`, then update
`scripts/run-logged-dev.mjs` to use it when stopping API and staff-web child
commands. Await both termination requests during shutdown so Vite and `tsx`
watch descendants cannot outlive the logged launcher. Run:

```powershell
node --test scripts/process-control.test.mjs
```

Expected: the new test fails before the helper exists and passes after the
logged launcher invokes it.

- [ ] **Step 7: Route outer worktree shutdown through the same process-tree helper**

Write `scripts/worktree-launcher-control.test.mjs` first with an injected
signal emitter and stop callback. It must prove both SIGINT and SIGTERM call
the shared process-tree stop callback exactly once for the worktree launcher's
child rather than calling `child.kill(signal)` directly. Implement the small
registration helper in `scripts/worktree-launcher-control.mjs`, use it from
`scripts/run-worktree-dev.mjs`, and rerun the test. This guarantees that on
Windows a signal reaches `taskkill /T` for the logged-launcher process tree.

### Task 2: Bind the staff web to the paired environment ports

**Files:**

- Modify: `apps/staff-web/vite.config.ts`
- Modify: `apps/staff-web/package.json`
- Create: `apps/staff-web/vite.config.test.ts`

**Interfaces:**

- Consumes `STAFF_WEB_PORT` for Vite's listener and `API_PROXY_PORT` for the
  `/api` proxy target.
- Defaults to listener `5173` and proxy `3000` when those variables are absent.

- [ ] **Step 1: Write the failing Vite configuration test**

Create `apps/staff-web/vite.config.test.ts`. Use `vi.stubEnv`,
`vi.resetModules`, and a dynamic import of `./vite.config` to verify the
worktree variables affect the actual exported configuration:

```ts
vi.stubEnv("STAFF_WEB_PORT", "6520");
vi.stubEnv("API_PROXY_PORT", "4520");
vi.resetModules();

const { default: config } = await import("./vite.config");
expect(config.server).toMatchObject({
  port: 6520,
  proxy: { "/api": { target: "http://127.0.0.1:4520" } }
});
```

In a separate test, import the config with both variables unset and assert the
existing `5173` listener and `3000` target. Run:

```powershell
npm test --workspace @coffee-shop/staff-web -- vite.config.test.ts
```

Expected: the override test fails because the current configuration still uses
the fixed defaults.

Add one test that reads `apps/staff-web/package.json` and asserts the `dev`
script contains `vite --host 127.0.0.1` but no `--port` argument. It must fail
while the command hard-codes `--port 5173`.

- [ ] **Step 2: Read the environment in Vite configuration**

Add a local `readPort(name, fallback)` function to
`apps/staff-web/vite.config.ts`. It must accept only integer strings in
`1024..65535`, throw a descriptive error otherwise, and otherwise return the
fallback. Use it in `server` as:

```ts
port: readPort("STAFF_WEB_PORT", 5173),
target: `http://127.0.0.1:${readPort("API_PROXY_PORT", 3000)}`,
```

Leave `host`, aliases, rewrite behavior, preview script, and all default ports
unchanged. Remove only `--port 5173` from the staff-web `dev` script; Vite
configuration now supplies the unchanged `5173` fallback.

- [ ] **Step 3: Verify configuration compilation**

Run:

```powershell
npm test --workspace @coffee-shop/staff-web -- vite.config.test.ts
npm run typecheck --workspace @coffee-shop/staff-web
npm run build --workspace @coffee-shop/staff-web
```

Expected: both commands exit zero.

### Task 3: Make worktree usage discoverable and safe

**Files:**

- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `AGENTS.md`

**Interfaces:**

- `.worktrees/` is ignored at the repository root.
- Agents run `npm run dev:worktree` from a linked worktree after installing
  dependencies.

- [ ] **Step 1: Ignore the recommended worktree directory**

Add this root-relative entry to `.gitignore`:

```gitignore
/.worktrees/
```

- [ ] **Step 2: Document human workflow in README**

Add a `## Git worktrees` section after `## Run` describing:

1. `git worktree add .worktrees/<branch-name> -b <branch-name>` after verifying
   `.worktrees/` is ignored.
2. `npm install` from each new worktree.
3. `npm run dev:worktree` for paired, automatically selected API and web ports.
4. `WORKTREE_API_PORT` and `WORKTREE_WEB_PORT` as collision/known-port
   overrides.
5. PostgreSQL remains shared; only one session should run migrations, seeds,
   or `db:reset` at a time.

- [ ] **Step 3: Document agent workflow in AGENTS.md**

Add an instruction section outside the managed Spec Kit comment block:

```markdown
## Worktree development

When running development servers from a linked worktree, run `npm install` and
then `npm run dev:worktree`. It assigns isolated API and staff-web ports; do
not use the default `npm run dev` for parallel worktree sessions. PostgreSQL is
shared, so coordinate database migrations, seeds, and resets with other agents.
```

- [ ] **Step 4: Verify ignore behavior and documentation paths**

Run:

```powershell
git check-ignore -v .worktrees/example-worktree
rg -n "dev:worktree|WORKTREE_API_PORT|WORKTREE_WEB_PORT|shared" README.md AGENTS.md
```

Expected: Git reports the `.gitignore` rule and both documents contain the
command and the database coordination warning.

### Task 4: Validate the full development entry point

**Files:**

- Test: `scripts/worktree-dev-ports.test.mjs`
- Test: `scripts/run-worktree-dev.mjs`
- Test: `apps/staff-web/vite.config.ts`
- Test: `apps/staff-web/vite.config.test.ts`

- [ ] **Step 1: Run all focused static checks**

Run:

```powershell
node --test scripts/worktree-dev-ports.test.mjs
npm test --workspace @coffee-shop/staff-web -- vite.config.test.ts
npm run typecheck --workspace @coffee-shop/staff-web
npm run build --workspace @coffee-shop/staff-web
```

Expected: all commands exit zero.

- [ ] **Step 2: Smoke-test the new launcher**

Start `npm run dev:worktree`, capture its first output, and verify it reports a
worktree-specific API URL in `4100..5099` and staff URL in `6100..7099`. Probe
the printed API `/health` and staff root URLs, then stop the process cleanly.

Expected: both probes return success and the main checkout's default ports are
not used by this launcher. After shutdown, confirm no listener remains on the
printed API/web ports and no matching `tsx watch` or Vite process remains.

- [ ] **Step 3: Run repository hygiene checks**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; only the planned worktree-port files and the
pre-existing untracked coverage plan are present.
