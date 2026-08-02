#!/usr/bin/env node
/**
 * Verifies which production schema columns/tables the app needs.
 * Usage: node scripts/verify-schema-gap.mjs
 */
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const sb = createClient(url, key);

async function probe(label, fn) {
  try {
    await fn();
    console.log(`PASS  ${label}`);
    return true;
  } catch (e) {
    console.log(`FAIL  ${label} — ${e.message || e}`);
    return false;
  }
}

(async () => {
  let fails = 0;

  const checks = [
    ["files.runtime_verified", () => sb.from("files").select("runtime_verified").limit(1)],
    ["files.ai_score", () => sb.from("files").select("ai_score").limit(1)],
    ["projects.build_checkpoint", () => sb.from("projects").select("build_checkpoint").limit(1)],
    ["user_settings.personal_memory", () => sb.from("user_settings").select("personal_memory").limit(1)],
    ["user_settings.dogfood_log", () => sb.from("user_settings").select("dogfood_log").limit(1)],
    ["messages.mode", () => sb.from("messages").select("mode").limit(1)],
    [
      "stats query (score + runtime_verified)",
      () =>
        sb.from("files").select("score, runtime_verified").eq("status", "done").limit(1),
    ],
  ];

  for (const [label, fn] of checks) {
    const ok = await probe(label, async () => {
      const { error } = await fn();
      if (error) throw new Error(error.message);
    });
    if (!ok) fails++;
  }

  console.log(
    fails
      ? `\n${fails} gap(s). Paste supabase/PENDING_PRODUCTION.sql into Supabase SQL Editor.`
      : "\nSchema OK — no gaps detected."
  );
  process.exit(fails ? 1 : 0);
})();
