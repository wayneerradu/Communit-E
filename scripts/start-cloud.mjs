import { spawn } from "node:child_process";

console.log(process.env.DATABASE_URL ? process.env.DATABASE_URL.slice(0, 20) : "MISSING");

function sanitizeDatabaseUrl(raw) {
  if (!raw) return "";
  let value = String(raw)
    // Remove hidden control/zero-width chars that can appear from copy/paste in cloud UIs.
    .replace(/[\u0000-\u001f\u007f\u200b\u200c\u200d\u2060\ufeff]/g, "")
    .trim();

  if (value.startsWith("DATABASE_URL=")) {
    value = value.slice("DATABASE_URL=".length).trim();
  }

  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value;
}

function resolveDatabaseUrlFromEnv() {
  const appSpecific = sanitizeDatabaseUrl(process.env.APP_DATABASE_URL);
  if (appSpecific) return { value: appSpecific, source: "APP_DATABASE_URL" };

  const direct = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  if (direct) return { value: direct, source: "DATABASE_URL" };

  const fallbackNamed = sanitizeDatabaseUrl(process.env.POSTGRES_URL || process.env.POSTGRESQL_URL);
  if (fallbackNamed) return { value: fallbackNamed, source: "POSTGRES_URL/POSTGRESQL_URL" };

  const matchingKey = Object.keys(process.env).find((key) => key.trim().toUpperCase() === "DATABASE_URL");
  if (!matchingKey) return { value: "", source: "none" };
  return { value: sanitizeDatabaseUrl(process.env[matchingKey]), source: matchingKey };
}

function maskDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    const username = parsed.username ? `${parsed.username.slice(0, 2)}***` : "";
    const host = parsed.hostname || "unknown-host";
    const db = parsed.pathname || "/unknown-db";
    return `${parsed.protocol}//${username}:***@${host}${db}`;
  } catch {
    return "(invalid format)";
  }
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      env
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} terminated by signal ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

const resolved = resolveDatabaseUrlFromEnv();
const sanitized = resolved.value;

if (!sanitized || (!sanitized.startsWith("postgres://") && !sanitized.startsWith("postgresql://"))) {
  console.error("[start:cloud] Invalid DATABASE_URL after sanitization.");
  console.error("[start:cloud] Expected postgres:// or postgresql://");
  console.error(`[start:cloud] Current value: ${maskDatabaseUrl(sanitized)}`);
  process.exit(1);
}

process.env.DATABASE_URL = sanitized;
console.log(`[start:cloud] DATABASE_URL source: ${resolved.source}`);
console.log(`[start:cloud] DATABASE_URL accepted: ${maskDatabaseUrl(sanitized)}`);

const prismaBin = process.platform === "win32" ? "prisma.cmd" : "prisma";

try {
  await run(prismaBin, ["migrate", "deploy"], process.env);
  await run("node", ["scripts/start.mjs"], process.env);
} catch (error) {
  console.error(`[start:cloud] ${error.message}`);
  process.exit(1);
}
