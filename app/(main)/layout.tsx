import AppShell from "@/app/components/shell/AppShell";
import { ThemeProvider } from "@/app/components/shell/ThemeProvider";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppShell>{children}</AppShell>
    </ThemeProvider>
  );
}
