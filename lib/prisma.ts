import { PrismaClient } from "@prisma/client";

declare global {
  var __communitEPrisma: PrismaClient | undefined;
}

export function isDatabaseConfigured() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return false;
  }

  if (process.env.NODE_ENV !== "production" && url.includes("@db:5432")) {
    return false;
  }

  return true;
}

export const prisma =
  global.__communitEPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.__communitEPrisma = prisma;
}
