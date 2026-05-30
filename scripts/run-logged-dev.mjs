import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const logDir = path.join(rootDir, "logs");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const processes = [
  {
    name: "api",
    args: ["run", "dev", "--workspace", "@coffee-shop/api"],
    out: "api-dev.out.log",
    err: "api-dev.err.log"
  },
  {
    name: "staff-web",
    args: ["run", "dev", "--workspace", "@coffee-shop/staff-web"],
    out: "staff-web-dev.out.log",
    err: "staff-web-dev.err.log"
  }
];

await mkdir(logDir, { recursive: true });

const children = processes.map((processConfig) => {
  const child = spawn(npmCommand, processConfig.args, {
    cwd: rootDir,
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"]
  });
  const outLog = createWriteStream(path.join(logDir, processConfig.out), { flags: "a" });
  const errLog = createWriteStream(path.join(logDir, processConfig.err), { flags: "a" });

  child.stdout.pipe(outLog);
  child.stderr.pipe(errLog);
  child.stdout.on("data", (chunk) => process.stdout.write(`[${processConfig.name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${processConfig.name}] ${chunk}`));

  child.on("exit", (code, signal) => {
    outLog.end();
    errLog.end();

    if (!shuttingDown) {
      shuttingDown = true;
      stopChildren();
      process.exitCode = code ?? (signal ? 1 : 0);
    }
  });

  return child;
});

let shuttingDown = false;

function stopChildren() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

process.on("SIGINT", () => {
  shuttingDown = true;
  stopChildren();
});

process.on("SIGTERM", () => {
  shuttingDown = true;
  stopChildren();
});

