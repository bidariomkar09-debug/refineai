import fs from "fs/promises";
import path from "path";
import { mergePackageJson } from "./previewScaffold";

const PACKAGE_IMPORTS: Record<string, string> = {
  "next-auth": "next-auth",
  "next-auth/react": "next-auth",
  yup: "yup",
  zod: "zod",
  axios: "axios",
  "date-fns": "date-fns",
  uuid: "uuid",
  lodash: "lodash",
  "react-hook-form": "react-hook-form",
};

const EXTRA_DEPS: Record<string, string> = {
  "next-auth": "^4.24.11",
  yup: "^1.4.0",
  zod: "^3.24.1",
  axios: "^1.7.9",
  "date-fns": "^4.1.0",
  uuid: "^11.0.3",
  lodash: "^4.17.21",
  "react-hook-form": "^7.54.2",
};

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(full)));
    } else if (/\.(tsx?|jsx?|mjs)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function extractImports(source: string): string[] {
  const imports: string[] = [];
  const re = /(?:import|from)\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function needsUseClient(source: string): boolean {
  if (source.includes('"use client"') || source.includes("'use client'")) return false;
  return (
    /\buse(State|Effect|Callback|Memo|Ref|Context|Reducer|Session)\b/.test(source) ||
    /\bon(Click|Change|Submit|KeyDown|KeyUp)\s*=/.test(source) ||
    /from\s+['"]next-auth\/react['"]/.test(source)
  );
}

function usesNextAuth(files: Map<string, string>): boolean {
  for (const source of Array.from(files.values())) {
    if (/next-auth/.test(source)) return true;
  }
  return false;
}

function collectApiStubExports(source: string): string[] {
  const names: string[] = [];
  const importRe = /import\s+\{([^}]+)\}\s+from\s+['"][^'"]*\/api['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRe.exec(source)) !== null) {
    for (const part of match[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name) names.push(name);
    }
  }
  return names;
}

function stubForExport(name: string): string {
  if (/fetch/i.test(name)) {
    return `export async function ${name}(...args: unknown[]) {
  console.log("[preview] ${name}", args);
  return { tasksSummary: "Preview tasks", scheduleSummary: "Preview schedule", data: [] };
}`;
  }
  return `export function ${name}(...args: unknown[]) {
  console.log("[preview] ${name}", args);
  return null;
}`;
}

const APP_ROUTE_STUB = `import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ preview: true, message: "Preview API stub" });
}

export async function POST() {
  return NextResponse.json({ preview: true, ok: true });
}

export async function PUT() {
  return NextResponse.json({ preview: true, ok: true });
}

export async function DELETE() {
  return NextResponse.json({ preview: true, ok: true });
}
`;

async function normalizeEnvFile(projectDir: string): Promise<void> {
  const envPath = path.join(projectDir, ".env.local");
  try {
    let content = await fs.readFile(envPath, "utf-8");
    const lines = content.split("\n");
    const map = new Map<string, string>();
    for (const line of lines) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) map.set(m[1], m[2]);
    }
    if (!map.has("SUPABASE_URL") && map.has("NEXT_PUBLIC_SUPABASE_URL")) {
      content += `\nSUPABASE_URL=${map.get("NEXT_PUBLIC_SUPABASE_URL")}\n`;
    }
    if (!map.has("SUPABASE_ANON_KEY") && map.has("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
      content += `\nSUPABASE_ANON_KEY=${map.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")}\n`;
    }
    if (!map.has("NEXTAUTH_SECRET")) {
      content += `\nNEXTAUTH_SECRET=preview-dev-secret\n`;
    }
    if (!map.has("NEXTAUTH_URL")) {
      content += `\nNEXTAUTH_URL=http://localhost:3001\n`;
    }
    await fs.writeFile(envPath, content, "utf-8");
  } catch {
    // optional
  }
}

async function injectProviders(projectDir: string): Promise<void> {
  const providersPath = path.join(projectDir, "app", "providers.tsx");
  const layoutPath = path.join(projectDir, "app", "layout.tsx");

  await fs.writeFile(
    providersPath,
    `"use client";

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      session={{
        user: { id: "preview-user", name: "Preview User", email: "preview@local.dev" },
        expires: "2099-01-01T00:00:00.000Z",
      }}
    >
      {children}
    </SessionProvider>
  );
}
`,
    "utf-8"
  );

  try {
    let layout = await fs.readFile(layoutPath, "utf-8");
    if (!layout.includes("Providers")) {
      if (!layout.includes('import Providers from "./providers"')) {
        layout = `import Providers from "./providers";\n${layout}`;
      }
      layout = layout.replace(
        /(<body[^>]*>)/,
        "$1\n        <Providers>"
      );
      layout = layout.replace(/(<\/body>)/, "\n        </Providers>\n      $1");
    }
    await fs.writeFile(layoutPath, layout, "utf-8");
  } catch {
    await fs.writeFile(
      layoutPath,
      `import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Preview App",
  description: "Generated by RefineAI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
`,
      "utf-8"
    );
  }
}

export async function fixPreviewProject(projectDir: string): Promise<void> {
  const filePaths = await walkFiles(projectDir);
  const sources = new Map<string, string>();
  const neededPackages = new Set<string>();
  const apiExports = new Set<string>();

  for (const filePath of filePaths) {
    const rel = path.relative(projectDir, filePath).replace(/\\/g, "/");
    const source = await fs.readFile(filePath, "utf-8");
    sources.set(rel, source);

    for (const imp of extractImports(source)) {
      if (PACKAGE_IMPORTS[imp]) neededPackages.add(PACKAGE_IMPORTS[imp]);
    }
    for (const name of collectApiStubExports(source)) {
      apiExports.add(name);
    }
  }

  for (const [rel, source] of Array.from(sources.entries())) {
    if (!rel.endsWith(".tsx") && !rel.endsWith(".jsx")) continue;
    if (needsUseClient(source)) {
      const updated = `"use client";\n\n${source.replace(/^["']use client["'];\s*/i, "")}`;
      await fs.writeFile(path.join(projectDir, rel), updated, "utf-8");
    }
  }

  for (const [rel, source] of Array.from(sources.entries())) {
    if (!rel.endsWith("/route.ts") && rel !== "route.ts") continue;
    if (/NextApiRequest|NextApiResponse|pages\/api/.test(source)) {
      await fs.writeFile(path.join(projectDir, rel), APP_ROUTE_STUB, "utf-8");
    }
  }

  if (apiExports.size > 0) {
    const stubBody = Array.from(apiExports).map(stubForExport).join("\n\n");
    await fs.writeFile(
      path.join(projectDir, "app", "api.ts"),
      `${stubBody}\n`,
      "utf-8"
    );
  }

  if (usesNextAuth(sources)) {
    neededPackages.add("next-auth");
    await injectProviders(projectDir);
  }

  await normalizeEnvFile(projectDir);

  const pkgPath = path.join(projectDir, "package.json");
  try {
    const raw = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(mergePackageJson(raw)) as {
      dependencies?: Record<string, string>;
    };
    pkg.dependencies = pkg.dependencies ?? {};
    for (const pkgName of Array.from(neededPackages)) {
      if (!pkg.dependencies[pkgName] && EXTRA_DEPS[pkgName]) {
        pkg.dependencies[pkgName] = EXTRA_DEPS[pkgName];
      }
    }
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");
  } catch {
    // scaffold will handle
  }

  const nextDir = path.join(projectDir, ".next");
  await fs.rm(nextDir, { recursive: true, force: true }).catch(() => {});
}
