import type { SessionUser } from "@/types/domain";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { toSessionUser } from "@/lib/identity";

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
      role: user.role
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
        role: sessionUser.role
      },
      create: {
        email: sessionUser.email,
        name: sessionUser.name,
        role: sessionUser.role
      }
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    } satisfies SessionUser;
  } catch {
    return sessionUser;
  }
}
