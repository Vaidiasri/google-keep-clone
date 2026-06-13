import { Loader2, ListChecks, Sparkles, Target } from "lucide-react";
import { Button } from "../ui/button";
import type { AICoachResponse } from "../../types/ai.types";

interface AICoachPanelProps {
  loading: boolean;
  error: string | null;
  result: AICoachResponse | null;
  localFallback?: boolean;
  onAsk: () => void;
  onRetry?: () => void;
  onGoToTask: () => void;
  onPickAnother: () => void;
}

const AICoachPanel = ({
  loading,
  error,
  result,
  localFallback,
  onAsk,
  onRetry,
  onGoToTask,
  onPickAnother,
}: AICoachPanelProps) => (
  <div className="py-2 min-h-[140px] flex flex-col items-center text-center gap-3 w-full">
    {loading ? (
      <div className="flex flex-col items-center gap-2 text-indigo-600 dark:text-indigo-400 py-6">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Analyzing priorities and building your plan…</p>
      </div>
    ) : result ? (
      <>
        {localFallback && error && (
          <p className="text-xs text-amber-600 dark:text-amber-400 max-w-sm leading-relaxed">
            Offline recommendation — {error}
          </p>
        )}
        <div className="w-full rounded-xl border border-amber-200/60 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 px-4 py-2.5 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">
            Priority — complete first
          </p>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100 leading-relaxed">
            {result.priorityMessage ?? `Complete "${result.taskText}" first — it's your top priority.`}
          </p>
        </div>

        <div className="w-full rounded-xl border border-indigo-200/60 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/10 px-4 py-3 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500 mb-1">
            Your focus task
          </p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">
            {result.taskText}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            {result.recommendation}
          </p>
          {result.estimatedMinutes != null && (
            <p className="text-xs text-slate-400 mt-2">
              ~{result.estimatedMinutes} min
              {result.prioritySuggestion && result.prioritySuggestion !== "none"
                ? ` · ${result.prioritySuggestion} priority`
                : ""}
            </p>
          )}
        </div>

        {(result.completionPlan ?? []).length > 0 && (
          <div className="w-full rounded-xl border border-slate-200/60 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.03] px-4 py-3 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <ListChecks className="h-3 w-3" />
              100% efficiency plan
            </p>
            <ol className="space-y-2">
              {(result.completionPlan ?? []).map((step, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                >
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-center pt-1">
          <Button onClick={onGoToTask} className="tf-accent-bg gap-1.5">
            <Target className="h-3.5 w-3.5" /> Start this task
          </Button>
          <Button variant="outline" onClick={onPickAnother}>
            Pick another
          </Button>
        </div>
      </>
    ) : error ? (
      <>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
          {error}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {onRetry && (
            <Button onClick={onRetry} className="tf-accent-bg gap-1.5">
              <Sparkles className="h-4 w-4" /> Retry
            </Button>
          )}
        </div>
      </>
    ) : (
      <>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          Get your #1 priority task plus a step-by-step plan to finish it efficiently.
        </p>
        <Button onClick={onAsk} className="tf-accent-bg gap-1.5">
          <Sparkles className="h-4 w-4" /> Get recommendation
        </Button>
      </>
    )}
  </div>
);

export default AICoachPanel;
