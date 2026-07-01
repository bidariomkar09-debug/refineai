import { NextResponse } from "next/server";
import { maskSecret } from "@/app/lib/personalization";
import packageJson from "@/package.json";

export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const openaiModel = process.env.OPENAI_MODEL ?? "gpt-4o";

  return NextResponse.json({
    openaiKey: openaiKey ? maskSecret(openaiKey) : null,
    supabaseUrl: supabaseUrl ? maskSecret(supabaseUrl, 8, 8) : null,
    supabaseAnonKey: supabaseAnonKey ? maskSecret(supabaseAnonKey, 4, 4) : null,
    openaiModel,
    appVersion: packageJson.version,
    packageId: "com.refineai.app",
  });
}
