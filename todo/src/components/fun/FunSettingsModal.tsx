import { Sparkles } from "lucide-react";
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
import type { FunSettings } from "../../types/fun.types";
interface FunSettingsModalProps {
  open: boolean;
  settings: FunSettings;
  onUpdate: <K extends keyof FunSettings>(key: K, value: FunSettings[K]) => void;
  onReset: () => void;
  onClose: () => void;
}

const Toggle = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-start gap-3 py-2.5 group">
    <Checkbox
      checked={checked}
      onCheckedChange={(v) => onChange(v === true)}
      className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-white/20 bg-transparent dark:bg-white/[0.06] data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 focus-visible:ring-indigo-500/40"
    />
    <button
      type="button"
      className="flex-1 text-left"
      onClick={() => onChange(!checked)}
    >
      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {label}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
    </button>
  </div>
);
const FunSettingsModal = ({
  open,
  settings,
  onUpdate,
  onReset,
  onClose,
}: FunSettingsModalProps) => (
  <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-md max-h-[min(85vh,720px)] flex flex-col gap-0 overflow-hidden p-0 bg-white dark:bg-[#13131f] border-slate-200 dark:border-white/[0.08]">
      <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
        <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Fun Stack
        </DialogTitle>
        <DialogDescription className="text-slate-500 dark:text-slate-400">
          Gameplay features — separate from Theme Studio colors.
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-2">
        <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
        <Toggle
          label="Boss Battle Mode"
          description="Top-level tasks with subtasks show as bosses with HP bars."
          checked={settings.bossBattleEnabled}
          onChange={(v) => onUpdate("bossBattleEnabled", v)}
        />
        <Toggle
          label="Focus Roulette"
          description="Spin to pick a weighted random next task."
          checked={settings.focusRouletteEnabled}
          onChange={(v) => onUpdate("focusRouletteEnabled", v)}
        />
        <Toggle
          label="Include subtasks in roulette"
          description="Let nested tasks appear in the spin pool."
          checked={settings.rouletteIncludeSubtasks}
          onChange={(v) => onUpdate("rouletteIncludeSubtasks", v)}
        />
        <Toggle
          label="Completion Burst"
          description="Celebrate when you check off a task."
          checked={settings.completionBurstEnabled}
          onChange={(v) => onUpdate("completionBurstEnabled", v)}
        />
        {settings.completionBurstEnabled && (
          <div className="py-2.5 pl-7">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Burst intensity
            </p>
            <div className="flex gap-2">
              {(["subtle", "normal", "epic"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => onUpdate("completionBurstIntensity", level)}
                  className={`text-xs capitalize px-3 py-1.5 rounded-lg border transition-colors ${
                    settings.completionBurstIntensity === level
                      ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                      : "border-slate-200 dark:border-white/[0.08] text-slate-500"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}
        <Toggle
          label="Smart Split"
          description="Paste bullet lists to auto-create subtasks."
          checked={settings.smartSplitEnabled}
          onChange={(v) => onUpdate("smartSplitEnabled", v)}
        />

        <div className="pt-4 mt-1 border-t border-slate-100 dark:border-white/[0.06]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
            AI Stack
          </p>
          <Toggle
            label="Enable AI features"
            description="Requires backend /ai proxy. Set AI_PROVIDER=gemini and GEMINI_API_KEY in todo-fast-api/.env"
            checked={settings.aiEnabled}
            onChange={(v) => onUpdate("aiEnabled", v)}
          />
          {settings.aiEnabled && (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              <Toggle
                label="AI Smart Split"
                description="Smarter breakdown for paragraph input in Smart Split."
                checked={settings.aiSmartSplitEnabled}
                onChange={(v) => onUpdate("aiSmartSplitEnabled", v)}
              />
              <Toggle
                label="AI Focus Coach"
                description="Get a reasoned recommendation in Focus Roulette."
                checked={settings.aiFocusCoachEnabled}
                onChange={(v) => onUpdate("aiFocusCoachEnabled", v)}
              />
              <Toggle
                label="AI Boss Lore"
                description="Generate boss names and taunts for parent tasks."
                checked={settings.aiBossLoreEnabled}
                onChange={(v) => onUpdate("aiBossLoreEnabled", v)}
              />
              <Toggle
                label="AI Daily Briefing"
                description="Morning-style summary under the greeting."
                checked={settings.aiBriefingEnabled}
                onChange={(v) => onUpdate("aiBriefingEnabled", v)}
              />
              <Toggle
                label="Natural Language Add"
                description="Parse 'school with math, english' in the create input."
                checked={settings.aiNaturalLanguageAddEnabled}
                onChange={(v) => onUpdate("aiNaturalLanguageAddEnabled", v)}
              />
            </div>
          )}
        </div>
        </div>
      </div>

      <DialogFooter className="shrink-0 flex-col sm:flex-row gap-2 px-6 py-4 border-t border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#13131f]">
        <Button variant="ghost" size="sm" onClick={onReset} className="text-slate-500">
          Reset defaults
        </Button>
        <Button onClick={onClose} className="tf-accent-bg">
          Done
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default FunSettingsModal;
