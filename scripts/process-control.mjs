import { spawn } from "node:child_process";

function waitForCompletion(process) {
  return new Promise((resolve, reject) => {
    process.once("error", reject);
    process.once("close", resolve);
  });
}

export async function stopChildProcess(
  child,
  { platform = process.platform, spawnProcess = spawn } = {},
) {
  if (platform !== "win32") {
    if (!child.killed) {
      child.kill();
    }
    return;
  }

  if (child.killed || !Number.isInteger(child.pid)) {
    return;
  }

  const taskkill = spawnProcess(
    "taskkill",
    ["/pid", String(child.pid), "/T", "/F"],
    {
      stdio: "ignore",
    },
  );
  await waitForCompletion(taskkill);
}
