import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getConfiguredWorkspaceUsers } from "@/lib/identity";
import { readAllUserProfiles } from "@/lib/user-profile-store";

type AdminOption = {
  email: string;
  name: string;
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await readAllUserProfiles();
  const merged = new Map<string, AdminOption>();

  for (const profile of profiles) {
    const email = profile.email?.trim().toLowerCase();
    if (!email) continue;
    merged.set(email, {
      email,
      name: profile.fullName?.trim() || email
    });
  }

  for (const configured of getConfiguredWorkspaceUsers()) {
    const email = configured.email.trim().toLowerCase();
    if (!merged.has(email)) {
      merged.set(email, { email, name: configured.name });
    }
  }

  const currentEmail = user.email.trim().toLowerCase();
  if (!merged.has(currentEmail)) {
    merged.set(currentEmail, { email: currentEmail, name: user.name });
  }

  const items = Array.from(merged.values()).sort((left, right) => left.name.localeCompare(right.name));
  return NextResponse.json({ items });
}
