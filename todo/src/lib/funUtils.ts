import type { Todo } from "../types/todo.types";
import type { Priority } from "../hooks/usePriority";
import type { ParsedBulletList, RouletteCandidate } from "../types/fun.types";

const countAll = (items: Todo[]): { total: number; done: number } => {
  let total = 0;
  let done = 0;
  for (const item of items) {
    total++;
    if (item.done) done++;
    if (item.subTodos?.length) {
      const c = countAll(item.subTodos);
      total += c.total;
      done += c.done;
    }
  }
  return { total, done };
};

export const calculateProgress = (item: Todo): number => {
  if (!item.subTodos?.length) return item.done ? 100 : 0;
  const { total, done } = countAll(item.subTodos);
  return total > 0 ? Math.round((done / total) * 100) : item.done ? 100 : 0;
};

export const getBossHp = (todo: Todo): number => {
  if (!todo.subTodos?.length) return todo.done ? 0 : 100;
  return 100 - calculateProgress(todo);
};

export const isBoss = (todo: Todo): boolean =>
  Boolean(todo.subTodos?.length);

export const findParentId = (items: Todo[], childId: number): number | null => {
  for (const item of items) {
    if (item.subTodos?.some((s) => s.id === childId)) return item.id;
    if (item.subTodos?.length) {
      const found = findParentId(item.subTodos, childId);
      if (found !== null) return found;
    }
  }
  return null;
};

export const findTodoById = (items: Todo[], id: number): Todo | null => {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.subTodos?.length) {
      const found = findTodoById(item.subTodos, id);
      if (found) return found;
    }
  }
  return null;
};

const BULLET_RE = /^(\s*[-*•]\s+|\s*\d+\.\s+)/;

export const parseBulletList = (text: string): ParsedBulletList => {
  const lines = text.split(/\r?\n/);
  let title: string | undefined;
  const items: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (BULLET_RE.test(raw)) {
      const cleaned = line.replace(BULLET_RE, "").trim();
      if (cleaned) items.push(cleaned);
    } else if (!title && items.length === 0) {
      title = line;
    } else {
      items.push(line);
    }
  }

  return { title, items: items.slice(0, 20) };
};

export const pickWeightedRandom = <T extends { weight: number }>(
  candidates: T[]
): T | null => {
  if (candidates.length === 0) return null;
  const total = candidates.reduce((sum, c) => sum + c.weight, 0);
  if (total <= 0) return candidates[0] ?? null;

  let roll = Math.random() * total;
  for (const c of candidates) {
    roll -= c.weight;
    if (roll <= 0) return c;
  }
  return candidates[candidates.length - 1] ?? null;
};

const priorityWeight = (priority: Priority): number => {
  switch (priority) {
    case "urgent":
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
};

const hasIncompleteSubtasks = (todo: Todo): boolean => {
  if (!todo.subTodos?.length) return false;
  const { total, done } = countAll(todo.subTodos);
  return done < total;
};

export const flattenIncompleteTasks = (
  todos: Todo[],
  getPriority: (id: number) => Priority,
  includeSubtasks = true,
  parentText?: string
): RouletteCandidate[] => {
  const result: RouletteCandidate[] = [];

  for (const todo of todos) {
    if (!todo.done) {
      let weight = 1 * priorityWeight(getPriority(todo.id));
      if (hasIncompleteSubtasks(todo)) weight *= 1.5;

      result.push({
        id: todo.id,
        text: todo.text,
        weight,
        parentText,
      });
    }

    if (todo.subTodos?.length && includeSubtasks) {
      result.push(
        ...flattenIncompleteTasks(
          todo.subTodos,
          getPriority,
          true,
          todo.text
        )
      );
    }
  }

  return result;
};

export { countAll };
