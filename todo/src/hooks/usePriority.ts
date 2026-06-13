import { useState } from "react";

export type Priority = "none" | "low" | "medium" | "high" | "urgent";

type PriorityMap = Record<number, Priority>;

export const PRIORITY_CONFIG: Record<
  Priority,
  {
    label: string;
    strip: string;
    badge: string;
    dot: string;
    ring: string;
    next: Priority;
  }
> = {
  none: {
    label: "",
    strip: "",
    badge: "",
    dot: "bg-slate-200",
    ring: "",
    next: "low",
  },
  low: {
    label: "Low",
    strip: "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    dot: "bg-emerald-400",
    ring: "border-l-emerald-400",
    next: "medium",
  },
  medium: {
    label: "Med",
    strip: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    dot: "bg-amber-400",
    ring: "border-l-amber-400",
    next: "high",
  },
  high: {
    label: "High",
    strip: "bg-orange-500",
    badge: "bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
    dot: "bg-orange-500",
    ring: "border-l-orange-500",
    next: "urgent",
  },
  urgent: {
    label: "Urgent",
    strip: "bg-red-500",
    badge: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    dot: "bg-red-500 animate-pulse",
    ring: "border-l-red-500",
    next: "none",
  },
};

export function usePriority() {
  const [priorities, setPrioritiesState] = useState<PriorityMap>(() => {
    try {
      return JSON.parse(localStorage.getItem("taskflow-priorities") || "{}");
    } catch {
      return {};
    }
  });

  const setPriority = (id: number, priority: Priority) => {
    const updated = { ...priorities, [id]: priority };
    setPrioritiesState(updated);
    localStorage.setItem("taskflow-priorities", JSON.stringify(updated));
  };

  const getPriority = (id: number): Priority => priorities[id] || "none";

  const cyclePriority = (id: number) => {
    const current = getPriority(id);
    setPriority(id, PRIORITY_CONFIG[current].next);
  };

  return { getPriority, setPriority, cyclePriority };
}
