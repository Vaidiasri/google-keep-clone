import { ChevronDown, RefreshCw, Sparkles, X } from "lucide-react";
import { useState } from "react";
import type { AIBriefingResponse } from "../../types/ai.types";

interface AIBriefingCardProps {
  briefing: AIBriefingResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onDismiss: () => void;
}

const AIBriefingCard = ({
  briefing,
  loading,
  error,
  onRefresh,
  onDismiss,
}: AIBriefingCardProps) => {
  const [collapsed, setCollapsed] = useState(false);

  if (loading && !briefing) {
    return (
      <div className="tf-surface rounded-2xl border border-indigo-200/40 dark:border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-500/5 px-4 py-3 animate-pulse">
        <p className="text-sm text-indigo-600 dark:text-indigo-400">Generating daily briefing…</p>
      </div>
    );
  }

  if (error && !briefing) return null;
  if (!briefing) return null;

  return (
    <div className="tf-surface tf-neon-card rounded-2xl border border-indigo-200/50 dark:border-indigo-500/25 bg-gradient-to-br from-indigo-50/80 to-violet-50/40 dark:from-indigo-500/10 dark:to-violet-500/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-indigo-100/60 dark:border-indigo-500/15">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            Daily Briefing
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRefresh}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-500 transition-colors"
            title="Refresh briefing"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
            title="Dismiss for today"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 py-3 space-y-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {briefing.greeting}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {briefing.summary}
          </p>
          {briefing.topPriorities.length > 0 && (
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pt-1">
              {briefing.topPriorities.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-indigo-400 font-bold">{i + 1}.</span>
                  {p}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs italic text-indigo-600/80 dark:text-indigo-400/80 pt-1">
            {briefing.encouragement}
          </p>
        </div>
      )}
    </div>
  );
};

export default AIBriefingCard;
