import type { Todo } from "../types/todo.types";
import type { AICoachResponse, TodoSummary } from "../types/ai.types";
import type { Priority } from "../hooks/usePriority";
import { calculateProgress, countAll, getBossHp } from "./funUtils";

export const buildTodoSummaries = (
  todos: Todo[],
  getPriority: (id: number) => Priority,
  parentText?: string
): TodoSummary[] => {
  const result: TodoSummary[] = [];

  for (const todo of todos) {
    const subCount = todo.subTodos?.length ? countAll(todo.subTodos).total : 0;
    const progress = calculateProgress(todo);
    result.push({
      id: todo.id,
      text: todo.text,
      done: todo.done,
      priority: getPriority(todo.id),
      subtaskCount: subCount,
      parentText,
      progress,
      bossHp: subCount > 0 ? getBossHp(todo) : undefined,
    });

    if (todo.subTodos?.length) {
      result.push(
        ...buildTodoSummaries(todo.subTodos, getPriority, todo.text)
      );
    }
  }

  return result;
};

export const flattenIncompleteSummaries = (
  summaries: TodoSummary[]
): TodoSummary[] => summaries.filter((t) => !t.done);

export const looksLikeNaturalLanguageTask = (input: string): boolean => {
  const t = input.trim().toLowerCase();
  if (t.startsWith("/ai ")) return true;
  return (
    /\bwith\b/.test(t) &&
    (/\b(subtask|subtasks)\b/.test(t) ||
      /,/.test(t) ||
      /\band\b/.test(t) ||
      /^(create|add|make)\s+/.test(t))
  );
};

export const bossLoreCacheKey = (taskId: number, updatedAt: string) =>
  `${taskId}:${updatedAt}`;

const LORE_CACHE_KEY = "taskflow-boss-lore";
const BRIEFING_DATE_KEY = "taskflow-briefing-date";
const BRIEFING_DISMISS_KEY = "taskflow-briefing-dismissed";

export const getBossLoreFromCache = (
  taskId: number,
  updatedAt: string
): import("../types/ai.types").AIBossLoreResponse | null => {
  try {
    const cache = JSON.parse(localStorage.getItem(LORE_CACHE_KEY) || "{}");
    return cache[bossLoreCacheKey(taskId, updatedAt)] ?? null;
  } catch {
    return null;
  }
};

export const setBossLoreCache = (
  taskId: number,
  updatedAt: string,
  lore: import("../types/ai.types").AIBossLoreResponse
) => {
  try {
    const cache = JSON.parse(localStorage.getItem(LORE_CACHE_KEY) || "{}");
    cache[bossLoreCacheKey(taskId, updatedAt)] = lore;
    localStorage.setItem(LORE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore quota errors */
  }
};

export const shouldShowBriefingToday = (): boolean => {
  const today = new Date().toISOString().slice(0, 10);
  const lastShown = localStorage.getItem(BRIEFING_DATE_KEY);
  const dismissed = localStorage.getItem(BRIEFING_DISMISS_KEY);
  if (dismissed === today) return false;
  return lastShown !== today;
};

export const markBriefingShown = () => {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(BRIEFING_DATE_KEY, today);
  localStorage.removeItem(BRIEFING_DISMISS_KEY);
};

export const dismissBriefingForToday = () => {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(BRIEFING_DISMISS_KEY, today);
};

export const buildLocalCoachRecommendation = (
  summaries: TodoSummary[],
  avoidTaskId?: number
): AICoachResponse | null => {
  const incomplete = summaries.filter(
    (t) => !t.done && (avoidTaskId == null || t.id !== avoidTaskId)
  );
  if (incomplete.length === 0) return null;

  const scoreTask = (t: TodoSummary): number => {
    let score = 1;
    if (t.priority === "urgent" || t.priority === "high") score += 3;
    else if (t.priority === "medium") score += 2;
    if (t.bossHp != null && t.bossHp > 0 && t.bossHp < 50) score += 1.5;
    if (t.subtaskCount > 0) score += 0.5;
    if (avoidTaskId != null && t.id === avoidTaskId) score -= 10;
    return score;
  };

  const pick = incomplete.reduce((best, t) =>
    scoreTask(t) > scoreTask(best) ? t : best
  );

  const priorityMessage =
    pick.priority === "high" || pick.priority === "urgent"
      ? `This is your priority task — complete "${pick.text}" first before anything else.`
      : pick.bossHp != null && pick.bossHp < 50
        ? `Boss HP is critical (${pick.bossHp}%) — finish "${pick.text}" now.`
        : `This is your best next focus — complete "${pick.text}" first for maximum momentum.`;

  const completionPlan: string[] = [
    "Block 25 distraction-free minutes — phone away, one tab only.",
    `Clarify what "done" looks like for "${pick.text}".`,
  ];
  if (pick.subtaskCount > 0) {
    completionPlan.push(
      `Finish the smallest open subtask next (${pick.progress ?? 0}% done).`
    );
  } else {
    completionPlan.push("Break into 3 micro-steps and start step 1 now.");
  }
  if (pick.bossHp != null && pick.bossHp > 0) {
    completionPlan.push(
      `Stay focused until boss HP hits 0% (currently ${pick.bossHp}%).`
    );
  }
  completionPlan.push("Check off the task, then pick the next priority.");

  const reasonParts = [`"${pick.text}" is your top priority right now`];
  if (pick.priority === "high" || pick.priority === "urgent") {
    reasonParts.push("it is marked high priority");
  }
  if (pick.bossHp != null && pick.bossHp < 100) {
    reasonParts.push(`completing it drops boss HP from ${pick.bossHp}%`);
  }
  if (pick.parentText) {
    reasonParts.push(`it advances ${pick.parentText}`);
  }

  return {
    taskId: pick.id,
    taskText: pick.text,
    priorityMessage,
    recommendation: `${reasonParts.join(" — ")}.`,
    completionPlan: completionPlan.slice(0, 6),
    estimatedMinutes: 25,
    prioritySuggestion:
      pick.priority === "urgent" || pick.priority === "high"
        ? "high"
        : pick.priority === "medium"
          ? "medium"
          : "none",
  };
};

export const getAIErrorMessage = (err: unknown): string => {
  const axiosErr = err as {
    response?: { status?: number; data?: { error?: string; detail?: string } };
    message?: string;
  };

  if (!axiosErr.response) {
    return "Can't reach the backend. Check that the correct server is running for your mode (Fastify :8080 / FastAPI :8000).";
  }
  if (axiosErr.response.status === 404) {
    return "AI routes not found. In hybrid mode, start FastAPI on :8000 or rely on Fastify AI fallback.";
  }
  if (axiosErr.response.status === 401) {
    return "Session expired. Log in again to use AI Coach.";
  }
  const detail =
    axiosErr.response.data?.error ??
    axiosErr.response.data?.detail ??
    axiosErr.message;
  return typeof detail === "string" ? detail : "AI Coach request failed.";
};
