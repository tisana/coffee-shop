import assert from "node:assert/strict";
import test from "node:test";

import { resolveWorktreePorts } from "./worktree-dev-ports.mjs";

test("derives deterministic API and web ports from the worktree path", () => {
  const first = resolveWorktreePorts({
    worktreePath: "D:/dev/workspaces/coffee-shop-feature-a",
    environment: {},
  });
  const second = resolveWorktreePorts({
    worktreePath: "D:/dev/workspaces/coffee-shop-feature-a",
    environment: {},
  });

  assert.deepEqual(second, first);
  assert.ok(first.slot >= 0 && first.slot <= 999);
  assert.equal(first.apiPort, 4100 + first.slot);
  assert.equal(first.webPort, 6100 + first.slot);
});

test("uses valid API and web port overrides", () => {
  assert.deepEqual(
    resolveWorktreePorts({
      worktreePath: "D:/dev/workspaces/coffee-shop-feature-a",
      environment: {
        WORKTREE_API_PORT: "4510",
        WORKTREE_WEB_PORT: "6510",
      },
    }),
    {
      ...resolveWorktreePorts({
        worktreePath: "D:/dev/workspaces/coffee-shop-feature-a",
        environment: {},
      }),
      apiPort: 4510,
      webPort: 6510,
    },
  );
});

for (const [variable, value] of [
  ["WORKTREE_API_PORT", "1023"],
  ["WORKTREE_WEB_PORT", "65536"],
  ["WORKTREE_API_PORT", "not-a-port"],
]) {
  test(`rejects invalid ${variable} value ${value}`, () => {
    assert.throws(
      () =>
        resolveWorktreePorts({
          worktreePath: "D:/dev/workspaces/coffee-shop-feature-a",
          environment: { [variable]: value },
        }),
      (error) =>
        error instanceof RangeError && error.message.includes(variable),
    );
  });
}
