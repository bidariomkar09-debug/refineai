"use client";

import { useCallback, useEffect, useState } from "react";
import {
  APP_MODE_KEY,
  DEFAULT_DEV_CONFIG,
  DEV_CONFIG_KEY,
  type AppMode,
  type DeveloperConfig,
} from "./developerConfig";

export function useDeveloperConfig() {
  const [appMode, setAppModeState] = useState<AppMode>("simple");
  const [devConfig, setDevConfigState] =
    useState<DeveloperConfig>(DEFAULT_DEV_CONFIG);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedMode = localStorage.getItem(APP_MODE_KEY) as AppMode | null;
      if (storedMode === "simple" || storedMode === "developer") {
        setAppModeState(storedMode);
      }
      const storedConfig = localStorage.getItem(DEV_CONFIG_KEY);
      if (storedConfig) {
        setDevConfigState({ ...DEFAULT_DEV_CONFIG, ...JSON.parse(storedConfig) });
      }
    } catch {
      // use defaults
    }
    setHydrated(true);
  }, []);

  const setAppMode = useCallback((mode: AppMode) => {
    setAppModeState(mode);
    localStorage.setItem(APP_MODE_KEY, mode);
  }, []);

  const setDevConfig = useCallback(
    (updater: DeveloperConfig | ((prev: DeveloperConfig) => DeveloperConfig)) => {
      setDevConfigState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        localStorage.setItem(DEV_CONFIG_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const updateDevConfig = useCallback(
    (partial: Partial<DeveloperConfig>) => {
      setDevConfig((prev) => ({ ...prev, ...partial }));
    },
    [setDevConfig]
  );

  return { appMode, setAppMode, devConfig, setDevConfig, updateDevConfig, hydrated };
}
