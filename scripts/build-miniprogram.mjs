import { build } from "esbuild";
await build({
  entryPoints: ["shared/engine.ts"],
  outfile: "miniprogram/utils/engine.js",
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2017",
  minify: true,
  legalComments: "eof",
});
console.log("小程序预算引擎已从网站共享实现构建");

await build({entryPoints:["shared/ai-eyes-mobile.ts"],outfile:"miniprogram/utils/eyes-protocol.js",bundle:true,format:"cjs",platform:"browser",target:"es2017",minify:true});
