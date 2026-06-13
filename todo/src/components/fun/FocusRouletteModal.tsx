import { Dices, Sparkles, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import AICoachPanel from "../ai/AICoachPanel";
import type { RouletteCandidate } from "../../types/fun.types";
import type { AICoachResponse } from "../../types/ai.types";
import type { RouletteTab } from "../../hooks/useFocusRoulette";

interface FocusRouletteModalProps {
  open: boolean;
  tab: RouletteTab;
  onTabChange: (tab: RouletteTab) => void;
  aiCoachEnabled: boolean;
  spinning: boolean;
  displayName: string;
  winner: RouletteCandidate | null;
  candidates: RouletteCandidate[];
  coachLoading: boolean;
  coachError: string | null;
  coachResult: AICoachResponse | null;
  coachLocalFallback?: boolean;
  onSpin: () => void;
  onGoToTask: (taskId?: number) => void;
  onFetchCoach: (avoidTaskId?: number) => void;
  onClose: () => void;
}

const FocusRouletteModal = ({
  open,
  tab,
  onTabChange,
  aiCoachEnabled,
  spinning,
  displayName,
  winner,
  candidates,
  coachLoading,
  coachError,
  coachResult,
  coachLocalFallback,
  onSpin,
  onGoToTask,
  onFetchCoach,
  onClose,
}: FocusRouletteModalProps) => {
  const empty = candidates.length === 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[min(85vh,640px)] flex flex-col bg-white dark:bg-[#13131f] border-slate-200 dark:border-white/[0.08]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Dices className="h-5 w-5 text-indigo-500" />
            Focus Roulette
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Pick your next task — randomly or with AI coaching.
          </DialogDescription>
        </DialogHeader>

        {aiCoachEnabled && (
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => onTabChange("random")}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                tab === "random"
                  ? "bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Random
            </button>
            <button
              type="button"
              onClick={() => onTabChange("coach")}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                tab === "coach"
                  ? "bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <Sparkles className="h-3 w-3" /> AI Coach
            </button>
          </div>
        )}

        {tab === "coach" && aiCoachEnabled ? (
          <div className="overflow-y-auto flex-1 min-h-0 -mx-1 px-1">
          <AICoachPanel
            loading={coachLoading}
            error={coachError}
            result={coachResult}
            localFallback={coachLocalFallback}
            onAsk={() => onFetchCoach()}
            onRetry={() => onFetchCoach()}
            onGoToTask={() => onGoToTask(coachResult?.taskId)}
            onPickAnother={() => onFetchCoach(coachResult?.taskId)}
          />
          </div>
        ) : (
          <div className="py-6 min-h-[120px] flex flex-col items-center justify-center text-center">
            {empty ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nothing to spin — you&apos;re clear!
              </p>
            ) : (
              <>
                <div
                  className={`text-lg font-bold text-slate-800 dark:text-slate-100 px-4 py-3 rounded-xl border min-h-[3.5rem] flex items-center justify-center w-full transition-all ${
                    spinning
                      ? "border-indigo-300/60 dark:border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-500/10 tf-roulette-spin"
                      : winner
                        ? "border-emerald-300/60 dark:border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-500/10"
                        : "border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.03]"
                  }`}
                >
                  {spinning ? displayName : winner ? winner.text : "Ready to spin?"}
                </div>
                {winner && !spinning && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                    Your focus:{" "}
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {winner.text}
                    </span>
                    {winner.parentText && (
                      <span className="block text-xs mt-1 text-slate-400">
                        under {winner.parentText}
                      </span>
                    )}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {tab === "random" && !empty && (
            <>
              {winner && !spinning ? (
                <>
                  <Button variant="outline" onClick={onSpin} className="gap-1.5">
                    <Dices className="h-3.5 w-3.5" /> Spin again
                  </Button>
                  <Button onClick={() => onGoToTask(winner.id)} className="tf-accent-bg gap-1.5">
                    <Target className="h-3.5 w-3.5" /> Go to task
                  </Button>
                </>
              ) : (
                <Button
                  onClick={onSpin}
                  disabled={spinning}
                  className="tf-accent-bg w-full sm:w-auto gap-1.5"
                >
                  <Dices className="h-4 w-4" />
                  {spinning ? "Spinning…" : "Spin"}
                </Button>
              )}
            </>
          )}
          {tab === "coach" && aiCoachEnabled && coachResult && !coachLoading && (
            <Button variant="outline" onClick={() => onFetchCoach()} className="gap-1.5">
              Ask again
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FocusRouletteModal;
