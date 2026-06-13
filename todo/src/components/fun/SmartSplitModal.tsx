import { ChevronDown, ListTree, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import type { Todo } from "../../types/todo.types";
import type { SmartSplitMode } from "../../hooks/useSmartSplit";
import type { AISplitResponse } from "../../types/ai.types";

interface SmartSplitModalProps {
  open: boolean;
  text: string;
  onTextChange: (text: string) => void;
  mode: SmartSplitMode;
  onModeChange: (mode: SmartSplitMode) => void;
  parentTitle: string;
  onParentTitleChange: (title: string) => void;
  existingParentId: number | null;
  onExistingParentChange: (id: number | null) => void;
  parsed: { title?: string; items: string[] };
  creating: boolean;
  progress: string;
  topLevelTodos: Todo[];
  aiEnabled: boolean;
  useAI: boolean;
  onUseAIChange: (v: boolean) => void;
  aiLoading: boolean;
  aiPreview: AISplitResponse | null;
  aiError: string | null;
  showReasoning: boolean;
  onToggleReasoning: () => void;
  onConfirm: () => void;
  onClose: () => void;
}

const SmartSplitModal = ({
  open,
  text,
  onTextChange,
  mode,
  onModeChange,
  parentTitle,
  onParentTitleChange,
  existingParentId,
  onExistingParentChange,
  parsed,
  creating,
  progress,
  topLevelTodos,
  aiEnabled,
  useAI,
  onUseAIChange,
  aiLoading,
  aiPreview,
  aiError,
  showReasoning,
  onToggleReasoning,
  onConfirm,
  onClose,
}: SmartSplitModalProps) => {
  const incompleteParents = topLevelTodos.filter((t) => !t.done);
  const canConfirm = parsed.items.length > 0 && (mode === "new" || existingParentId !== null);

  return (
    <Dialog open={open} onOpenChange={(o) => !creating && !o && onClose()}>
      <DialogContent className="max-w-lg bg-white dark:bg-[#13131f] border-slate-200 dark:border-white/[0.08]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <ListTree className="h-5 w-5 text-violet-500" />
            Smart Split
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Paste a bullet list or paragraph — AI can break down messy input.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {aiEnabled && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={useAI}
                onCheckedChange={(v) => onUseAIChange(v === true)}
                disabled={creating}
                className="h-4 w-4 rounded border-slate-300 dark:border-white/20 bg-transparent dark:bg-white/[0.06] data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
              />
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Use AI for smarter breakdown
              </span>
              {aiLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />}
            </label>
          )}

          {aiError && (
            <p className="text-xs text-amber-600 dark:text-amber-400">{aiError}</p>
          )}

          <textarea
            className="w-full min-h-[140px] rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-white/[0.04] px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-y"
            placeholder={`Plan trip\n- Book flight\n- Book hotel\n\nOr: plan my vacation need flights hotel and pack`}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            disabled={creating}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onModeChange("new")}
              disabled={creating}
              className={`flex-1 text-xs font-medium py-2 px-3 rounded-lg border transition-colors ${
                mode === "new"
                  ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                  : "border-slate-200 dark:border-white/[0.08] text-slate-500"
              }`}
            >
              New parent + subtasks
            </button>
            <button
              type="button"
              onClick={() => onModeChange("existing")}
              disabled={creating}
              className={`flex-1 text-xs font-medium py-2 px-3 rounded-lg border transition-colors ${
                mode === "existing"
                  ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                  : "border-slate-200 dark:border-white/[0.08] text-slate-500"
              }`}
            >
              Add to existing task
            </button>
          </div>

          {mode === "new" ? (
            <input
              className="w-full rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm dark:text-slate-200"
              placeholder={parsed.title ? `Parent: ${parsed.title}` : "Parent task title (optional)"}
              value={parentTitle}
              onChange={(e) => onParentTitleChange(e.target.value)}
              disabled={creating}
            />
          ) : (
            <select
              className="w-full rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm dark:text-slate-200"
              value={existingParentId ?? ""}
              onChange={(e) =>
                onExistingParentChange(e.target.value ? Number(e.target.value) : null)
              }
              disabled={creating}
            >
              <option value="">Select a parent task…</option>
              {incompleteParents.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.text}
                </option>
              ))}
            </select>
          )}

          {parsed.items.length > 0 && (
            <div
              className={`rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] p-3 ${
                aiLoading ? "animate-pulse" : ""
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Preview ({parsed.items.length} subtask{parsed.items.length === 1 ? "" : "s"})
                {useAI && aiPreview ? " · AI" : ""}
              </p>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {parsed.items.map((item, i) => (
                  <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex gap-2">
                    <span className="text-indigo-400">•</span>
                    {item}
                  </li>
                ))}
              </ul>
              {useAI && aiPreview?.reasoning && (
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={onToggleReasoning}
                    className="text-[10px] text-indigo-500 flex items-center gap-1"
                  >
                    Why these steps?
                    <ChevronDown className={`h-3 w-3 transition-transform ${showReasoning ? "rotate-180" : ""}`} />
                  </button>
                  {showReasoning && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {aiPreview.reasoning}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {creating && (
            <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress || "Creating…"}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!canConfirm || creating || aiLoading}
            className="tf-accent-bg"
          >
            Create {parsed.items.length} subtask{parsed.items.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SmartSplitModal;
