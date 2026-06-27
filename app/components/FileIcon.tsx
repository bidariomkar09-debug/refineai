"use client";

type FileIconProps = {
  filePath: string;
  className?: string;
};

function getExtension(path: string): string {
  const parts = path.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export default function FileIcon({ filePath, className = "h-4 w-4 shrink-0" }: FileIconProps) {
  const ext = getExtension(filePath);

  if (ext === "tsx" || ext === "jsx") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="#61dafb" strokeWidth="1.5" />
        <ellipse cx="8" cy="8" rx="2.5" ry="6" stroke="#61dafb" strokeWidth="1" />
        <path d="M2 8h12" stroke="#61dafb" strokeWidth="1" />
        <path d="M3.5 5h9M3.5 11h9" stroke="#61dafb" strokeWidth="0.75" />
      </svg>
    );
  }

  if (ext === "ts" || ext === "js") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="12" height="12" rx="2" fill="#3178c6" fillOpacity="0.2" />
        <text x="8" y="11" textAnchor="middle" fill="#3178c6" fontSize="7" fontWeight="bold" fontFamily="system-ui">
          TS
        </text>
      </svg>
    );
  }

  if (ext === "sql") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <ellipse cx="8" cy="5" rx="5" ry="2" stroke="#f59e0b" strokeWidth="1.25" />
        <path d="M3 5v4c0 1.1 2.24 2 5 2s5-.9 5-2V5" stroke="#f59e0b" strokeWidth="1.25" />
        <path d="M3 9v2c0 1.1 2.24 2 5 2s5-.9 5-2V9" stroke="#f59e0b" strokeWidth="1.25" />
      </svg>
    );
  }

  if (ext === "md") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="3" y="2" width="10" height="12" rx="1" stroke="#9ca3af" strokeWidth="1.25" />
        <path d="M5 6h6M5 8.5h4M5 11h5" stroke="#9ca3af" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }

  if (ext === "css") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 2l1.5 10.5L8 14l3.5-1.5L13 2H3z" stroke="#a855f7" strokeWidth="1.25" strokeLinejoin="round" />
      </svg>
    );
  }

  if (ext === "json") {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="3" y="2" width="10" height="12" rx="1" stroke="#eab308" strokeWidth="1.25" />
        <text x="8" y="11" textAnchor="middle" fill="#eab308" fontSize="6" fontWeight="bold" fontFamily="monospace">
          {"{}"}
        </text>
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 2h5l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"
        stroke="#6b7280"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path d="M9 2v3h3" stroke="#6b7280" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

export function FolderIcon({ open, className = "h-4 w-4 shrink-0" }: { open: boolean; className?: string }) {
  if (open) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M2 5.5V12a1 1 0 001 1h10a1 1 0 001-1V6a1 1 0 00-1-1H8L6.5 3.5H3A1 1 0 002 4.5V5.5z"
          fill="#3b82f6"
          fillOpacity="0.25"
          stroke="#3b82f6"
          strokeWidth="1"
        />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 5V12a1 1 0 001 1h10a1 1 0 001-1V6a1 1 0 00-1-1H7L5.5 3.5H3A1 1 0 002 4v1z"
        fill="#6b7280"
        fillOpacity="0.2"
        stroke="#6b7280"
        strokeWidth="1"
      />
    </svg>
  );
}
