import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { CustomThemeConfig, ThemeMode, ThemeTypography } from "../types/customTheme.types";
import { DEFAULT_CUSTOM_THEME, THEME_PRESETS } from "../lib/themePresets";

const THEME_MODE_KEY = "taskflow-theme";
const CUSTOM_THEME_KEY = "taskflow-custom-theme";

const FONT_MAP: Record<ThemeTypography, string> = {
  system: "ui-sans-serif, system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
  serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
  display: "'Orbitron', 'Segoe UI', sans-serif",
};

export const applyCustomThemeToDOM = (theme: CustomThemeConfig) => {
  const root = document.documentElement;
  const { colors, effects, typography } = theme;

  root.classList.add("dark");
  root.dataset.customTheme = "true";
  root.dataset.tfAnimated = String(effects.animatedGradient);
  root.dataset.tfMesh = String(effects.meshGradient);
  root.dataset.tfNeon = String(effects.neonGlow);
  root.dataset.tfNoise = String(effects.noiseOverlay);
  root.dataset.tfStars = String(effects.starfield);

  root.style.setProperty("--tf-bg", colors.background);
  root.style.setProperty("--tf-bg-alt", colors.backgroundAlt);
  root.style.setProperty("--tf-surface", colors.surface);
  root.style.setProperty("--tf-accent", colors.accent);
  root.style.setProperty("--tf-accent-2", colors.accentSecondary);
  root.style.setProperty("--tf-text", colors.text);
  root.style.setProperty("--tf-text-muted", colors.textMuted);
  root.style.setProperty("--tf-success", colors.success);
  root.style.setProperty("--tf-glow", String(effects.glowIntensity));
  root.style.setProperty("--tf-blur", String(effects.glassBlur));
  root.style.setProperty("--tf-radius", `${effects.borderRadius}px`);
  root.style.setProperty("--tf-angle", `${effects.gradientAngle}deg`);
  root.style.setProperty("--tf-font", FONT_MAP[typography]);
  root.style.setProperty(
    "--tf-bg-gradient",
    `linear-gradient(${effects.gradientAngle}deg, ${colors.background} 0%, ${colors.backgroundAlt} 40%, color-mix(in srgb, ${colors.accent} 18%, ${colors.background}) 100%)`
  );
  root.style.setProperty(
    "--tf-accent-glow",
    `color-mix(in srgb, ${colors.accent} ${Math.min(effects.glowIntensity, 80)}%, transparent)`
  );

  // Sync shadcn design tokens so dialogs, inputs, etc. follow the custom theme
  root.style.setProperty("--background", colors.background);
  root.style.setProperty("--foreground", colors.text);
  root.style.setProperty("--card", colors.surface);
  root.style.setProperty("--card-foreground", colors.text);
  root.style.setProperty("--popover", colors.surface);
  root.style.setProperty("--popover-foreground", colors.text);
  root.style.setProperty("--primary", colors.accent);
  root.style.setProperty("--primary-foreground", colors.text);
  root.style.setProperty("--secondary", colors.backgroundAlt);
  root.style.setProperty("--secondary-foreground", colors.text);
  root.style.setProperty("--muted", colors.backgroundAlt);
  root.style.setProperty("--muted-foreground", colors.textMuted);
  root.style.setProperty("--accent", colors.backgroundAlt);
  root.style.setProperty("--accent-foreground", colors.text);
  root.style.setProperty("--border", `color-mix(in srgb, ${colors.accent} 18%, transparent)`);
  root.style.setProperty("--input", `color-mix(in srgb, ${colors.accent} 12%, transparent)`);
  root.style.setProperty("--ring", colors.accent);
  root.style.setProperty("--sidebar", colors.backgroundAlt);
  root.style.setProperty("--sidebar-foreground", colors.text);
  root.style.setProperty("--sidebar-primary", colors.accent);
  root.style.setProperty("--sidebar-accent", `color-mix(in srgb, ${colors.accent} 15%, transparent)`);
  root.style.setProperty("--sidebar-border", `color-mix(in srgb, ${colors.accent} 12%, transparent)`);
};

