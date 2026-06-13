import { useState } from 'react'
import { Loader2, Plus, MoreVertical, Trash2, Pencil, ListTodo } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../ui/dialog'
import { useToast } from '../../hooks/use-toast'
import { adminApi, type AdminUser, type AdminGroup } from '../../services/adminService'
import TaskTreeView from './TaskTreeView'

interface Props {
  users: AdminUser[]
  groups: AdminGroup[]
  loading: boolean
  onRefresh: () => void
}

const AdminUsersTab = ({ users, groups, loading, onRefresh }: Props) => {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER')
  const [createGroupIds, setCreateGroupIds] = useState<number[]>([])
  const [isCreating, setIsCreating] = useState(false)

  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '', role: 'USER' as 'USER' | 'ADMIN', groupIds: [] as number[] })
  const [isSaving, setIsSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [tasksUser, setTasksUser] = useState<AdminUser | null>(null)
  const [userTodos, setUserTodos] = useState<Awaited<ReturnType<typeof adminApi.getUserTodos>> | null>(null)
  const [tasksLoading, setTasksLoading] = useState(false)

  const openEdit = (u: AdminUser) => {
    setEditUser(u)
    setEditForm({
      name: u.name ?? '',
      email: u.email,
      password: '',
      role: u.role,
      groupIds: u.groups.map((g) => g.id),
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      await adminApi.createUser({ email, name, password, role, groupIds: createGroupIds })
      toast({ title: 'User created', description: email })
      setEmail(''); setName(''); setPassword(''); setCreateGroupIds([])
      onRefresh()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      toast({ variant: 'destructive', title: 'Failed', description: msg ?? 'Could not create user.' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editUser) return
    setIsSaving(true)
    try {
      await adminApi.updateUser(editUser.id, {
        name: editForm.name,
        email: editForm.email,
        ...(editForm.password ? { password: editForm.password } : {}),
        role: editForm.role,
        groupIds: editForm.groupIds,
      })
      toast({ title: 'User updated' })
      setEditUser(null)
      onRefresh()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      toast({ variant: 'destructive', title: 'Update failed', description: msg })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await adminApi.deleteUser(deleteId)
      toast({ title: 'User deleted' })
      setDeleteId(null)
      onRefresh()
    } catch {
      toast({ variant: 'destructive', title: 'Delete failed' })
    } finally {
      setIsDeleting(false)
    }
  }

  const openTasks = async (u: AdminUser) => {
    setTasksUser(u)
    setTasksLoading(true)
    try {
      setUserTodos(await adminApi.getUserTodos(u.id))
    } catch {
      toast({ variant: 'destructive', title: 'Could not load tasks' })
    } finally {
      setTasksLoading(false)
    }
  }

  const toggleGroup = (ids: number[], id: number) =>
    ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr] items-start">
      <div className="tf-admin-form-card tf-neon-card rounded-2xl border border-indigo-200/60 dark:border-indigo-500/30 bg-indigo-600 p-6 text-white space-y-4">
        <h2 className="tf-heading text-lg font-bold">Register member</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-indigo-200 text-xs uppercase tracking-wider">Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} required type="email"
              className="bg-white/10 border-white/20 text-white h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-indigo-200 text-xs uppercase tracking-wider">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              className="bg-white/10 border-white/20 text-white h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-indigo-200 text-xs uppercase tracking-wider">Password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} required type="password"
              className="bg-white/10 border-white/20 text-white h-10" />
          </div>
          <div className="flex gap-2">
            {(['USER', 'ADMIN'] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg ${role === r ? 'bg-white text-indigo-600' : 'bg-white/10'}`}>
                {r}
              </button>
            ))}
          </div>
          {groups.length > 0 && (
            <div className="space-y-2">
              <Label className="text-indigo-200 text-xs uppercase tracking-wider">Groups</Label>
              <div className="flex flex-wrap gap-1.5">
                {groups.map((g) => (
                  <button key={g.id} type="button"
                    onClick={() => setCreateGroupIds((prev) => toggleGroup(prev, g.id))}
                    className={`px-2 py-1 rounded-lg text-xs font-medium border ${createGroupIds.includes(g.id) ? 'bg-white text-indigo-600 border-white' : 'border-white/30'}`}
                    style={createGroupIds.includes(g.id) ? {} : { borderColor: g.color }}>
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Button type="submit" disabled={isCreating} className="w-full bg-white text-indigo-600 hover:bg-slate-100">
            {isCreating ? <Loader2 className="animate-spin h-4 w-4" /> : <><Plus className="h-4 w-4 mr-1" /> Create</>}
          </Button>
        </form>
      </div>

      <div className="tf-admin-panel tf-surface tf-neon-card rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] overflow-hidden">
        <Table className="tf-admin-table">
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Groups</TableHead>
              <TableHead className="text-center">Tasks</TableHead>
              <TableHead className="text-center">Role</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500 tf-accent-text" /></TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-40 text-center tf-muted text-slate-400">No users</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium tf-heading text-slate-900 dark:text-white">{u.name || 'Unnamed'}</div>
                  <div className="text-xs tf-muted text-slate-400">{u.email}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.groups.length ? u.groups.map((g) => (
                      <span key={g.id} className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: g.color }}>{g.name}</span>
                    )) : <span className="text-xs tf-muted text-slate-400">—</span>}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <button type="button" onClick={() => openTasks(u)} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 tf-accent-text hover:underline">
                    {u.taskCount}
                  </button>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(u)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openTasks(u)}><ListTodo className="h-4 w-4 mr-2" /> View tasks</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteId(u.id)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update profile, role, groups, or reset password.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div><Label>New password (optional)</Label><Input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep" /></div>
            <div className="flex gap-2">
              {(['USER', 'ADMIN'] as const).map((r) => (
                <button key={r} type="button" onClick={() => setEditForm({ ...editForm, role: r })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border ${editForm.role === r ? 'tf-accent-bg text-white border-transparent' : 'border-slate-200 dark:border-white/10 tf-muted'}`}>{r}</button>
              ))}
            </div>
            {groups.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {groups.map((g) => (
                  <button key={g.id} type="button"
                    onClick={() => setEditForm({ ...editForm, groupIds: toggleGroup(editForm.groupIds, g.id) })}
                    className={`px-2 py-1 rounded-lg text-xs font-medium border ${editForm.groupIds.includes(g.id) ? 'text-white' : 'text-slate-600 border-slate-200'}`}
                    style={editForm.groupIds.includes(g.id) ? { backgroundColor: g.color, borderColor: g.color } : {}}>
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tasks dialog */}
      <Dialog open={!!tasksUser} onOpenChange={(o) => !o && setTasksUser(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{tasksUser?.name || tasksUser?.email}&apos;s tasks</DialogTitle>
            <DialogDescription>Read-only view of all top-level tasks and subtasks.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 py-2">
            {tasksLoading ? <Loader2 className="animate-spin mx-auto text-indigo-500 tf-accent-text" /> : (
              <TaskTreeView todos={userTodos?.todos ?? []} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>This removes the user, their group memberships, and all tasks.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminUsersTab
