import { spawn } from "node:child_process";

const TEMP_HARDCODED_DATABASE_URL =
  "postgres://u05c5f723:dbp_AZ7M4GHw-DtMxqYzuqDt0nbdIevoJJoe@db-6e9ee264e424:5432/db_community-db?sslmode=disable";

console.log(process.env.DATABASE_URL ? process.env.DATABASE_URL.slice(0, 20) : "MISSING");

function sanitizeDatabaseUrl(raw) {
  if (!raw) return "";
  let value = String(raw).trim();

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
  // Temporary diagnostic override to isolate environment-variable injection issues.
  const hardcoded = sanitizeDatabaseUrl(TEMP_HARDCODED_DATABASE_URL);
  if (hardcoded) return hardcoded;

  const direct = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  if (direct) return direct;

  const fallbackNamed = sanitizeDatabaseUrl(process.env.POSTGRES_URL || process.env.POSTGRESQL_URL);
  if (fallbackNamed) return fallbackNamed;

  const matchingKey = Object.keys(process.env).find((key) => key.trim().toUpperCase() === "DATABASE_URL");
  if (!matchingKey) return "";
  return sanitizeDatabaseUrl(process.env[matchingKey]);
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

const sanitized = resolveDatabaseUrlFromEnv();

if (!sanitized || (!sanitized.startsWith("postgres://") && !sanitized.startsWith("postgresql://"))) {
  console.error("[start:cloud] Invalid DATABASE_URL after sanitization.");
  console.error("[start:cloud] Expected postgres:// or postgresql://");
  console.error(`[start:cloud] Current value: ${maskDatabaseUrl(sanitized)}`);
  process.exit(1);
}

process.env.DATABASE_URL = sanitized;
console.log(`[start:cloud] DATABASE_URL accepted: ${maskDatabaseUrl(sanitized)}`);

const prismaBin = process.platform === "win32" ? "prisma.cmd" : "prisma";

try {
  await run(prismaBin, ["migrate", "deploy"], process.env);
  await run("node", ["scripts/start.mjs"], process.env);
} catch (error) {
  console.error(`[start:cloud] ${error.message}`);
  process.exit(1);
}
