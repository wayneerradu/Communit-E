import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { updatePlatformSettings } from "@/lib/platform-store";

const schema = z.object({
  modeEnabled: z.boolean(),
  bannerMessage: z.string().min(5),
  allowSuperAdminAccessOnly: z.boolean()
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = schema.parse(await request.json());
  const now = new Date().toISOString();
  const settings = await updatePlatformSettings((current) => ({
    ...current,
    maintenance: {
      ...payload,
      lastUpdatedAt: now
    },
    updatedAt: now
  }));

  return NextResponse.json({
    ok: true,
    item: settings.maintenance
  });
}
