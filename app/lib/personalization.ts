export const OWNER_NAME = "Omkar";

export const TIMEZONE_OPTIONS = [
  { value: "America/Los_Angeles", label: "Pacific Time (US)" },
  { value: "America/Denver", label: "Mountain Time (US)" },
  { value: "America/Chicago", label: "Central Time (US)" },
  { value: "America/New_York", label: "Eastern Time (US)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "UTC", label: "UTC" },
] as const;

export function getDetectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/Los_Angeles";
  }
}

function getHourInTimezone(timezone?: string): number {
  const tz = timezone || getDetectedTimezone();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    const hour = parts.find((p) => p.type === "hour")?.value;
    return hour ? parseInt(hour, 10) : new Date().getHours();
  } catch {
    return new Date().getHours();
  }
}

export function getTimeGreeting(timezone?: string): string {
  const hour = getHourInTimezone(timezone);
  if (hour < 12) return `Good morning, ${OWNER_NAME}`;
  if (hour < 17) return `Good afternoon, ${OWNER_NAME}`;
  return `Good evening, ${OWNER_NAME}`;
}

export function getWelcomeBackMessage(): string {
  return `Welcome back, ${OWNER_NAME}`;
}

export function maskSecret(value: string | undefined, visibleStart = 3, visibleEnd = 4): string {
  if (!value) return "";
  if (value.length <= visibleStart + visibleEnd) return "••••••••";
  return `${value.slice(0, visibleStart)}••••${value.slice(-visibleEnd)}`;
}
