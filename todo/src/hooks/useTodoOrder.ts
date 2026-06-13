import { useCallback, useState } from "react";

const STORAGE_KEY = "taskflow-todo-order";

type OrderMap = Record<string, number[]>;

const orderKey = (parentId: number | null) => (parentId === null ? "root" : String(parentId));

const loadOrder = (): OrderMap => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OrderMap) : {};
  } catch {
    return {};
  }
};

const saveOrder = (order: OrderMap) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
};

export const useTodoOrder = () => {
  const [order, setOrder] = useState<OrderMap>(loadOrder);

  const sortByOrder = useCallback(
    <T extends { id: number }>(items: T[], parentId: number | null): T[] => {
      const ids = order[orderKey(parentId)];
      if (!ids?.length) return items;

      const map = new Map(items.map((item) => [item.id, item]));
      const sorted: T[] = [];

      for (const id of ids) {
        const item = map.get(id);
        if (item) {
          sorted.push(item);
          map.delete(id);
        }
      }
      map.forEach((item) => sorted.push(item));
      return sorted;
    },
    [order]
  );

  const reorder = useCallback((parentId: number | null, activeId: number, overId: number, allIds: number[]) => {
    if (activeId === overId) return;

    setOrder((prev) => {
      const key = orderKey(parentId);
      const current = prev[key]?.length ? [...prev[key]] : [...allIds];
      const from = current.indexOf(activeId);
      const to = current.indexOf(overId);
      if (from === -1 || to === -1) return prev;

      const nextIds = [...current];
      nextIds.splice(from, 1);
      nextIds.splice(to, 0, activeId);
      const next = { ...prev, [key]: nextIds };
      saveOrder(next);
      return next;
    });
  }, []);

  return { sortByOrder, reorder };
};
