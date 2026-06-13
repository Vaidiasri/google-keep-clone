import { useCallback, useState } from "react";
import { aiApi, AIRateLimitError } from "../services/aiService";
import type { AIStatusResponse } from "../types/ai.types";

export function useAIAssistant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AIStatusResponse | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await aiApi.status();
      setStatus(s);
      return s;
    } catch {
      return null;
    }
  }, []);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      await fetchStatus();
      return result;
    } catch (err) {
      if (err instanceof AIRateLimitError) {
        setError(err.message);
      } else {
        setError("AI unavailable — using fallback instead.");
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  return { loading, error, status, clearError, fetchStatus, run };
}
