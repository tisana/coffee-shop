import { readdir, rm } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const logDir = path.resolve(rootDir, "logs");
const rootLogDir = path.resolve(rootDir, "logs");

if (logDir !== rootLogDir) {
  throw new Error(`Refusing to clean logs outside ${rootLogDir}`);
}

let entries = [];

try {
  entries = await readdir(logDir, { withFileTypes: true });
} catch (error) {
  if (error?.code === "ENOENT") {
    process.exit(0);
  }

  throw error;
}

await Promise.all(
  entries
    .filter((entry) => entry.name !== ".gitkeep")
    .map((entry) => rm(path.join(logDir, entry.name), { force: true, recursive: true }))
);
