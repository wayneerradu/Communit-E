import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const TEMP_HARDCODED_DATABASE_URL =
  "postgres://u05c5f723:dbp_AZ7M4GHw-DtMxqYzuqDt0nbdIevoJJoe@db-6e9ee264e424:5432/db_community-db?sslmode=disable";

function sanitizeDatabaseUrl(raw: string | undefined) {
  if (!raw) {
    return "";
  }

  let value = raw.trim();

  // Allow platforms where users mistakenly paste `DATABASE_URL=...` into the value field.
  if (value.startsWith("DATABASE_URL=")) {
    value = value.slice("DATABASE_URL=".length).trim();
  }

  // Strip matching wrapping quotes.
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
  if (hardcoded) {
    return hardcoded;
  }

  const direct = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  if (direct) {
    return direct;
  }

  const fallbackNamed = sanitizeDatabaseUrl(process.env.POSTGRES_URL || process.env.POSTGRESQL_URL);
  if (fallbackNamed) {
    return fallbackNamed;
  }

  // Handle platforms that accidentally store the key with hidden/trailing characters.
  const matchingKey = Object.keys(process.env).find((key) => key.trim().toUpperCase() === "DATABASE_URL");
  if (!matchingKey) {
    return "";
  }

  return sanitizeDatabaseUrl(process.env[matchingKey]);
}

const sanitizedDatabaseUrl = resolveDatabaseUrlFromEnv();
if (sanitizedDatabaseUrl) {
  process.env.DATABASE_URL = sanitizedDatabaseUrl;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs"
  },
  datasource: {
    url: sanitizedDatabaseUrl || env("DATABASE_URL")
  }
});
