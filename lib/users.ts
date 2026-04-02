import type { Role, SessionUser } from "@/types/domain";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { toSessionUser } from "@/lib/identity";

// The domain Role type includes "RESIDENT" for legacy reasons, but the Prisma
// schema only stores admin-facing roles. Map any unknown/legacy value to ADMIN.
type PrismaRole = "SUPER_ADMIN" | "ADMIN" | "PRO";

function toPrismaRole(role: Role): PrismaRole {
  if (role === "SUPER_ADMIN" || role === "PRO") return role;
  return "ADMIN"; // covers "ADMIN" and legacy "RESIDENT"
}

function toDomainRole(role: string): Role {
  if (role === "SUPER_ADMIN" || role === "PRO") return role;
  return "ADMIN";
}

export async function findUserByEmail(email: string): Promise<SessionUser | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: toDomainRole(user.role)
    };
  } catch {
    return null;
  }
}

export async function upsertWorkspaceUser(email: string, name?: string) {
  const sessionUser = toSessionUser(email, name);

  if (!isDatabaseConfigured()) {
    return sessionUser;
  }

  try {
    const user = await prisma.user.upsert({
      where: { email: sessionUser.email },
      update: {
        name: sessionUser.name,
        role: toPrismaRole(sessionUser.role)
      },
      create: {
        email: sessionUser.email,
        name: sessionUser.name,
        role: toPrismaRole(sessionUser.role)
      }
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: toDomainRole(user.role)
    } satisfies SessionUser;
  } catch {
    return sessionUser;
  }
}
