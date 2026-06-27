export type UserSettings = {
  id: string;
  account_name: string;
  selected_model: string;
  score_threshold: number;
  max_rounds: number;
  temperature: number;
  theme: "dark" | "light";
  updated_at: string;
};

export type DashboardStats = {
  totalProjects: number;
  totalFiles: number;
  averageScore: number;
  totalLoops: number;
  recentProjects: Array<{
    id: string;
    name: string;
    status: string;
    created_at: string;
    fileCount: number;
    avgScore: number;
  }>;
  activity: Array<{
    id: string;
    message: string;
    timestamp: string;
    projectName: string;
  }>;
};

export type ProjectWithStats = {
  id: string;
  name: string;
  niche: string | null;
  status: string;
  created_at: string;
  fileCount: number;
  doneCount: number;
  avgScore: number;
};

export type DatasetFile = {
  id: string;
  file_path: string;
  file_name: string;
  content: string | null;
  score: number;
  project_id: string;
  project_name: string;
  created_at: string;
};

export type EvaluationStats = {
  projectScores: Array<{ name: string; score: number }>;
  roundScores: Array<{ round: number; score: number }>;
  fileTypeScores: Array<{ type: string; score: number; count: number }>;
  totalRounds: number;
  totalFilesBuilt: number;
  commonIssues: string[];
};

export const AI_MODELS = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    recommended: true,
    speed: 3,
    quality: 5,
    costPer1k: 0.005,
    bestFor: "Complex apps, high-quality code generation",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o-mini",
    recommended: false,
    speed: 5,
    quality: 4,
    costPer1k: 0.00015,
    bestFor: "Fast iterations and simpler projects",
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5-turbo",
    recommended: false,
    speed: 5,
    quality: 3,
    costPer1k: 0.0005,
    bestFor: "Budget builds and prototyping",
  },
] as const;
