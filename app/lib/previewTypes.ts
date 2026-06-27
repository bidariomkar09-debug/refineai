export type PreviewStatus =
  | "idle"
  | "installing"
  | "starting"
  | "running"
  | "error";

export type PreviewState = {
  status: PreviewStatus;
  port: number;
  url: string;
  projectId: string | null;
  lastUpdated: string | null;
  error: string | null;
};

export type PreviewLogLine = {
  type: "log" | "status" | "error" | "complete";
  message: string;
  timestamp: string;
};

export const PREVIEW_PORT = 3001;
export const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;
