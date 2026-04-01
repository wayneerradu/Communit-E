import { NextResponse } from "next/server";
import { z } from "zod";
import { setSessionUser } from "@/lib/auth";
import { LOCAL_SUPERADMIN_EMAIL, isLocalSuperAdminLogin } from "@/lib/dev-auth";
import { isAllowedWorkspaceEmail, toSessionUser } from "@/lib/identity";
import { findUserByEmail } from "@/lib/users";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(request: Request) {
  const payload = schema.parse(await request.json());
  const normalizedEmail = payload.email.trim().toLowerCase();
  const isLocalSuperAdmin = isLocalSuperAdminLogin(normalizedEmail, payload.password);

  if (!isAllowedWorkspaceEmail(normalizedEmail) && !isLocalSuperAdmin) {
    return NextResponse.json({ error: "This email domain is not allowed." }, { status: 403 });
  }

  const user = await findUserByEmail(normalizedEmail);
  const bootstrapPassword = process.env.BOOTSTRAP_LOGIN_PASSWORD;

  if (isLocalSuperAdmin) {
    const localSuperAdmin = {
      id: "local-super-admin",
      email: LOCAL_SUPERADMIN_EMAIL,
      name: "Local Super Admin",
      role: "SUPER_ADMIN" as const
    };

    await setSessionUser(localSuperAdmin, request.headers.get("user-agent") ?? undefined);

    return NextResponse.json({
      ok: true,
      user: {
        email: localSuperAdmin.email,
        role: localSuperAdmin.role
      }
    });
  }

  if (user && process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Password login is disabled outside development. Use Google sign-in." },
      { status: 403 }
    );
  }

  if (bootstrapPassword && payload.password !== bootstrapPassword) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  if (!user && !bootstrapPassword) {
    return NextResponse.json(
      { error: "Password login is not configured. Use Google sign-in or set BOOTSTRAP_LOGIN_PASSWORD for development." },
      { status: 400 }
    );
  }

  await setSessionUser(user ?? toSessionUser(normalizedEmail), request.headers.get("user-agent") ?? undefined);

  return NextResponse.json({
    ok: true,
    user: {
      email: user?.email ?? normalizedEmail,
      role: (user ?? toSessionUser(normalizedEmail)).role
    }
  });
}
