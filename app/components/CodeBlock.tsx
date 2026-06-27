"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useRef } from "react";

type CodeBlockProps = {
  code: string;
  language?: string;
  maxHeight?: string;
  mobile?: boolean;
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
  mobile = false,
}: CodeBlockProps) {
  const lang = language ?? "typescript";
  const displayCode = code || "// Waiting for code...";
  const fullHeight = maxHeight === "100%";
  const [style, setStyle] = useState<Record<string, React.CSSProperties> | null>(
    null
  );
  const [mounted, setMounted] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(!mobile);
  const lastTap = useRef(0);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setZoomed((z) => !z);
    }
    lastTap.current = now;
  };

  useEffect(() => {
    setMounted(true);
    import("react-syntax-highlighter/dist/esm/styles/prism").then((mod) => {
      setStyle(mod.oneDark);
    });
  }, []);

  const wrapperClass = fullHeight
    ? "h-full overflow-x-auto overflow-y-hidden rounded-lg border border-surface-border"
    : "overflow-x-auto overflow-hidden rounded-lg border border-surface-border";

  const fontSize = mobile ? (zoomed ? "14px" : "13px") : "12px";

  if (!mounted || !style) {
    return (
      <div className={wrapperClass} onClick={mobile ? handleDoubleTap : undefined}>
        {mobile && (
          <button
            type="button"
            onClick={() => setShowLineNumbers((v) => !v)}
            className="touch-target mb-2 rounded px-2 py-1 text-[10px] text-gray-400"
          >
            {showLineNumbers ? "Hide lines" : "Show lines"}
          </button>
        )}
        <PlainCode
          code={displayCode}
          maxHeight={fullHeight ? "100%" : maxHeight}
        />
      </div>
    );
  }

  return (
    <div className={wrapperClass} onClick={mobile ? handleDoubleTap : undefined}>
      {mobile && (
        <button
          type="button"
          onClick={() => setShowLineNumbers((v) => !v)}
          className="touch-target mb-2 rounded px-2 py-1 text-[10px] text-gray-400"
        >
          {showLineNumbers ? "Hide lines" : "Show lines"}
        </button>
      )}
      <PrismHighlighter
        language={lang}
        style={style}
        customStyle={{
          margin: 0,
          maxHeight: fullHeight ? "100%" : maxHeight,
          height: fullHeight ? "100%" : undefined,
          fontSize,
          background: "#0d1117",
          overflowX: "auto",
        }}
        showLineNumbers={showLineNumbers}
      >
        {displayCode}
      </PrismHighlighter>
    </div>
  );
}

export { detectLanguage };
