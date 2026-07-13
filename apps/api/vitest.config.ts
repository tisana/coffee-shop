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
    testTimeout: 10_000
  }
});
