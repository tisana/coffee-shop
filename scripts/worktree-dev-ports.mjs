import { createHash } from "node:crypto";
import path from "node:path";

const API_PORT_BASE = 4100;
const WEB_PORT_BASE = 6100;

function resolvePortOverride(environment, variable) {
  const value = environment[variable];

  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new RangeError(
      `${variable} must be a base-10 integer port from 1024 through 65535.`,
    );
  }

  const port = Number(value);
  if (port < 1024 || port > 65535) {
    throw new RangeError(`${variable} must be a port from 1024 through 65535.`);
  }

  return port;
}

export function resolveWorktreePorts({
  worktreePath,
  environment = process.env,
}) {
  const normalizedPath = path
    .resolve(worktreePath)
    .replaceAll("\\", "/")
    .toLowerCase();
  const slot =
    createHash("sha256").update(normalizedPath).digest().readUInt32BE(0) % 1000;
  const apiPort =
    resolvePortOverride(environment, "WORKTREE_API_PORT") ??
    API_PORT_BASE + slot;
  const webPort =
    resolvePortOverride(environment, "WORKTREE_WEB_PORT") ??
    WEB_PORT_BASE + slot;

  return { slot, apiPort, webPort };
}
