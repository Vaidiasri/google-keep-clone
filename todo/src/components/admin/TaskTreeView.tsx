import type { Todo } from '../../types/todo.types'
import { CheckCircle2, Circle } from 'lucide-react'

interface TaskTreeViewProps {
  todos: Todo[]
  depth?: number
}

const TaskTreeView = ({ todos, depth = 0 }: TaskTreeViewProps) => {
  if (!todos.length) {
    return depth === 0 ? (
      <p className="text-sm tf-muted text-slate-400 py-4 text-center">No tasks yet.</p>
    ) : null
  }

  return (
    <ul className={depth === 0 ? 'space-y-1' : 'mt-1 ml-4 space-y-1 border-l border-slate-200 dark:border-white/10 pl-3'}>
      {todos.map((todo) => (
        <li key={todo.id}>
          <div className="flex items-start gap-2 py-1.5 text-sm">
            {todo.done ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
            )}
            <span
              className={
                todo.done
                  ? 'tf-muted text-slate-400 line-through'
                  : 'tf-card-title text-slate-700 dark:text-slate-200'
              }
            >
              {todo.text}
            </span>
          </div>
          {todo.subTodos && todo.subTodos.length > 0 && (
            <TaskTreeView todos={todo.subTodos} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  )
}

export default TaskTreeView
