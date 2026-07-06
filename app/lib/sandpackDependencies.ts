/** Known npm packages for Sandpack preview — scan imports and add to bundle. */
export const KNOWN_SANDPACK_DEPS: Record<string, string> = {
  react: "^18.2.0",
  "react-dom": "^18.2.0",
  "react-icons": "^5.0.0",
  "lucide-react": "^0.300.0",
  "framer-motion": "^11.0.0",
  "react-router-dom": "^6.22.0",
  clsx: "^2.1.0",
  axios: "^1.6.0",
  "@mui/material": "^5.15.0",
  "@mui/icons-material": "^5.15.0",
};

const IMPORT_RE =
  /(?:import\s+(?:[\w*{}\s,]+\s+from\s+)?|require\s*\(\s*)['"]([^'"]+)['"]/g;

function packageName(specifier: string): string {
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split("/")[0];
}

export function collectSandpackDependencies(
  files: Record<string, string>
): Record<string, string> {
  const deps: Record<string, string> = {
    react: KNOWN_SANDPACK_DEPS.react,
    "react-dom": KNOWN_SANDPACK_DEPS["react-dom"],
  };

  const allContent = Object.values(files).join("\n");
  IMPORT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMPORT_RE.exec(allContent)) !== null) {
    const spec = match[1];
    if (spec.startsWith(".") || spec.startsWith("/")) continue;
    const pkg = packageName(spec);
    if (KNOWN_SANDPACK_DEPS[pkg]) {
      deps[pkg] = KNOWN_SANDPACK_DEPS[pkg];
    }
  }

  return deps;
}

export function getMissingNpmDependencies(
  files: Record<string, string>
): string[] {
  const collected = new Set(Object.keys(collectSandpackDependencies(files)));
  const missing: string[] = [];
  const allContent = Object.values(files).join("\n");

  IMPORT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMPORT_RE.exec(allContent)) !== null) {
    const spec = match[1];
    if (spec.startsWith(".") || spec.startsWith("/")) continue;
    const pkg = packageName(spec);
    if (pkg === "react" || pkg === "react-dom") continue;
    if (!KNOWN_SANDPACK_DEPS[pkg] && !collected.has(pkg)) {
      if (!missing.includes(pkg)) missing.push(pkg);
    }
  }

  return missing;
}
