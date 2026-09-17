import { spawn } from "node:child_process";
const production = process.argv.includes("--production");
const children = [
  spawn("npm", ["run", production ? "start" : "dev", "-w", "backend"], {
    stdio: "inherit",
    env: process.env,
  }),
  spawn("npm", ["run", production ? "preview" : "dev", "-w", "frontend"], {
    stdio: "inherit",
    env: process.env,
  }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const c of children) c.kill("SIGTERM");
  setTimeout(() => process.exit(code), 500).unref();
}
for (const c of children) c.on("exit", (code) => stop(code ?? 1));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
