"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export default function CapacitorInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0a0a0a" });
      } catch {
        // native plugin optional in web preview
      }

      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        window.setTimeout(() => {
          void SplashScreen.hide();
        }, 2000);
      } catch {
        // ignore
      }
    })();
  }, []);

  return null;
}
