import { LOOPMODEL_PUBLIC_MODELS } from "@/app/lib/loopmodelApi";

export async function GET() {
  return Response.json({
    object: "list",
    data: LOOPMODEL_PUBLIC_MODELS.map((m) => ({
      id: m.id,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "loopmodel",
    })),
  });
}
