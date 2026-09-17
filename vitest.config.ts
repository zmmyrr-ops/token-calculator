import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve("frontend/src"), "@shared": path.resolve("shared") } },
  test: { include: ["tests/unit/**/*.test.ts"] },
});
