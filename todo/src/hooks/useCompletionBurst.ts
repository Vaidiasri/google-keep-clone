import { useCallback, useRef, useState } from "react";
import type { BurstEvent } from "../types/fun.types";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useCompletionBurst() {
  const [bursts, setBursts] = useState<BurstEvent[]>([]);
  const lastBurstAt = useRef(0);

  const removeBurst = useCallback((id: string) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const burstAtPoint = useCallback(
    (
      x: number,
      y: number,
      intensity: "subtle" | "normal" | "epic" = "normal"
    ) => {
      const now = Date.now();
      if (now - lastBurstAt.current < 200) return;
      lastBurstAt.current = now;

      const effectiveIntensity = prefersReducedMotion() ? "subtle" : intensity;
      const id = `burst-${now}-${Math.random().toString(36).slice(2, 7)}`;
      setBursts((prev) => [...prev, { id, x, y, intensity: effectiveIntensity }]);
    },
    []
  );

  const burstAtElement = useCallback(
    (
      el: HTMLElement | null,
      intensity: "subtle" | "normal" | "epic" = "normal"
    ) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      burstAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, intensity);
    },
    [burstAtPoint]
  );

  const burstAtTaskId = useCallback(
    (
      taskId: number,
      intensity: "subtle" | "normal" | "epic" = "normal",
      selector = "check"
    ) => {
      const el = document.querySelector(
        `[data-task-${selector}="${taskId}"]`
      ) as HTMLElement | null;
      if (el) {
        burstAtElement(el, intensity);
        return;
      }
      const card = document.getElementById(`task-${taskId}`);
      burstAtElement(card, intensity);
    },
    [burstAtElement]
  );

  return { bursts, burstAtElement, burstAtTaskId, burstAtPoint, removeBurst };
}
