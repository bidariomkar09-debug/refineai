import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      openai: openaiConfigured ? "configured" : "missing",
      supabase: "missing_env",
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from("sessions").select("id").limit(1);

    return NextResponse.json({
      openai: openaiConfigured ? "configured" : "missing",
      supabase: error ? "error" : "ok",
      supabaseError: error?.message ?? null,
    });
  } catch (err) {
    return NextResponse.json({
      openai: openaiConfigured ? "configured" : "missing",
      supabase: "error",
      supabaseError: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
