import { NextRequest, NextResponse } from "next/server";
import {
  createModelProvider,
  deleteModelProvider,
  getModelProviders,
  getProviderCostStats,
  updateModelProvider,
} from "@/app/lib/db";
import { encodeApiKey } from "@/app/lib/modelProviders";

export async function GET() {
  try {
    const [providers, stats] = await Promise.all([getModelProviders(), getProviderCostStats()]);
    const safeProviders = providers.map((p) => ({
      ...p,
      api_key_encrypted: p.api_key_encrypted ? "••••••••" : null,
    }));
    return NextResponse.json({ providers: safeProviders, stats });
  } catch {
    return NextResponse.json({ providers: [], stats: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const provider = await createModelProvider({
      provider_name: String(body.provider_name ?? "Self-Hosted Model"),
      provider_type: body.provider_type ?? "custom",
      endpoint_url: body.endpoint_url ?? null,
      api_key_encrypted: body.api_key ? encodeApiKey(body.api_key) : null,
      model_name: body.model_name ?? null,
      cost_per_1k_tokens: typeof body.cost_per_1k_tokens === "number" ? body.cost_per_1k_tokens : 0.002,
    });
    return NextResponse.json({
      provider: { ...provider, api_key_encrypted: provider.api_key_encrypted ? "••••••••" : null },
    });
  } catch {
    return NextResponse.json({ error: "Failed to create provider" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const partial: Parameters<typeof updateModelProvider>[1] = {};
    if (typeof body.provider_name === "string") partial.provider_name = body.provider_name;
    if (typeof body.endpoint_url === "string") partial.endpoint_url = body.endpoint_url;
    if (typeof body.model_name === "string") partial.model_name = body.model_name;
    if (typeof body.cost_per_1k_tokens === "number") partial.cost_per_1k_tokens = body.cost_per_1k_tokens;
    if (typeof body.api_key === "string" && body.api_key) {
      partial.api_key_encrypted = encodeApiKey(body.api_key);
    }

    const provider = await updateModelProvider(id, partial);
    return NextResponse.json({
      provider: { ...provider, api_key_encrypted: provider.api_key_encrypted ? "••••••••" : null },
    });
  } catch {
    return NextResponse.json({ error: "Failed to update provider" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteModelProvider(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete provider" }, { status: 500 });
  }
}
