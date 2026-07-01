import type { DbFile } from "@/app/lib/agentTypes";

const PROJECT_ID = "e2e-landing-test";

function file(
  path: string,
  content: string,
  sortOrder: number
): DbFile {
  return {
    id: `e2e-${path}`,
    project_id: PROJECT_ID,
    file_path: path,
    file_name: path.split("/").pop() ?? path,
    content,
    status: "done",
    score: 95,
    rounds_taken: 1,
    sort_order: sortOrder,
    created_at: new Date().toISOString(),
  };
}

const HERO = `import React from "react";

export default function Hero() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Welcome</p>
      <h1 className="mt-4 text-4xl font-bold text-gray-900 md:text-5xl">
        RefineAI Landing Page
      </h1>
      <p className="mt-3 max-w-md text-gray-600">
        Small landing page used for end-to-end preview tests.
      </p>
      <button
        type="button"
        className="mt-8 rounded-full bg-yellow-400 px-8 py-3 font-semibold text-gray-900 shadow hover:bg-yellow-300"
      >
        Get Started
      </button>
    </main>
  );
}
`;

const APP = `import React from "react";
import Hero from "./Hero";

export default function App() {
  return <Hero />;
}
`;

/** Minimal React + Tailwind landing page fixture for e2e preview tests. */
export const landingPageProjectFiles: DbFile[] = [
  file("src/Hero.js", HERO, 0),
  file("src/App.js", APP, 1),
];
