export interface TodoSummary {
  id: number;
  text: string;
  done: boolean;
  priority?: string;
  subtaskCount: number;
  parentText?: string;
  progress?: number;
  bossHp?: number;
}

export interface AISplitResponse {
  title: string;
  subtasks: string[];
  reasoning?: string;
}

export interface AICoachResponse {
  taskId: number;
  taskText: string;
  priorityMessage: string;
  recommendation: string;
  completionPlan: string[];
  estimatedMinutes?: number;
  prioritySuggestion?: "high" | "medium" | "low" | "none";
}

export interface AIBossLoreResponse {
  bossName: string;
  taunt: string;
  defeatMessage: string;
}

export interface AIBriefingResponse {
  greeting: string;
  summary: string;
  topPriorities: string[];
  encouragement: string;
}

export interface AIParseTaskResponse {
  parent: string;
  subtasks: string[];
}

export interface AIStatusResponse {
  configured: boolean;
  provider?: string;
  model?: string;
  remainingToday: number;
  dailyLimit: number;
}

export interface BossLoreCacheEntry extends AIBossLoreResponse {
  cacheKey: string;
}
