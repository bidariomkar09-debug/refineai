import { NextResponse } from "next/server";
import packageJson from "@/package.json";

export const dynamic = "force-dynamic";

export async function GET() {
  const buildId =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_DEPLOYMENT_ID ??
    packageJson.version;

  return NextResponse.json(
    {
      version: packageJson.version,
      buildId,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
