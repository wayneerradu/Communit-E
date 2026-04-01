import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  const payload = schema.parse(await request.json());

  return NextResponse.json({
    ok: true,
    message: `Password reset instructions would be sent to ${payload.email} via the configured mail provider.`
  });
}
