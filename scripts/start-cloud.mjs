import { spawn } from "node:child_process";
import pg from "pg";

const DEFAULT_DB_WAIT_RETRIES = 10;
const DEFAULT_DB_WAIT_DELAY_MS = 3000;
const DEFAULT_ROLLED_BACK_MIGRATIONS = ["0002_align_schema"];

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

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

function parseRolledBackMigrations() {
  const fromEnv = (process.env.PRISMA_ROLLED_BACK_MIGRATIONS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : DEFAULT_ROLLED_BACK_MIGRATIONS;
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDB(connectionString, retries, delayMs) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const pool = new pg.Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 5000
    });

    try {
      await pool.query("SELECT 1");
      console.log("[start:cloud] DB is ready.");
      await pool.end();
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[start:cloud] DB not ready (${attempt}/${retries}) - ${message}`);
      await pool.end();
      if (attempt < retries) {
        await sleep(delayMs);
      }
    }
  }

  throw new Error("Could not connect to database after multiple retries.");
}

async function resolveKnownRolledBackMigrations(prismaBin, env) {
  const migrations = parseRolledBackMigrations();
  for (const migration of migrations) {
    try {
      await run(prismaBin, ["migrate", "resolve", "--rolled-back", migration], env);
      console.log(`[start:cloud] Resolved rolled-back migration: ${migration}`);
    } catch {
      // Already resolved or not present - safe to ignore.
    }
  }
}

async function main() {
  const { value: databaseUrl, source } = resolveDatabaseUrlFromEnv();
  const isValidProtocol =
    databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

  if (!databaseUrl || !isValidProtocol) {
    console.error("[start:cloud] Invalid DATABASE_URL after sanitization.");
    console.error("[start:cloud] Expected postgres:// or postgresql://");
    console.error(`[start:cloud] Current value: ${maskDatabaseUrl(databaseUrl)}`);
    process.exit(1);
  }

  process.env.DATABASE_URL = databaseUrl;
  console.log(`[start:cloud] DATABASE_URL source: ${source}`);
  console.log(`[start:cloud] DATABASE_URL accepted: ${maskDatabaseUrl(databaseUrl)}`);

  const retries = toPositiveInt(process.env.DB_WAIT_RETRIES, DEFAULT_DB_WAIT_RETRIES);
  const delayMs = toPositiveInt(process.env.DB_WAIT_DELAY_MS, DEFAULT_DB_WAIT_DELAY_MS);
  await waitForDB(databaseUrl, retries, delayMs);

  const prismaBin = process.platform === "win32" ? "prisma.cmd" : "prisma";
  await resolveKnownRolledBackMigrations(prismaBin, process.env);
  await run(prismaBin, ["migrate", "deploy"], process.env);
  await run("node", ["scripts/start.mjs"], process.env);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[start:cloud] ${message}`);
  process.exit(1);
});
