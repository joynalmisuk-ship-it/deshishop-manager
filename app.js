import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(fileURLToPath(import.meta.url));

const tsxBin = process.platform === "win32"
  ? join(appRoot, "node_modules", ".bin", "tsx.cmd")
  : join(appRoot, "node_modules", ".bin", "tsx");

if (!existsSync(tsxBin)) {
  console.error("Missing tsx. Run npm install before starting the app.");
  process.exit(1);
}

const child = spawn(tsxBin, ["server.ts"], {
  cwd: appRoot,
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
