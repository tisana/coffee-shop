import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

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
    environment: "node",
    env: {
      SHOP_PHONE_REGION: "TH"
    },
    include: ["tests/**/*.test.ts"],
    pool: "threads",
    fileParallelism: false,
    testTimeout: 10_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts"],
      thresholds: { statements: 78, branches: 69, functions: 81, lines: 80 }
    }
  }
});
