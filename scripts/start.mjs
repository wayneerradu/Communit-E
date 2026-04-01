import { spawn } from "node:child_process";

const port = process.env.PORT?.trim() || "3010";
const nextBin = process.platform === "win32" ? "next.cmd" : "next";

const child = spawn(nextBin, ["start", "-p", port], {
  stdio: "inherit",
  shell: false,
  env: process.env
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
