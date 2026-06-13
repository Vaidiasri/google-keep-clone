import { useCallback, useState } from "react";

export function useBossBattle() {
  const [damagedIds, setDamagedIds] = useState<Set<number>>(new Set());

  const triggerDamage = useCallback((parentId: number) => {
    setDamagedIds((prev) => new Set(prev).add(parentId));
    setTimeout(() => {
      setDamagedIds((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    }, 400);
  }, []);

  const triggerDefeat = useCallback((parentId: number) => {
    setDamagedIds((prev) => new Set(prev).add(parentId));
    setTimeout(() => {
      setDamagedIds((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    }, 400);
  }, []);

  const isDamaged = useCallback(
    (id: number) => damagedIds.has(id),
    [damagedIds]
  );

  return { triggerDamage, triggerDefeat, isDamaged, damagedIds };
}
