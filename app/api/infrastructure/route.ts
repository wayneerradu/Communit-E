import { NextResponse } from "next/server";
import { createInfrastructureAsset, listInfrastructureAssets } from "@/lib/workflows";

export async function GET() {
  return NextResponse.json({ items: listInfrastructureAssets() });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const item = createInfrastructureAsset(payload);
  return NextResponse.json({ item }, { status: 201 });
}
