import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { stopChildProcess } from "./process-control.mjs";

test("uses taskkill to await termination of a Windows process tree", async () => {
  const calls = [];
  const taskkill = new EventEmitter();
  const child = {
    pid: 4321,
    killed: false,
    kill: () => assert.fail("should not use child.kill on Windows"),
  };

  const stopping = stopChildProcess(child, {
    platform: "win32",
    spawnProcess(command, args, options) {
      calls.push({ command, args, options });
      return taskkill;
    },
  });

  assert.deepEqual(calls, [
    {
      command: "taskkill",
      args: ["/pid", "4321", "/T", "/F"],
      options: { stdio: "ignore" },
    },
  ]);

  let finished = false;
  void stopping.then(() => {
    finished = true;
  });
  await Promise.resolve();
  assert.equal(finished, false);

  taskkill.emit("close", 0);
  await stopping;
});

test("does not start taskkill for an already killed or PID-less Windows child", async () => {
  let launches = 0;
  const spawnProcess = () => {
    launches += 1;
  };

  await stopChildProcess(
    { pid: 42, killed: true },
    { platform: "win32", spawnProcess },
  );
  await stopChildProcess(
    { killed: false },
    { platform: "win32", spawnProcess },
  );

  assert.equal(launches, 0);
});

test("uses normal child.kill outside Windows", async () => {
  let killed = 0;

  await stopChildProcess(
    { killed: false, kill: () => (killed += 1) },
    {
      platform: "linux",
      spawnProcess: () =>
        assert.fail("should not spawn taskkill outside Windows"),
    },
  );

  assert.equal(killed, 1);
});
