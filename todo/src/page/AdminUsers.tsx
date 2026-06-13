import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, ArrowLeft, Users, FolderKanban, ListTodo, Loader2, Sun, Moon, Palette } from 'lucide-react'
import { Button } from '../components/ui/button'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../hooks/use-toast'
import ThemeStudio from '../components/ThemeStudio'
import { adminApi, type AdminUser, type AdminGroup } from '../services/adminService'
import AdminUsersTab from '../components/admin/AdminUsersTab'
import AdminGroupsTab from '../components/admin/AdminGroupsTab'
import AdminTasksTab from '../components/admin/AdminTasksTab'

type AdminTab = 'users' | 'groups' | 'tasks'

const TABS: { id: AdminTab; label: string; icon: typeof Users }[] = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'groups', label: 'Groups', icon: FolderKanban },
  { id: 'tasks', label: 'All Tasks', icon: ListTodo },
]

const AdminUsers = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isDark, toggle: toggleTheme, openThemeStudio, isCustomActive } = useTheme()
  const [tab, setTab] = useState<AdminTab>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [groups, setGroups] = useState<AdminGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      toast({ variant: 'destructive', title: 'Access denied', description: 'Admin role required.' })
      navigate('/', { replace: true })
    }
  }, [user, navigate, toast])

  const refresh = useCallback(async () => {
    if (user?.role !== 'ADMIN') return
    setLoading(true)
    const [usersResult, groupsResult] = await Promise.allSettled([
      adminApi.getUsers(),
      adminApi.getGroups(),
    ])

    if (usersResult.status === 'fulfilled') {
      setUsers(usersResult.value)
    } else {
      toast({
        variant: 'destructive',
        title: 'Could not load users',
        description: 'Restart the backend server to apply admin database updates.',
      })
    }

    if (groupsResult.status === 'fulfilled') {
      setGroups(groupsResult.value)
    } else {
      setGroups([])
    }

    setLoading(false)
  }, [user, toast])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="tf-app-shell flex flex-col min-h-screen bg-[#f4f5f7] dark:bg-[#0b0b12] text-slate-800 dark:text-slate-200">
      <div className="tf-noise-layer" aria-hidden />
      <div className="tf-app-inner flex flex-col flex-1 min-h-0">
        <header className="tf-admin-header tf-topbar sticky top-0 z-10 border-b border-slate-200/80 dark:border-white/[0.06] bg-white/90 dark:bg-[#0f0f18]/90 backdrop-blur px-6 py-4">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="tf-icon-btn shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="tf-heading text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400 tf-accent-text" />
                  Admin Console
                </h1>
                <p className="tf-subtext text-sm text-slate-500">Users, groups & workspace tasks</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="tf-admin-tabs tf-view-toggle flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`tf-admin-tab tf-view-toggle-btn flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      tab === id
                        ? 'tf-admin-tab-active tf-view-toggle-active bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="tf-icon-btn h-9 w-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                title="Toggle theme"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={openThemeStudio}
                className={`tf-icon-btn h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
                  isCustomActive ? 'tf-icon-btn-active text-indigo-500' : 'text-slate-400 hover:text-indigo-500'
                }`}
                title="Theme Studio"
              >
                <Palette className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="tf-main flex-1 max-w-[1600px] w-full mx-auto p-6">
          {loading && tab !== 'tasks' ? (
            <div className="py-24 text-center">
              <Loader2 className="animate-spin h-10 w-10 mx-auto text-indigo-500 tf-accent-text" />
            </div>
          ) : (
            <>
              {tab === 'users' && (
                <AdminUsersTab users={users} groups={groups} loading={loading} onRefresh={refresh} />
              )}
              {tab === 'groups' && (
                <AdminGroupsTab groups={groups} users={users} loading={loading} onRefresh={refresh} />
              )}
              {tab === 'tasks' && (
                <AdminTasksTab users={users} groups={groups} />
              )}
            </>
          )}
        </main>
      </div>

      <ThemeStudio />
    </div>
  )
}

export default AdminUsers
