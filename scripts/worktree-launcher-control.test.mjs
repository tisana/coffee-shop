import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { registerWorktreeLauncherShutdown } from "./worktree-launcher-control.mjs";

for (const signal of ["SIGINT", "SIGTERM"]) {
  test(`${signal} requests the shared stop callback once without killing the child directly`, async () => {
    const signalEmitter = new EventEmitter();
    const child = {
      kill: () =>
        assert.fail("the worktree launcher must not kill its child directly"),
    };
    const stoppedChildren = [];
    const control = registerWorktreeLauncherShutdown({
      signalEmitter,
      child,
      stopChild: async (stoppedChild) => {
        stoppedChildren.push(stoppedChild);
      },
    });

    signalEmitter.emit(signal);
    signalEmitter.emit(signal);
    await control.waitForShutdown();

    assert.deepEqual(stoppedChildren, [child]);
  });
}
