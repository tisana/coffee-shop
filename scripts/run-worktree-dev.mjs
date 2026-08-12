import { spawn } from "node:child_process";
import { realpath } from "node:fs/promises";
import path from "node:path";

import { stopChildProcess } from "./process-control.mjs";
import { registerWorktreeLauncherShutdown } from "./worktree-launcher-control.mjs";
import { resolveWorktreePorts } from "./worktree-dev-ports.mjs";

const rootDir = await realpath(process.cwd());
const { apiPort, webPort } = resolveWorktreePorts({ worktreePath: rootDir });

console.log(`API: http://localhost:${apiPort}`);
console.log(`Staff web: http://localhost:${webPort}`);

const child = spawn(
  process.execPath,
  [path.join(rootDir, "scripts", "run-logged-dev.mjs")],
  {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(apiPort),
      STAFF_WEB_PORT: String(webPort),
      API_PROXY_PORT: String(apiPort),
    },
    stdio: "inherit",
  },
);

const shutdownControl = registerWorktreeLauncherShutdown({
  child,
  stopChild: stopChildProcess,
});

const result = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => resolve({ code, signal }));
});

await shutdownControl.waitForShutdown();

if (result.code !== null) {
  process.exitCode = result.code;
} else {
  process.exitCode = shutdownControl.shutdownRequested ? 0 : 1;
}
