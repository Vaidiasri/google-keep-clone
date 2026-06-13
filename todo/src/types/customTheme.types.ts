export type ThemeTypography = "system" | "mono" | "serif" | "display";

export interface CustomThemeConfig {
  id: string;
  name: string;
  colors: {
    background: string;
    backgroundAlt: string;
    surface: string;
    accent: string;
    accentSecondary: string;
    text: string;
    textMuted: string;
    success: string;
  };
  effects: {
    gradientAngle: number;
    glowIntensity: number;
    glassBlur: number;
    borderRadius: number;
    animatedGradient: boolean;
    meshGradient: boolean;
    neonGlow: boolean;
    noiseOverlay: boolean;
    starfield: boolean;
  };
  typography: ThemeTypography;
}

export type ThemeMode = "light" | "dark" | "system" | "custom";
