import { NextRequest, NextResponse } from "next/server";
import {
  createLoopModelApiKey,
  createLoopModelDeveloper,
  getLoopModelApiKeys,
  getLoopModelDashboard,
  getLoopModelDevelopers,
  getOrCreateDefaultDeveloper,
  revokeLoopModelApiKey,
} from "@/app/lib/db";
import { generateApiKey } from "@/app/lib/loopmodelApi";

export async function GET() {
  try {
    const [dashboard, keys, developers] = await Promise.all([
      getLoopModelDashboard(),
      getLoopModelApiKeys(),
      getLoopModelDevelopers(),
    ]);
    return NextResponse.json({ dashboard, keys, developers });
  } catch {
    return NextResponse.json({
      dashboard: null,
      keys: [],
      developers: [],
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "create_key") {
      let developerId = body.developer_id as string | undefined;
      if (!developerId) {
        if (body.email && body.name) {
          const dev = await createLoopModelDeveloper({
            name: body.name,
            email: body.email,
            plan: body.plan ?? "free",
          });
          developerId = dev.id;
        } else {
          const dev = await getOrCreateDefaultDeveloper();
          developerId = dev.id;
        }
      }

      const { key, prefix, hash } = generateApiKey();
      const record = await createLoopModelApiKey({
        developer_id: developerId,
        key_prefix: prefix,
        key_hash: hash,
        name: typeof body.name === "string" ? body.name : "Production",
      });

      return NextResponse.json({
        key,
        record,
        message: "Copy this key now — it won't be shown again.",
      });
    }

    if (action === "revoke_key" && typeof body.keyId === "string") {
      await revokeLoopModelApiKey(body.keyId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
