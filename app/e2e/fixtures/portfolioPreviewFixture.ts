import type { DbFile } from "@/app/lib/agentTypes";

const PROJECT_ID = "e2e-portfolio-preview";

function file(path: string, content: string, order: number): DbFile {
  return {
    id: `e2e-${path}`,
    project_id: PROJECT_ID,
    file_path: path,
    file_name: path.split("/").pop() ?? path,
    content,
    status: "done",
    score: 95,
    rounds_taken: 1,
    sort_order: order,
    created_at: new Date().toISOString(),
  };
}

export const portfolioPreviewFiles: DbFile[] = [
  file(
    "src/App.js",
    `export default function App() { return <h1>Hello world</h1>; }`,
    0
  ),
  file(
    "src/components/Hero.js",
    `import React from 'react';
import './Hero.css';
export default function Hero() {
  return <section className="p-8"><h1 className="text-4xl font-bold">I'M OMKAR BIDARI</h1></section>;
}`,
    1
  ),
  file(
    "src/components/About.js",
    `export default function About() {
  return <section className="p-8"><h2>About Omkar Bidari</h2></section>;
}`,
    2
  ),
];
