import { build } from "esbuild";
await build({
  entryPoints: ["src/server.ts","src/sync-learning.ts"],
  outdir: "dist",
  outExtension: {".js":".mjs"},
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  packages: "external",
});
