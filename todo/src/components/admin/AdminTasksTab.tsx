import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Label } from '../ui/label'
import { useToast } from '../../hooks/use-toast'
import { adminApi, type AdminGroup, type AdminUser, type AdminTodo } from '../../services/adminService'
import TaskTreeView from './TaskTreeView'

interface Props {
  users: AdminUser[]
  groups: AdminGroup[]
}

const AdminTasksTab = ({ users, groups }: Props) => {
  const { toast } = useToast()
  const [filterUserId, setFilterUserId] = useState<number | ''>('')
  const [filterGroupId, setFilterGroupId] = useState<number | ''>('')
  const [todos, setTodos] = useState<AdminTodo[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = await adminApi.getAllTodos({
        userId: filterUserId || undefined,
        groupId: filterGroupId || undefined,
      })
      setTodos(data)
    } catch {
      toast({ variant: 'destructive', title: 'Could not load tasks' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [filterUserId, filterGroupId])

  return (
    <div className="space-y-6">
      <div className="tf-admin-panel tf-surface tf-neon-card flex flex-wrap gap-4 p-4 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.03]">
        <div className="space-y-1 min-w-[180px]">
          <Label className="tf-label text-xs uppercase tracking-wider text-slate-500">Filter by user</Label>
          <select
            value={filterUserId}
            onChange={(e) => { setFilterUserId(e.target.value ? Number(e.target.value) : ''); setFilterGroupId('') }}
            className="tf-admin-select w-full h-10 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-transparent px-3 text-sm"
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name || u.email}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1 min-w-[180px]">
          <Label className="tf-label text-xs uppercase tracking-wider text-slate-500">Filter by group</Label>
          <select
            value={filterGroupId}
            onChange={(e) => { setFilterGroupId(e.target.value ? Number(e.target.value) : ''); setFilterUserId('') }}
            className="tf-admin-select w-full h-10 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-transparent px-3 text-sm"
          >
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <span className="text-sm tf-muted text-slate-500 pb-2">{todos.length} top-level task{todos.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500 tf-accent-text h-8 w-8" /></div>
      ) : todos.length === 0 ? (
        <p className="text-center tf-muted text-slate-400 py-20">No tasks match this filter.</p>
      ) : (
        <div className="space-y-4">
          {todos.map((todo) => (
            <div key={todo.id} className="tf-admin-panel tf-surface tf-neon-card rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-4 bg-white dark:bg-white/[0.03]">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 tf-accent-text">Owner</span>
                  <p className="text-sm font-semibold tf-heading text-slate-800 dark:text-white">
                    {todo.user?.name || todo.user?.email || 'Unknown'}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${todo.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {todo.done ? 'Done' : 'Open'}
                </span>
              </div>
              <TaskTreeView todos={[todo]} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminTasksTab
