import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { stopChildProcess } from "./process-control.mjs";

const rootDir = process.cwd();
const logDir = path.join(rootDir, "logs");
const npmCommand =
  process.platform === "win32"
    ? {
        command: process.execPath,
        prefixArgs: [
          path.join(
            path.dirname(process.execPath),
            "node_modules",
            "npm",
            "bin",
            "npm-cli.js",
          ),
        ],
      }
    : { command: "npm", prefixArgs: [] };

const processes = [
  {
    name: "api",
    args: ["run", "dev", "--workspace", "@coffee-shop/api"],
    out: "api-dev.out.log",
    err: "api-dev.err.log",
  },
  {
    name: "staff-web",
    args: ["run", "dev", "--workspace", "@coffee-shop/staff-web"],
    out: "staff-web-dev.out.log",
    err: "staff-web-dev.err.log",
  },
];

await mkdir(logDir, { recursive: true });

const children = processes.map((processConfig) => {
  const child = spawn(
    npmCommand.command,
    [...npmCommand.prefixArgs, ...processConfig.args],
    {
      cwd: rootDir,
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    },
  );
  const outLog = createWriteStream(path.join(logDir, processConfig.out), {
    flags: "a",
  });
  const errLog = createWriteStream(path.join(logDir, processConfig.err), {
    flags: "a",
  });

  child.stdout.pipe(outLog);
  child.stderr.pipe(errLog);
  child.stdout.on("data", (chunk) =>
    process.stdout.write(`[${processConfig.name}] ${chunk}`),
  );
  child.stderr.on("data", (chunk) =>
    process.stderr.write(`[${processConfig.name}] ${chunk}`),
  );

  child.on("exit", (code, signal) => {
    outLog.end();
    errLog.end();

    if (!shuttingDown) {
      shuttingDown = true;
      void stopChildren(code ?? (signal ? 1 : 0));
    }
  });

  return child;
});

let shuttingDown = false;
let shutdownPromise;
let finishShutdown;
const shutdownComplete = new Promise((resolve) => {
  finishShutdown = resolve;
});

function stopChildren(exitCode = 0) {
  shutdownPromise ??= Promise.all(
    children.map((child) => stopChildProcess(child)),
  )
    .then(() => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error("Failed to stop development processes.", error);
      process.exitCode = 1;
    })
    .finally(() => {
      finishShutdown();
    });

  return shutdownPromise;
}

process.on("SIGINT", () => {
  shuttingDown = true;
  void stopChildren();
});

process.on("SIGTERM", () => {
  shuttingDown = true;
  void stopChildren();
});

await shutdownComplete;
