import { NextResponse } from "next/server";
import { createVaultAsset, listVaultAssets } from "@/lib/workflows";

export async function GET() {
  return NextResponse.json({ items: listVaultAssets() });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const item = createVaultAsset(payload);
  return NextResponse.json({ item }, { status: 201 });
}
