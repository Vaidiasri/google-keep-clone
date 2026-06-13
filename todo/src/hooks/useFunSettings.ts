import { useCallback, useState } from "react";
import type { FunSettings } from "../types/fun.types";

const STORAGE_KEY = "taskflow-fun-settings";

export const DEFAULT_FUN_SETTINGS: FunSettings = {
  bossBattleEnabled: true,
  focusRouletteEnabled: true,
  completionBurstEnabled: true,
  completionBurstIntensity: "normal",
  smartSplitEnabled: true,
  rouletteIncludeSubtasks: true,
  aiEnabled: false,
  aiSmartSplitEnabled: true,
  aiFocusCoachEnabled: true,
  aiBossLoreEnabled: true,
  aiBriefingEnabled: true,
  aiNaturalLanguageAddEnabled: true,
};

const loadSettings = (): FunSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FUN_SETTINGS;
    return { ...DEFAULT_FUN_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FUN_SETTINGS;
  }
};

export function useFunSettings() {
  const [settings, setSettings] = useState<FunSettings>(loadSettings);

  const persist = useCallback((next: FunSettings) => {
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const updateSetting = useCallback(
    <K extends keyof FunSettings>(key: K, value: FunSettings[K]) => {
      persist({ ...settings, [key]: value });
    },
    [persist, settings]
  );

  const resetDefaults = useCallback(() => {
    persist(DEFAULT_FUN_SETTINGS);
  }, [persist]);

  return { settings, updateSetting, resetDefaults };
}
