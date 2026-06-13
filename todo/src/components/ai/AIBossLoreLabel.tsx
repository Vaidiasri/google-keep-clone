import type { AIBossLoreResponse } from "../../types/ai.types";

interface AIBossLoreLabelProps {
  lore: AIBossLoreResponse | null;
  taskText: string;
  defeated?: boolean;
  showTaunt?: boolean;
}

const AIBossLoreLabel = ({
  lore,
  taskText,
  defeated,
  showTaunt,
}: AIBossLoreLabelProps) => {
  if (!lore) return null;

  return (
    <div className="mb-1">
      <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400 leading-tight">
        {lore.bossName}
      </p>
      <p className="text-[10px] text-slate-400 truncate" title={taskText}>
        {taskText}
      </p>
      {showTaunt && !defeated && (
        <p className="text-[10px] text-amber-600/90 dark:text-amber-400/90 italic mt-1 animate-pulse">
          &ldquo;{lore.taunt}&rdquo;
        </p>
      )}
      {defeated && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 italic mt-1">
          {lore.defeatMessage}
        </p>
      )}
    </div>
  );
};

export default AIBossLoreLabel;
