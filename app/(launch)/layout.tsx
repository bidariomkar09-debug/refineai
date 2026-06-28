import { ThemeProvider } from "@/app/components/shell/ThemeProvider";

export default function LaunchLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
