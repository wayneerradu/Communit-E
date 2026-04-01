import "dotenv/config";
import { defineConfig, env } from "prisma/config";

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

const sanitizedDatabaseUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL);

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
