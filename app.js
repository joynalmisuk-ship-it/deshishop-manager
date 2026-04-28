import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const tsxBin = process.platform === "win32"
  ? "node_modules\\.bin\\tsx.cmd"
  : "./node_modules/.bin/tsx";

if (!existsSync(tsxBin)) {
  console.error("Missing tsx. Run npm install before starting the app.");
  process.exit(1);
}

const child = spawn(tsxBin, ["server.ts"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || "production",
  },
});

const stop = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
