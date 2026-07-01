export const ACTIVE_PROJECT_KEY = "refineai-active-project";

export function getStoredActiveProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}

export function setStoredActiveProjectId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_PROJECT_KEY, id);
}

export function clearStoredActiveProjectId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_PROJECT_KEY);
}