export const clearCustomThemeFromDOM = (isDark: boolean) => {
  const root = document.documentElement;
  root.dataset.customTheme = "false";
  delete root.dataset.tfAnimated;
  delete root.dataset.tfMesh;
  delete root.dataset.tfNeon;
  delete root.dataset.tfNoise;
  delete root.dataset.tfStars;

  const vars = [
    "--tf-bg", "--tf-bg-alt", "--tf-surface", "--tf-accent", "--tf-accent-2",
    "--tf-text", "--tf-text-muted", "--tf-success", "--tf-glow", "--tf-blur",
    "--tf-radius", "--tf-angle", "--tf-font", "--tf-bg-gradient", "--tf-accent-glow",
    "--background", "--foreground", "--card", "--card-foreground", "--popover",
    "--popover-foreground", "--primary", "--primary-foreground", "--secondary",
    "--secondary-foreground", "--muted", "--muted-foreground", "--accent",
    "--accent-foreground", "--border", "--input", "--ring",
    "--sidebar", "--sidebar-foreground", "--sidebar-primary", "--sidebar-accent", "--sidebar-border",
  ];
  vars.forEach((v) => root.style.removeProperty(v));
  root.classList.toggle("dark", isDark);
};

type ThemeContextType = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggle: () => void;
  isDark: boolean;
  customTheme: CustomThemeConfig;
  setCustomTheme: (t: CustomThemeConfig) => void;
  applyPreset: (id: string) => void;
  presets: CustomThemeConfig[];
  isCustomActive: boolean;
  openThemeStudio: () => void;
  closeThemeStudio: () => void;
  themeStudioOpen: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const loadCustomTheme = (): CustomThemeConfig => {
  try {
    const raw = localStorage.getItem(CUSTOM_THEME_KEY);
    if (raw) return JSON.parse(raw) as CustomThemeConfig;
  } catch { /* ignore */ }
  return DEFAULT_CUSTOM_THEME;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem(THEME_MODE_KEY) as ThemeMode) || "system";
  });
  const [customTheme, setCustomThemeState] = useState<CustomThemeConfig>(loadCustomTheme);
  const [themeStudioOpen, setThemeStudioOpen] = useState(false);

  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isCustomActive = theme === "custom";
  const isDark =
    theme === "dark" ||
    theme === "custom" ||
    (theme === "system" && systemDark);

  const applyTheme = useCallback((mode: ThemeMode, custom: CustomThemeConfig) => {
    if (mode === "custom") {
      applyCustomThemeToDOM(custom);
    } else {
      const dark =
        mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      clearCustomThemeFromDOM(dark);
    }
  }, []);

  useEffect(() => {
    applyTheme(theme, customTheme);
    localStorage.setItem(THEME_MODE_KEY, theme);
  }, [theme, customTheme, applyTheme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system", customTheme);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, customTheme, applyTheme]);

  const setCustomTheme = useCallback((t: CustomThemeConfig) => {
    setCustomThemeState(t);
    localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(t));
    setThemeState("custom");
  }, []);

  const applyPreset = useCallback((id: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === id);
    if (preset) setCustomTheme({ ...preset });
  }, [setCustomTheme]);

  const toggle = () =>
    setThemeState((prev) => {
      if (prev === "custom") return "dark";
      return prev === "light" ? "dark" : "light";
    });

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: setThemeState,
        toggle,
        isDark,
        customTheme,
        setCustomTheme,
        applyPreset,
        presets: THEME_PRESETS,
        isCustomActive,
        openThemeStudio: () => setThemeStudioOpen(true),
        closeThemeStudio: () => setThemeStudioOpen(false),
        themeStudioOpen,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
