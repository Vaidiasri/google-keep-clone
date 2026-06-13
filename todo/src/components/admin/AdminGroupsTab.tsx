import { useState } from 'react'
import { Loader2, Plus, Trash2, Pencil, Users } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../ui/dialog'
import { useToast } from '../../hooks/use-toast'
import { adminApi, type AdminGroup, type AdminUser } from '../../services/adminService'

const GROUP_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']

interface Props {
  groups: AdminGroup[]
  users: AdminUser[]
  loading: boolean
  onRefresh: () => void
}

const AdminGroupsTab = ({ groups, users, loading, onRefresh }: Props) => {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(GROUP_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)

  const [editGroup, setEditGroup] = useState<AdminGroup | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editColor, setEditColor] = useState(GROUP_COLORS[0])
  const [memberIds, setMemberIds] = useState<number[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<number | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      await adminApi.createGroup({ name, description, color })
      toast({ title: 'Group created', description: name })
      setName(''); setDescription('')
      onRefresh()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      toast({ variant: 'destructive', title: 'Failed', description: msg })
    } finally {
      setIsCreating(false)
    }
  }

  const openEdit = (g: AdminGroup) => {
    setEditGroup(g)
    setEditName(g.name)
    setEditDesc(g.description ?? '')
    setEditColor(g.color)
    setMemberIds(g.members?.map((m) => m.id) ?? [])
  }

  const handleSave = async () => {
    if (!editGroup) return
    setIsSaving(true)
    try {
      await adminApi.updateGroup(editGroup.id, { name: editName, description: editDesc, color: editColor })
      await adminApi.setGroupMembers(editGroup.id, memberIds)
      toast({ title: 'Group updated' })
      setEditGroup(null)
      onRefresh()
    } catch {
      toast({ variant: 'destructive', title: 'Update failed' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await adminApi.deleteGroup(deleteId)
      toast({ title: 'Group deleted' })
      setDeleteId(null)
      onRefresh()
    } catch {
      toast({ variant: 'destructive', title: 'Delete failed' })
    }
  }

  const toggleMember = (id: number) =>
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <form onSubmit={handleCreate} className="tf-admin-panel tf-surface tf-neon-card rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-5 space-y-4 bg-white dark:bg-white/[0.03]">
        <h2 className="tf-heading font-bold text-slate-900 dark:text-white">New group</h2>
        <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" /></div>
        <div className="flex gap-2 flex-wrap">
          {GROUP_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full border-2 ${color === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <Button type="submit" disabled={isCreating} className="w-full tf-accent-bg">
          {isCreating ? <Loader2 className="animate-spin h-4 w-4" /> : <><Plus className="h-4 w-4 mr-1" /> Create group</>}
        </Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          <div className="col-span-2 py-16 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500 tf-accent-text" /></div>
        ) : groups.length === 0 ? (
          <p className="col-span-2 text-center tf-muted text-slate-400 py-16">No groups yet — create one to organize users.</p>
        ) : groups.map((g) => (
          <div key={g.id} className="tf-admin-panel tf-surface tf-neon-card rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-5 bg-white dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                <h3 className="tf-heading font-bold text-slate-900 dark:text-white">{g.name}</h3>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(g)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeleteId(g.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {g.description && <p className="text-sm tf-muted text-slate-500 mt-1">{g.description}</p>}
            <div className="flex items-center gap-1.5 mt-3 text-xs tf-muted text-slate-400">
              <Users className="h-3.5 w-3.5" />
              {g.memberCount ?? g.members?.length ?? 0} members
            </div>
            {g.members && g.members.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {g.members.map((m) => (
                  <span key={m.id} className="text-[10px] bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">{m.name || m.email}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!editGroup} onOpenChange={(o) => !o && setEditGroup(null)}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit group</DialogTitle>
            <DialogDescription>Update details and assign members.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto flex-1 py-2">
            <div><Label>Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div><Label>Description</Label><Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /></div>
            <div className="flex gap-2 flex-wrap">
              {GROUP_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setEditColor(c)}
                  className={`h-7 w-7 rounded-full border-2 ${editColor === c ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <Label>Members</Label>
            <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.04] cursor-pointer text-sm">
                  <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggleMember(u.id)} className="rounded" />
                  <span className="font-medium">{u.name || u.email}</span>
                  <span className="text-xs text-slate-400 ml-auto">{u.email}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGroup(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete group?</DialogTitle>
            <DialogDescription>Members are unlinked but not deleted.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminGroupsTab
