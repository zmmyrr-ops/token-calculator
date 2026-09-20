import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import { zipSync } from "fflate";
const base = "examples/game-workshops",
  output = "frontend/public/workshop-files";
mkdirSync(output, { recursive: true });
for (const id of ["godot-dodge", "phaser-catch", "cocos-targets"]) {
  const files = {};
  if (existsSync(`${base}/${id}/preview.png`))
    copyFileSync(`${base}/${id}/preview.png`, `${output}/${id}.png`);
  for (const name of readdirSync(`${base}/${id}`)) {
    if (!/\.(gd|tscn|godot|ts|js|html|md|txt|png)$/.test(name)) continue;
    files[`${id}/${name}`] = [
      new Uint8Array(readFileSync(`${base}/${id}/${name}`)),
      { mtime: new Date("2026-09-20T00:00:00Z") },
    ];
  }
  writeFileSync(`${output}/${id}.zip`, zipSync(files, { level: 6 }));
}
mkdirSync(`${output}/phaser-catch`, { recursive: true });
for (const name of [
  "index.html",
  "game.js",
  "phaser.min.js",
  "PHASER-LICENSE.md",
])
  copyFileSync(
    `${base}/phaser-catch/${name}`,
    `${output}/phaser-catch/${name}`,
  );
console.log("Built 3 deterministic source archives and Phaser demo");
