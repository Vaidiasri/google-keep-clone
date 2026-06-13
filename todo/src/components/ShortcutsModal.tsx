import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: ["N"], description: "New task — focus the create input" },
  { keys: ["/"], description: "Search — focus the search bar" },
  { keys: ["G", "B"], description: "Board view" },
  { keys: ["G", "L"], description: "List view" },
  { keys: ["G", "F"], description: "Today's Focus view" },
  { keys: ["G", "R"], description: "Focus Roulette — pick a random task" },
  { keys: ["Ctrl", "Shift", "V"], description: "Smart Split — paste a bullet list (while in create input)" },
  { keys: ["?"], description: "Show this shortcuts panel" },
  { keys: ["Esc"], description: "Cancel edit / close modal" },
  { keys: ["Enter"], description: "Save task / confirm action" },
  { keys: ["↑↓ DblClick"], description: "Double-click a task title to edit" },
];

const Kbd = ({ children }: { children: string }) => (
  <kbd className="inline-flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 shadow-sm">
    {children}
  </kbd>
);

const ShortcutsModal = ({ open, onClose }: ShortcutsModalProps) => {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm dark:bg-slate-800 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {shortcuts.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
            >
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {s.description}
              </span>
              <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                {s.keys.map((k, ki) => (
                  <span key={ki} className="flex items-center gap-1">
                    <Kbd>{k}</Kbd>
                    {ki < s.keys.length - 1 && (
                      <span className="text-xs text-slate-400">then</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 text-center">
          Shortcuts are disabled while typing in an input
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default ShortcutsModal;
