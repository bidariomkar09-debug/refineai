export type ModelLabTestPrompt = {
  id: string;
  category: "react" | "api" | "database" | "css" | "documentation";
  target: string;
  filePath: string;
};

export const MODEL_LAB_TEST_SUITE: ModelLabTestPrompt[] = [
  {
    id: "react-1",
    category: "react",
    filePath: "components/PrimaryButton.tsx",
    target: "Build a React TypeScript button with loading, disabled, and aria-label props.",
  },
  {
    id: "react-2",
    category: "react",
    filePath: "components/UserCard.tsx",
    target: "Create a UserCard component showing avatar, name, role badge, and online status.",
  },
  {
    id: "react-3",
    category: "react",
    filePath: "components/SearchInput.tsx",
    target: "Build a debounced search input with clear button and keyboard navigation.",
  },
  {
    id: "react-4",
    category: "react",
    filePath: "components/Modal.tsx",
    target: "Create an accessible modal dialog with focus trap and escape-to-close.",
  },
  {
    id: "api-1",
    category: "api",
    filePath: "app/api/users/route.ts",
    target: "Build a Next.js API route for GET/POST users with Zod validation.",
  },
  {
    id: "api-2",
    category: "api",
    filePath: "app/api/auth/login/route.ts",
    target: "Create a login API route with bcrypt password check and JWT response.",
  },
  {
    id: "api-3",
    category: "api",
    filePath: "app/api/projects/[id]/route.ts",
    target: "Build a dynamic API route for fetching and updating a project by ID.",
  },
  {
    id: "api-4",
    category: "api",
    filePath: "app/api/webhooks/stripe/route.ts",
    target: "Create a Stripe webhook handler with signature verification and idempotency.",
  },
  {
    id: "db-1",
    category: "database",
    filePath: "supabase/migrations/users.sql",
    target: "Design a users table with email, role enum, timestamps, and RLS policies.",
  },
  {
    id: "db-2",
    category: "database",
    filePath: "supabase/migrations/projects.sql",
    target: "Create a projects table linked to users with status enum and soft delete.",
  },
  {
    id: "db-3",
    category: "database",
    filePath: "supabase/migrations/audit_log.sql",
    target: "Design an audit_log table for tracking entity changes with JSONB metadata.",
  },
  {
    id: "db-4",
    category: "database",
    filePath: "supabase/migrations/indexes.sql",
    target: "Add performance indexes for a multi-tenant SaaS schema with projects and files.",
  },
  {
    id: "css-1",
    category: "css",
    filePath: "styles/globals.css",
    target: "Write CSS variables for a dark theme with indigo accent and accessible contrast.",
  },
  {
    id: "css-2",
    category: "css",
    filePath: "styles/components/card.css",
    target: "Style a responsive card component with hover elevation and border radius tokens.",
  },
  {
    id: "css-3",
    category: "css",
    filePath: "styles/layout/grid.css",
    target: "Create a 12-column responsive grid utility with mobile-first breakpoints.",
  },
  {
    id: "css-4",
    category: "css",
    filePath: "styles/animations.css",
    target: "Add subtle fade-in and slide-up animations respecting prefers-reduced-motion.",
  },
  {
    id: "doc-1",
    category: "documentation",
    filePath: "README.md",
    target: "Write a README for a Next.js SaaS starter with setup, env vars, and deploy steps.",
  },
  {
    id: "doc-2",
    category: "documentation",
    filePath: "docs/API.md",
    target: "Document REST API endpoints for users, projects, and auth with example payloads.",
  },
  {
    id: "doc-3",
    category: "documentation",
    filePath: "docs/ARCHITECTURE.md",
    target: "Explain the system architecture for a RefineAI-style coding agent platform.",
  },
  {
    id: "doc-4",
    category: "documentation",
    filePath: "docs/CONTRIBUTING.md",
    target: "Write contributing guidelines for a TypeScript monorepo with PR and test requirements.",
  },
];
