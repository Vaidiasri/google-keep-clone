import { Skull } from "lucide-react";
import { getBossHp } from "../../lib/funUtils";
import type { Todo } from "../../types/todo.types";
import BossDefeatedBadge from "./BossDefeatedBadge";

interface BossHPBarProps {
  todo: Todo;
  variant?: "card" | "strip";
  showLabel?: boolean;
  animate?: boolean;
}

const BossHPBar = ({
  todo,
  variant = "card",
  showLabel = true,
  animate = false,
}: BossHPBarProps) => {
  const hp = getBossHp(todo);
  const defeated = hp === 0;

  if (variant === "strip") {
    return (
      <div className="mb-2">
        <div className="h-0.5 bg-slate-200/80 dark:bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`tf-boss-hp-bar h-full rounded-full transition-all duration-500 ${
              defeated
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-red-500 via-orange-500 to-amber-500"
            } ${animate ? "tf-boss-damage-flash" : ""}`}
            style={{ width: `${hp}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] text-red-500/80 dark:text-orange-400/90 font-semibold uppercase tracking-wide flex items-center gap-1">
          <Skull className="h-3 w-3" />
          Boss HP
        </span>
        {showLabel && (
          defeated ? (
            <BossDefeatedBadge />
          ) : (
            <span className="text-[10px] font-bold tabular-nums text-orange-600 dark:text-orange-400">
              {hp}%
            </span>
          )
        )}
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`tf-boss-hp-bar h-full rounded-full transition-all duration-500 ${
            defeated
              ? "bg-emerald-500"
              : "bg-gradient-to-r from-red-600 via-orange-500 to-amber-400"
          } ${animate ? "tf-boss-damage-flash" : ""}`}
          style={{ width: `${hp}%` }}
        />
      </div>
    </div>
  );
};

export default BossHPBar;
