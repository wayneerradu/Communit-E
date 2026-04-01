import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { updatePlatformServices } from "@/lib/platform-store";

const execFileAsync = promisify(execFile);

const schema = z.object({
  serviceIds: z.array(z.string()).min(1)
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceIds } = schema.parse(await request.json());
  const now = new Date().toISOString();
  const allowControl = process.env.ALLOW_SERVICE_CONTROL === "true";

  if (allowControl && process.env.SERVICE_RESTART_COMMAND) {
    const args = serviceIds;
    await execFileAsync(process.env.SERVICE_RESTART_COMMAND, args, { windowsHide: true });
  }

  const restarted = await updatePlatformServices((current) =>
    current.map((service) =>
      serviceIds.includes(service.id)
        ? { ...service, lastRestartAt: now, status: "healthy" }
        : service
    )
  );

  return NextResponse.json({
    ok: true,
    restarted: restarted.filter((service) => serviceIds.includes(service.id)),
    message: allowControl
      ? "Service restart command executed."
      : "Service restart recorded. Set ALLOW_SERVICE_CONTROL=true and SERVICE_RESTART_COMMAND to execute real restarts."
  });
}
