export type PreferredStackMemory = {
  frontend?: string;
  backend?: string;
  database?: string;
  styling?: string;
  deploy?: string;
  ai?: string;
};

export type PastProjectSummary = {
  projectId: string;
  name: string;
  niche: string;
  summary: string;
  completedAt: string;
};

export type PersonalMemoryOverrides = {
  preferredStack?: PreferredStackMemory;
  codingStyle?: string[];
  designTaste?: string[];
  codingPatterns?: string[];
};

export type PersonalMemory = {
  preferredStack: PreferredStackMemory;
  codingStyle: string[];
  designTaste: string[];
  codingPatterns: string[];
  pastProjectSummaries: PastProjectSummary[];
  userEditedNotes: string;
  userOverrides?: PersonalMemoryOverrides;
  lastUpdatedAt: string;
};
