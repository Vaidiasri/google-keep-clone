import { useCallback, useEffect, useState } from "react";
import { aiApi } from "../services/aiService";
import type { Todo } from "../types/todo.types";
import type { AIBossLoreResponse } from "../types/ai.types";
import {
  getBossLoreFromCache,
  setBossLoreCache,
} from "../lib/aiUtils";
import { calculateProgress, countAll } from "../lib/funUtils";

export function useBossLore(enabled: boolean) {
  const [loreMap, setLoreMap] = useState<Record<number, AIBossLoreResponse>>({});
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());

  const fetchLore = useCallback(
    async (todo: Todo) => {
      if (!enabled || !todo.subTodos?.length) return null;

      const cached = getBossLoreFromCache(todo.id, todo.updatedAt);
      if (cached) {
        setLoreMap((prev) => ({ ...prev, [todo.id]: cached }));
        return cached;
      }

      if (loadingIds.has(todo.id)) return null;

      setLoadingIds((prev) => new Set(prev).add(todo.id));
      try {
        const subCount = countAll(todo.subTodos).total;
        const progress = calculateProgress(todo);
        const lore = await aiApi.bossLore(todo.text, subCount, progress);
        setBossLoreCache(todo.id, todo.updatedAt, lore);
        setLoreMap((prev) => ({ ...prev, [todo.id]: lore }));
        return lore;
      } catch {
        return null;
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(todo.id);
          return next;
        });
      }
    },
    [enabled, loadingIds]
  );

  const getLore = useCallback(
    (todo: Todo): AIBossLoreResponse | null => {
      if (!enabled || !todo.subTodos?.length) return null;
      return loreMap[todo.id] ?? getBossLoreFromCache(todo.id, todo.updatedAt);
    },
    [enabled, loreMap]
  );

  const prefetchBosses = useCallback(
    (todos: Todo[]) => {
      if (!enabled) return;
      for (const t of todos) {
        if (t.subTodos?.length && !getLore(t)) {
          void fetchLore(t);
        }
      }
    },
    [enabled, fetchLore, getLore]
  );

  return { getLore, fetchLore, prefetchBosses, loadingIds };
}

export function useBossLorePrefetch(
  enabled: boolean,
  todos: Todo[],
  prefetchBosses: (todos: Todo[]) => void
) {
  useEffect(() => {
    if (enabled && todos.length) prefetchBosses(todos);
  }, [enabled, todos, prefetchBosses]);
}
