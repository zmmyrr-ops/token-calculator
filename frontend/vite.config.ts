import { defineConfig } from "vite";
import path from "node:path";
const proxy = {
  "/api": {
    target: process.env.API_PROXY_TARGET || "http://127.0.0.1:4000",
    changeOrigin: true,
  },
  "/sitemap.xml": { target: "http://127.0.0.1:4000" },
  "/robots.txt": { target: "http://127.0.0.1:4000" },
};
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "../shared"),
    },
  },
  server: { strictPort: true, proxy },
  preview: {
    strictPort: true,
    proxy: {
      ...proxy,
      "^/(?:$|(?:news|learn|models|tools|scenarios|tutorials|calculators|about|privacy|how-it-works|updates|community-rules|forum|admin|login|account|register|search|saved|compare)(?:[/?]|$))":
        { target: process.env.API_PROXY_TARGET || "http://127.0.0.1:4000" },
    },
  },
  build: { target: "es2022" },
  worker: { format: "es" },
});
