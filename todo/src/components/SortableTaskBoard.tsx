import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Todo } from "../types/todo.types";
import type { ReactNode } from "react";

type ReorderFn = (parentId: number | null, activeId: number, overId: number) => void;

const DragHandle = ({ listeners, attributes }: { listeners?: ReturnType<typeof useSortable>["listeners"]; attributes?: ReturnType<typeof useSortable>["attributes"] }) => (
  <button
    type="button"
    className="cursor-grab active:cursor-grabbing touch-none p-0.5 rounded text-slate-400 hover:text-[var(--tf-accent,#6366f1)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
    {...listeners}
    {...attributes}
    onClick={(e) => e.stopPropagation()}
    title="Drag to reorder"
  >
    <GripVertical className="h-3.5 w-3.5" />
  </button>
);

const SortableShell = ({
  id,
  children,
  className,
}: {
  id: number;
  children: (handle: ReactNode) => ReactNode;
  className?: string;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`group ${className ?? ""} ${isDragging ? "shadow-2xl ring-2 ring-[var(--tf-accent,#6366f1)]/40 rounded-2xl" : ""}`}>
      {children(<DragHandle listeners={listeners} attributes={attributes} />)}
    </div>
  );
};

export const SortableTaskGrid = ({
  items,
  parentId,
  onReorder,
  renderCard,
}: {
  items: Todo[];
  parentId: number | null;
  onReorder: ReorderFn;
  renderCard: (item: Todo, handle: ReactNode) => ReactNode;
}) => {
  const ids = useMemo(() => items.map((t) => t.id), [items]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(parentId, Number(active.id), Number(over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-min">
          {items.map((item) => (
            <SortableShell key={item.id} id={item.id}>
              {(handle) => renderCard(item, handle)}
            </SortableShell>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export const SortableTaskList = ({
  items,
  parentId,
  onReorder,
  renderRow,
}: {
  items: Todo[];
  parentId: number | null;
  onReorder: ReorderFn;
  renderRow: (item: Todo, handle: ReactNode) => ReactNode;
}) => {
  const ids = useMemo(() => items.map((t) => t.id), [items]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(parentId, Number(active.id), Number(over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
          {items.map((item) => (
            <SortableShell key={item.id} id={item.id}>
              {(handle) => renderRow(item, handle)}
            </SortableShell>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export const SortableSubtaskList = ({
  items,
  parentId,
  onReorder,
  renderSubtask,
}: {
  items: Todo[];
  parentId: number;
  onReorder: ReorderFn;
  renderSubtask: (item: Todo, handle: ReactNode) => ReactNode;
}) => {
  const ids = useMemo(() => items.map((t) => t.id), [items]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(parentId, Number(active.id), Number(over.id));
  };

  if (items.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {items.map((item) => (
            <SortableShell key={item.id} id={item.id} className="rounded-lg">
              {(handle) => renderSubtask(item, handle)}
            </SortableShell>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
