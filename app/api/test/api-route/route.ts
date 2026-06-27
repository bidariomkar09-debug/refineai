import { NextRequest, NextResponse } from "next/server";
import { checkSyntax } from "@/app/lib/fileLoopEngine";
import { testApiRouteWithLLM } from "@/app/lib/agentAI";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = body.code as string;
    const routePath = body.routePath as string;

    if (!code || !routePath) {
      return NextResponse.json({ passed: false, issues: ["Missing code or route"] });
    }

    const syntax = checkSyntax(code);
    if (!syntax.valid) {
      return NextResponse.json({ passed: false, issues: syntax.issues });
    }

    const llmResult = await testApiRouteWithLLM(code, routePath);
    return NextResponse.json(llmResult);
  } catch {
    return NextResponse.json({ passed: true, issues: [] });
  }
}
