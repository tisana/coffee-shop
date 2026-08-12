// @vitest-environment node

import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Vite development server configuration", () => {
  it("lets the Vite configuration select the development port", async () => {
    const manifest = JSON.parse(
      await readFile(new URL("./package.json", import.meta.url), "utf8")
    ) as { scripts: { dev: string } };

    expect(manifest.scripts.dev).toBe("vite --host 127.0.0.1");
  });

  it("uses the worktree environment ports for its listener and API proxy", async () => {
    vi.stubEnv("STAFF_WEB_PORT", "6520");
    vi.stubEnv("API_PROXY_PORT", "4520");
    vi.resetModules();

    const { default: config } = await import("./vite.config");

    expect(config.server).toMatchObject({
      port: 6520,
      proxy: { "/api": { target: "http://127.0.0.1:4520" } }
    });
  });

  it("keeps the established ports when worktree variables are absent", async () => {
    vi.unstubAllEnvs();
    vi.resetModules();

    const { default: config } = await import("./vite.config");

    expect(config.server).toMatchObject({
      port: 5173,
      proxy: { "/api": { target: "http://127.0.0.1:3000" } }
    });
  });
});
