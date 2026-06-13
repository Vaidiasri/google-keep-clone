import { useCallback, useState } from "react";
import { aiApi } from "../services/aiService";
import type { AIBriefingResponse, TodoSummary } from "../types/ai.types";
import {
  dismissBriefingForToday,
  markBriefingShown,
  shouldShowBriefingToday,
} from "../lib/aiUtils";

export function useAIBriefing() {
  const [briefing, setBriefing] = useState<AIBriefingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(() => shouldShowBriefingToday());
  const [error, setError] = useState<string | null>(null);

  const loadBriefing = useCallback(
    async (summaries: TodoSummary[], userName: string, force = false) => {
      if (!force && !shouldShowBriefingToday()) {
        setVisible(false);
        return null;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await aiApi.briefing(summaries, userName);
        setBriefing(data);
        setVisible(true);
        if (!force) markBriefingShown();
        return data;
      } catch {
        setError("Could not load briefing.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const dismiss = useCallback(() => {
    dismissBriefingForToday();
    setVisible(false);
  }, []);

  const refresh = useCallback(
    (summaries: TodoSummary[], userName: string) =>
      loadBriefing(summaries, userName, true),
    [loadBriefing]
  );

  return { briefing, loading, visible, error, loadBriefing, dismiss, refresh, setVisible };
}
