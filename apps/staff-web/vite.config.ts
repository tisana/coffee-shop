import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

function readPort(name: string, fallback: number): number {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be an integer between 1024 and 65535.`);
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`${name} must be an integer between 1024 and 65535.`);
  }

  return port;
}

export default defineConfig({
  plugins: [react()],
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
  server: {
    host: "127.0.0.1",
    port: readPort("STAFF_WEB_PORT", 5173),
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${readPort("API_PROXY_PORT", 3000)}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
});
