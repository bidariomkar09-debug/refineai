import { NextRequest, NextResponse } from "next/server";
import { activateModelProvider, getModelProviders } from "@/app/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const providers = await getModelProviders();
    if (!providers.some((p) => p.id === id)) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }
    const provider = await activateModelProvider(id);
    return NextResponse.json({
      provider: { ...provider, api_key_encrypted: provider.api_key_encrypted ? "••••••••" : null },
    });
  } catch {
    return NextResponse.json({ error: "Activation failed" }, { status: 500 });
  }
}
