import { useCallback, useState } from "react";
import type { Todo } from "../types/todo.types";
import type { Priority } from "../hooks/usePriority";
import type { RouletteCandidate } from "../types/fun.types";
import type { AICoachResponse, TodoSummary } from "../types/ai.types";
import { aiApi } from "../services/aiService";
import { flattenIncompleteTasks, pickWeightedRandom } from "../lib/funUtils";
import { buildLocalCoachRecommendation, getAIErrorMessage } from "../lib/aiUtils";

export type RouletteTab = "random" | "coach";

export function useFocusRoulette(getPriority: (id: number) => Priority) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<RouletteTab>("random");
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<RouletteCandidate | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [candidates, setCandidates] = useState<RouletteCandidate[]>([]);
  const [summaries, setSummaries] = useState<TodoSummary[]>([]);
  const [coachResult, setCoachResult] = useState<AICoachResponse | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [coachLocalFallback, setCoachLocalFallback] = useState(false);
  const [lastCoachTaskId, setLastCoachTaskId] = useState<number | undefined>();

  const buildCandidates = useCallback(
    (todos: Todo[], includeSubtasks: boolean) =>
      flattenIncompleteTasks(todos, getPriority, includeSubtasks),
    [getPriority]
  );

  const openRoulette = useCallback(
    (todos: Todo[], includeSubtasks: boolean, todoSummaries?: TodoSummary[]) => {
      const pool = buildCandidates(todos, includeSubtasks);
      setCandidates(pool);
      setSummaries(todoSummaries ?? []);
      setWinner(null);
      setDisplayName("");
      setCoachResult(null);
      setCoachError(null);
      setCoachLocalFallback(false);
      setTab("random");
      setIsOpen(true);
    },
    [buildCandidates]
  );

  const spin = useCallback(() => {
    if (candidates.length === 0 || spinning) return;

    setSpinning(true);
    setWinner(null);

    const picked = pickWeightedRandom(candidates);
    if (!picked) {
      setSpinning(false);
      return;
    }

    let ticks = 0;
    const maxTicks = 18;
    const interval = setInterval(() => {
      const flash = candidates[Math.floor(Math.random() * candidates.length)];
      setDisplayName(flash?.text ?? "");
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(interval);
        setDisplayName(picked.text);
        setWinner(picked);
        setSpinning(false);
      }
    }, 70);
  }, [candidates, spinning]);

  const fetchCoach = useCallback(
    async (avoidTaskId?: number) => {
      const incomplete = summaries.filter((t) => !t.done);
      if (incomplete.length === 0) {
        setCoachError("Nothing to recommend — you're clear!");
        setCoachResult(null);
        setCoachLocalFallback(false);
        return;
      }

      const avoidId = avoidTaskId ?? lastCoachTaskId;
      setCoachLoading(true);
      setCoachError(null);
      setCoachLocalFallback(false);
      try {
        const result = await aiApi.coach(incomplete, avoidId);
        setCoachResult(result);
        setLastCoachTaskId(result.taskId);
      } catch (err) {
        const local = buildLocalCoachRecommendation(summaries, avoidId);
        if (local) {
          setCoachResult(local);
          setLastCoachTaskId(local.taskId);
          setCoachLocalFallback(true);
          setCoachError(getAIErrorMessage(err));
        } else {
          setCoachResult(null);
          setCoachError(getAIErrorMessage(err));
        }
      } finally {
        setCoachLoading(false);
      }
    },
    [summaries, lastCoachTaskId]
  );

  const setTabAndFetch = useCallback(
    (newTab: RouletteTab) => {
      setTab(newTab);
      if (newTab === "coach") {
        void fetchCoach();
      }
    },
    [fetchCoach]
  );

  const closeRoulette = useCallback(() => {
    setIsOpen(false);
    setSpinning(false);
    setCoachLoading(false);
  }, []);

  return {
    isOpen,
    tab,
    setTab,
    spinning,
    winner,
    displayName,
    candidates,
    summaries,
    coachResult,
    coachLoading,
    coachError,
    coachLocalFallback,
    openRoulette,
    spin,
    fetchCoach,
    setTabAndFetch,
    closeRoulette,
    setIsOpen,
  };
}
