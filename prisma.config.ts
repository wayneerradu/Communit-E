import "dotenv/config";
import { defineConfig, env } from "prisma/config";

function sanitizeDatabaseUrl(raw: string | undefined) {
  if (!raw) {
    return "";
  }

  let value = raw
    // Remove hidden control/zero-width chars that can appear from copy/paste in cloud UIs.
    .replace(/[\u0000-\u001f\u007f\u200b\u200c\u200d\u2060\ufeff]/g, "")
    .trim();

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
  const appSpecific = sanitizeDatabaseUrl(process.env.APP_DATABASE_URL);
  if (appSpecific) {
    return appSpecific;
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
