import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@coffee-shop\/shared\/(.*)$/,
        replacement: `${fileURLToPath(new URL("../../packages/shared/src/", import.meta.url))}$1`
      },
      {
        find: "@coffee-shop/shared",
        replacement: fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url))
      }
    ]
  },
  test: {
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
    globals: true,
    pool: "threads",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.d.ts", "src/test/**", "tests/e2e/**"],
      thresholds: { statements: 38, branches: 35, functions: 38, lines: 40 }
    }
  }
});
