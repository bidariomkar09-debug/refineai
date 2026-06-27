"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

type CodeBlockProps = {
  code: string;
  language?: string;
  maxHeight?: string;
};

const PrismHighlighter = dynamic(
  () =>
    import("react-syntax-highlighter/dist/esm/prism-light").then(async (mod) => {
      const { default: tsx } = await import(
        "react-syntax-highlighter/dist/esm/languages/prism/tsx"
      );
      const { default: typescript } = await import(
        "react-syntax-highlighter/dist/esm/languages/prism/typescript"
      );
      const { default: javascript } = await import(
        "react-syntax-highlighter/dist/esm/languages/prism/javascript"
      );
      const { default: css } = await import(
        "react-syntax-highlighter/dist/esm/languages/prism/css"
      );
      const { default: sql } = await import(
        "react-syntax-highlighter/dist/esm/languages/prism/sql"
      );
      const { default: json } = await import(
        "react-syntax-highlighter/dist/esm/languages/prism/json"
      );
      const { default: markdown } = await import(
        "react-syntax-highlighter/dist/esm/languages/prism/markdown"
      );

      mod.default.registerLanguage("tsx", tsx);
      mod.default.registerLanguage("typescript", typescript);
      mod.default.registerLanguage("javascript", javascript);
      mod.default.registerLanguage("css", css);
      mod.default.registerLanguage("sql", sql);
      mod.default.registerLanguage("json", json);
      mod.default.registerLanguage("markdown", markdown);

      return mod.default;
    }),
  { ssr: false }
);

function detectLanguage(path: string): string {
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx") || path.endsWith(".js")) return "javascript";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".sql")) return "sql";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  return "typescript";
}

function PlainCode({ code, maxHeight }: { code: string; maxHeight: string }) {
  return (
    <pre
      className="overflow-auto bg-[#0d1117] p-4 font-mono text-xs leading-relaxed text-gray-300"
      style={{ maxHeight }}
    >
      {code}
    </pre>
  );
}

export default function CodeBlock({
  code,
  language,
  maxHeight = "400px",
}: CodeBlockProps) {
  const lang = language ?? "typescript";
  const displayCode = code || "// Waiting for code...";
  const [style, setStyle] = useState<Record<string, React.CSSProperties> | null>(
    null
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    import("react-syntax-highlighter/dist/esm/styles/prism").then((mod) => {
      setStyle(mod.oneDark);
    });
  }, []);

  if (!mounted || !style) {
    return (
      <div className="overflow-hidden rounded-lg border border-surface-border">
        <PlainCode code={displayCode} maxHeight={maxHeight} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-surface-border">
      <PrismHighlighter
        language={lang}
        style={style}
        customStyle={{
          margin: 0,
          maxHeight,
          fontSize: "12px",
          background: "#0d1117",
        }}
        showLineNumbers
      >
        {displayCode}
      </PrismHighlighter>
    </div>
  );
}

export { detectLanguage };
