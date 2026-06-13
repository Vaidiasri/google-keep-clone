export interface FunSettings {
  bossBattleEnabled: boolean;
  focusRouletteEnabled: boolean;
  completionBurstEnabled: boolean;
  completionBurstIntensity: "subtle" | "normal" | "epic";
  smartSplitEnabled: boolean;
  rouletteIncludeSubtasks: boolean;
  aiEnabled: boolean;
  aiSmartSplitEnabled: boolean;
  aiFocusCoachEnabled: boolean;
  aiBossLoreEnabled: boolean;
  aiBriefingEnabled: boolean;
  aiNaturalLanguageAddEnabled: boolean;
}

export interface BossStats {
  hp: number;
  maxHp: 100;
  isDefeated: boolean;
  damageFlash?: boolean;
}

export interface RouletteCandidate {
  id: number;
  text: string;
  weight: number;
  parentText?: string;
}

export interface BurstEvent {
  id: string;
  x: number;
  y: number;
  intensity: "subtle" | "normal" | "epic";
}

export interface ParsedBulletList {
  title?: string;
  items: string[];
}
