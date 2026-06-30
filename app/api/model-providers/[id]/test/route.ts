import { NextRequest, NextResponse } from "next/server";
import { getModelProviders } from "@/app/lib/db";
import { testProviderConnection } from "@/app/lib/modelProviders";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const providers = await getModelProviders();
    const provider = providers.find((p) => p.id === id);
    if (!provider) {
      return NextResponse.json({ ok: false, message: "Provider not found" }, { status: 404 });
    }
    const result = await testProviderConnection(provider);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, message: "Test failed" }, { status: 500 });
  }
}
