import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(12),
  password: z.string().min(8)
});

export async function POST(request: Request) {
  schema.parse(await request.json());

  return NextResponse.json({
    ok: true,
    message: "Password reset accepted. Persist the new hash in the user store when the live repository is connected."
  });
}
