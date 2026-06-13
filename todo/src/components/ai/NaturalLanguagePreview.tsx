import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Sparkles } from "lucide-react";

interface NaturalLanguagePreviewProps {
  open: boolean;
  parent: string;
  subtasks: string[];
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const NaturalLanguagePreview = ({
  open,
  parent,
  subtasks,
  loading,
  onConfirm,
  onCancel,
}: NaturalLanguagePreviewProps) => (
  <Dialog open={open} onOpenChange={(o) => !o && !loading && onCancel()}>
    <DialogContent className="max-w-md bg-white dark:bg-[#13131f] border-slate-200 dark:border-white/[0.08]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-amber-500" />
          AI Task Preview
        </DialogTitle>
        <DialogDescription className="text-slate-500 dark:text-slate-400">
          Confirm before creating — this will add a parent task
          {subtasks.length > 0 ? ` and ${subtasks.length} subtask${subtasks.length === 1 ? "" : "s"}` : ""}.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-2">
        <div className="rounded-lg border border-slate-200 dark:border-white/[0.08] px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Parent</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{parent}</p>
        </div>
        {subtasks.length > 0 && (
          <ul className="rounded-lg border border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] px-3 py-2 space-y-1 max-h-40 overflow-y-auto">
            {subtasks.map((s, i) => (
              <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex gap-2">
                <span className="text-indigo-400">•</span>
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={loading} className="tf-accent-bg">
          {loading ? "Creating…" : "Create tasks"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default NaturalLanguagePreview;
