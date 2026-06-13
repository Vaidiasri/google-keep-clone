import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import { todoApi } from "../services/todoService";
import type { Todo } from "../types/todo.types";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { usePriority, PRIORITY_CONFIG, type Priority } from "../hooks/usePriority";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useFunSettings } from "../hooks/useFunSettings";
import { useBossBattle } from "../hooks/useBossBattle";
import { useCompletionBurst } from "../hooks/useCompletionBurst";
import { useFocusRoulette } from "../hooks/useFocusRoulette";
import { useSmartSplit } from "../hooks/useSmartSplit";
import { useBossLore, useBossLorePrefetch } from "../hooks/useBossLore";
import { useAIBriefing } from "../hooks/useAIBriefing";
import { useAIAssistant } from "../hooks/useAIAssistant";
import { findParentId, findTodoById, getBossHp, isBoss } from "../lib/funUtils";
import { buildTodoSummaries, looksLikeNaturalLanguageTask } from "../lib/aiUtils";
import { aiApi } from "../services/aiService";
import AIBriefingCard from "../components/ai/AIBriefingCard";
import NaturalLanguagePreview from "../components/ai/NaturalLanguagePreview";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import ShortcutsModal from "../components/ShortcutsModal";
import ThemeStudio from "../components/ThemeStudio";
import FunSettingsModal from "../components/fun/FunSettingsModal";
import FocusRouletteModal from "../components/fun/FocusRouletteModal";
import SmartSplitModal from "../components/fun/SmartSplitModal";
import CompletionBurst from "../components/fun/CompletionBurst";
import BossHPBar from "../components/fun/BossHPBar";
import BossDefeatedBadge from "../components/fun/BossDefeatedBadge";
import { SortableTaskGrid, SortableTaskList, SortableSubtaskList } from "../components/SortableTaskBoard";
import { useTodoOrder } from "../hooks/useTodoOrder";
import {
  Search, Shield, LogOut, Plus, Trash2, Edit2, Check, X,
  LayoutGrid, List, TrendingUp, Star, CheckCircle2, Clock,
  BarChart3, Sun, Moon, Keyboard, Flag, ChevronLeft, ChevronRight, ChevronDown, Palette,
  Sparkles, Dices, ListTree, Skull,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "../components/ui/dialog";
import type { AIBossLoreResponse } from "../types/ai.types";

interface FunUIProps {
  bossBattleEnabled: boolean;
  aiBossLoreEnabled: boolean;
  isDamaged: (id: number) => boolean;
  focusedTaskId: number | null;
  getLore: (todo: Todo) => AIBossLoreResponse | null;
}

interface TodoActions {
  onCheck: (id: number, currentDone: boolean, subTodos?: Todo[], options?: { direct?: boolean }) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  startEdit: (id: number, text: string) => void;
  cancelEdit: () => void;
  setEditingId: (id: number | null) => void;
  handleAddChild: (parentId: number) => void;
  handleAddSuperChild: (parentId: number, childId: number) => void;
  openInput: (id: number | null) => void;
  openSubInput: (id: number | null) => void;
  openfor: number | null;
  subopenfor: number | null;
  editingId: number | null;
  editText: string;
  setEditText: (text: string) => void;
  subtodo: string;
  setSubtodo: (text: string) => void;
  supersubtodo: string;
  setSuperSubtodo: (text: string) => void;
  getPriority: (id: number) => import("../hooks/usePriority").Priority;
  cyclePriority: (id: number) => void;
}

const countAll = (items: Todo[]): { total: number; done: number } => {
  let total = 0, done = 0;
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

const calculateProgress = (item: Todo) => {
  if (!item.subTodos?.length) return item.done ? 100 : 0;
  const { total, done } = countAll(item.subTodos);
  return total > 0 ? Math.round((done / total) * 100) : item.done ? 100 : 0;
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const SIDEBAR_COLLAPSED_KEY = "taskflow-sidebar-collapsed";
const PROGRESS_EXPANDED_KEY = "taskflow-progress-expanded";

const NestedTodo = () => {
  const [todo, setTodo] = useState("");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [subtodo, setSubtodo] = useState("");
  const [supersubtodo, setSuperSubtodo] = useState("");
  const [openfor, setOpenfor] = useState<number | null>(null);
  const [subopenfor, setSubOpenfor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [viewMode, setViewMode] = useState<"focus" | "grid" | "list">("focus");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"
  );
  const [progressExpanded, setProgressExpanded] = useState(
    () => localStorage.getItem(PROGRESS_EXPANDED_KEY) !== "false"
  );
  const [showFunSettings, setShowFunSettings] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<number | null>(null);
  const [nlPreview, setNlPreview] = useState<{ parent: string; subtasks: string[] } | null>(null);
  const [nlLoading, setNlLoading] = useState(false);

  const taskInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { user, logout } = useAuth();
  const { isDark, toggle: toggleTheme, openThemeStudio, isCustomActive } = useTheme();
  const { getPriority, cyclePriority } = usePriority();
  const { sortByOrder, reorder } = useTodoOrder();
  const { settings: funSettings, updateSetting: updateFunSetting, resetDefaults: resetFunDefaults } = useFunSettings();
  const { triggerDamage, triggerDefeat, isDamaged } = useBossBattle();
  const { bursts, burstAtTaskId, removeBurst } = useCompletionBurst();
  const roulette = useFocusRoulette(getPriority);
  const navigate = useNavigate();
  const filteredTodosRef = useRef<Todo[]>([]);

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await todoApi.getAllTodos();
      setTodos(data);
      setError(null);
      return data;
    } catch {
      setError("Could not load tasks.");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const smartSplit = useSmartSplit(fetchTodos);
  const aiAssistant = useAIAssistant();
  const bossLoreEnabled = funSettings.aiEnabled && funSettings.aiBossLoreEnabled;
  const { getLore, prefetchBosses } = useBossLore(bossLoreEnabled);
  const briefing = useAIBriefing();

  const todoSummaries = buildTodoSummaries(todos, getPriority);
  useBossLorePrefetch(bossLoreEnabled, todos, prefetchBosses);

  const aiActive = funSettings.aiEnabled;

  const funUI: FunUIProps = {
    bossBattleEnabled: funSettings.bossBattleEnabled,
    aiBossLoreEnabled: bossLoreEnabled,
    isDamaged,
    focusedTaskId,
    getLore,
  };

  const scrollToTask = useCallback((id: number) => {
    setFocusedTaskId(id);
    setTimeout(() => {
      document.getElementById(`task-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    setTimeout(() => setFocusedTaskId(null), 3000);
  }, []);

  const handleFocusTaskSelect = useCallback((id: number) => {
    setViewMode("grid");
    scrollToTask(id);
  }, [scrollToTask]);

  const handleGoToRouletteTask = useCallback((taskId?: number) => {
    const id = taskId ?? roulette.winner?.id ?? roulette.coachResult?.taskId;
    if (!id) return;
    scrollToTask(id);
    roulette.closeRoulette();
  }, [roulette, scrollToTask]);

  const openRouletteWithContext = useCallback(() => {
    roulette.openRoulette(
      filteredTodosRef.current,
      funSettings.rouletteIncludeSubtasks,
      buildTodoSummaries(filteredTodosRef.current, getPriority)
    );
  }, [roulette, funSettings.rouletteIncludeSubtasks, getPriority]);

  const handleSmartSplitConfirm = useCallback(async () => {
    const result = await smartSplit.execute();
    if (!result) return;
    if (result.success) {
      toast({ title: "Smart Split complete", description: `Created ${result.created} subtask${result.created === 1 ? "" : "s"}.` });
    } else {
      toast({
        variant: "destructive",
        title: "Partial create",
        description: `Created ${result.created} of ${result.total} subtasks before an error.`,
      });
    }
  }, [smartSplit, toast]);

  const shortcutHandlers = useCallback(() => ({
    onFocusInput: () => taskInputRef.current?.focus(),
    onFocusSearch: () => searchInputRef.current?.focus(),
    onGridView: () => setViewMode("grid"),
    onListView: () => setViewMode("list"),
    onFocusView: () => setViewMode("focus"),
    onShowShortcuts: () => setShowShortcuts(true),
    onFocusRoulette: () => {
      if (funSettings.focusRouletteEnabled) openRouletteWithContext();
    },
    onSmartSplit: () => {
      if (funSettings.smartSplitEnabled) smartSplit.open();
    },
    onEscape: () => {
      setEditingId(null);
      setShowShortcuts(false);
      setDeleteId(null);
      setShowFunSettings(false);
      roulette.closeRoulette();
      smartSplit.close();
      setNlPreview(null);
    },
  }), [funSettings, roulette, smartSplit, openRouletteWithContext]);
  useKeyboardShortcuts(shortcutHandlers());

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  useEffect(() => {
    if (
      aiActive &&
      funSettings.aiBriefingEnabled &&
      todos.length > 0 &&
      briefing.visible
    ) {
      void briefing.loadBriefing(todoSummaries, user?.name?.split(" ")[0] ?? "there");
    }
  }, [aiActive, funSettings.aiBriefingEnabled, todos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (aiActive) void aiAssistant.fetchStatus();
  }, [aiActive]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem(PROGRESS_EXPANDED_KEY, String(progressExpanded));
  }, [progressExpanded]);

  const handleLogout = () => { logout(); navigate("/login"); };

  const handleParent = async () => {
    if (!todo.trim()) return;

    const input = todo.trim();
    const useNL =
      aiActive &&
      funSettings.aiNaturalLanguageAddEnabled &&
      looksLikeNaturalLanguageTask(input);

    if (useNL) {
      setNlLoading(true);
      try {
        const parsed = await aiApi.parseTask(input);
        if (parsed.subtasks.length > 0) {
          setNlPreview(parsed);
          return;
        }
      } catch {
        toast({
          variant: "destructive",
          title: "AI parse failed",
          description: "Creating as a single task instead.",
        });
      } finally {
        setNlLoading(false);
      }
    }

    setLoading(true);
    try {
      await todoApi.createTodo({ text: input });
      setTodo("");
      await fetchTodos();
      toast({ title: "Task Created", description: "Your task has been added." });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to create task." });
    } finally { setLoading(false); }
  };

  const confirmNaturalLanguageCreate = async () => {
    if (!nlPreview) return;
    setNlLoading(true);
    try {
      const parent = await todoApi.createTodo({ text: nlPreview.parent });
      for (const sub of nlPreview.subtasks) {
        await todoApi.createTodo({ text: sub, parentId: parent.id });
      }
      setTodo("");
      setNlPreview(null);
      await fetchTodos();
      toast({
        title: "Tasks Created",
        description: `Created "${nlPreview.parent}" with ${nlPreview.subtasks.length} subtasks.`,
      });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to create tasks." });
    } finally {
      setNlLoading(false);
    }
  };

  const handleAIParseClick = async () => {
    if (!todo.trim() || !aiActive || !funSettings.aiNaturalLanguageAddEnabled) return;
    setNlLoading(true);
    try {
      const parsed = await aiApi.parseTask(todo.trim());
      if (parsed.subtasks.length > 0) {
        setNlPreview(parsed);
      } else {
        toast({ title: "Single task", description: "No subtasks detected — use Add Task normally." });
      }
    } catch {
      toast({ variant: "destructive", title: "AI unavailable", description: "Could not parse input." });
    } finally {
      setNlLoading(false);
    }
  };

  const handelChild = async (parentId: number) => {
    if (!subtodo.trim()) return;
    setLoading(true);
    try {
      await todoApi.createTodo({ text: subtodo, parentId });
      setSubtodo("");
      setOpenfor(null);
      await fetchTodos();
      toast({ title: "Subtask Added" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to add subtask." });
    } finally { setLoading(false); }
  };

  const handleSuperChild = async (_parentId: number, childId: number) => {
    if (!supersubtodo.trim()) return;
    setLoading(true);
    try {
      await todoApi.createTodo({ text: supersubtodo, parentId: childId });
      setSuperSubtodo("");
      await fetchTodos();
      toast({ title: "Nested Task Added" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to add nested task." });
    } finally { setLoading(false); }
  };

  const handleCheck = async (
    id: number,
    currentDone: boolean,
    subTodos: Todo[] = [],
    options?: { direct?: boolean }
  ) => {
    const newStatus = !currentDone;
    const isDirect = options?.direct !== false;
    const parentId = findParentId(todos, id);
    const checkedItem = findTodoById(todos, id);
    const isParentBoss = checkedItem && isBoss(checkedItem) && checkedItem.subTodos?.length;

    setLoading(true);
    try {
      await todoApi.updateTodo(id, { done: newStatus });
      const cascade = async (children: Todo[], status: boolean) => {
        for (const child of children) {
          await todoApi.updateTodo(child.id, { done: status });
          if (child.subTodos?.length) await cascade(child.subTodos, status);
        }
      };
      if (subTodos.length) await cascade(subTodos, newStatus);
      const data = await fetchTodos();

      if (isDirect && funSettings.completionBurstEnabled && newStatus) {
        requestAnimationFrame(() => {
          burstAtTaskId(id, funSettings.completionBurstIntensity);
        });
      }

      if (funSettings.bossBattleEnabled) {
        if (isParentBoss && newStatus) {
          triggerDefeat(id);
          if (funSettings.completionBurstEnabled) {
            requestAnimationFrame(() => burstAtTaskId(id, "epic", "card"));
          }
        } else if (parentId && newStatus) {
          triggerDamage(parentId);
          const parent = findTodoById(data, parentId);
          if (parent && getBossHp(parent) === 0) {
            triggerDefeat(parentId);
            if (funSettings.completionBurstEnabled) {
              requestAnimationFrame(() => burstAtTaskId(parentId, "epic", "card"));
            }
          }
        }
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update task." });
    } finally { setLoading(false); }
  };

  const startEdit = (id: number, text: string) => { setEditingId(id); setEditText(text); };

  const handleUpdateText = async (id: number) => {
    if (!editText.trim()) return;
    setLoading(true);
    try {
      await todoApi.updateTodo(id, { text: editText.trim() });
      setEditingId(null);
      await fetchTodos();
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update task." });
    } finally { setLoading(false); }
  };

  const handleDelete = (id: number) => setDeleteId(id);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await todoApi.deleteTodo(deleteId);
      await fetchTodos();
      toast({ title: "Task Deleted" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete task." });
    } finally { setLoading(false); setDeleteId(null); }
  };

  const actionHandlers: TodoActions = {
    onCheck: handleCheck, onDelete: handleDelete, onEdit: handleUpdateText,
    startEdit, cancelEdit: () => setEditingId(null), setEditingId,
    handleAddChild: handelChild, handleAddSuperChild: handleSuperChild,
    openInput: setOpenfor, openSubInput: setSubOpenfor,
    openfor, subopenfor, editingId, editText, setEditText,
    subtodo, setSubtodo, supersubtodo, setSuperSubtodo,
    getPriority, cyclePriority,
  };

  const filteredTodos = todos.filter(t => t.text.toLowerCase().includes(searchQuery.toLowerCase()));
  filteredTodosRef.current = filteredTodos;
  const sortedFilteredTodos = sortByOrder(filteredTodos, null);

  const handleReorder = useCallback((parentId: number | null, activeId: number, overId: number) => {
    const findSubtasks = (items: Todo[], pid: number): Todo[] | null => {
      for (const t of items) {
        if (t.id === pid) return t.subTodos ?? [];
        if (t.subTodos?.length) {
          const found = findSubtasks(t.subTodos, pid);
          if (found !== null) return found;
        }
      }
      return null;
    };
    const items = parentId === null ? filteredTodos : (findSubtasks(todos, parentId) ?? []);
    const sorted = sortByOrder(items, parentId);
    reorder(parentId, activeId, overId, sorted.map(i => i.id));
  }, [filteredTodos, todos, sortByOrder, reorder]);

  // Top-level counts (for stats cards)
  const topLevelCompleted = todos.filter(t => t.done).length;
  const topLevelPending = todos.filter(t => !t.done).length;

  const activeCount = filteredTodos.filter(t => !t.done).length;

  return (
    <div
      className="tf-app-shell flex h-screen bg-[#f4f5f7] dark:bg-[#0b0b12] text-slate-800 dark:text-slate-200 overflow-hidden"
      onClick={() => { setOpenfor(null); setSubOpenfor(null); }}
    >
      <div className="tf-noise-layer" aria-hidden />
      <div className="tf-app-inner flex flex-1 min-w-0 min-h-0 w-full">
      {/* ── SIDEBAR ── */}
      <aside
        className={`tf-sidebar hidden md:flex flex-shrink-0 flex-col h-full border-r border-slate-200/70 dark:border-white/[0.05] transition-[width] duration-300 ease-in-out ${
          sidebarCollapsed ? "w-[4.25rem]" : "w-60"
        }`}
      >
        {/* Logo + collapse toggle */}
        <div className={`tf-sidebar-head h-14 flex items-center border-b border-slate-100 dark:border-white/[0.04] flex-shrink-0 ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          <div className={`flex items-center min-w-0 ${sidebarCollapsed ? "" : "gap-2.5"}`}>
            <div className="tf-logo tf-accent-bg h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25 flex-shrink-0">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="tf-brand-text font-bold text-slate-900 dark:text-white tracking-tight truncate">TaskFlow</span>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="tf-icon-btn h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors flex-shrink-0"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Scrollable: menu + progress */}
        <div className={`flex-1 min-h-0 overflow-y-auto py-4 ${sidebarCollapsed ? "px-2" : "px-3"}`}>
          {!sidebarCollapsed && (
            <p className="tf-label text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 px-3 mb-2.5">Menu</p>
          )}
          <nav className="space-y-1 relative z-10">
            <SideNavItem collapsed={sidebarCollapsed} icon={<BarChart3 className="h-4 w-4" />} label="Today's Focus" active={viewMode === "focus"} onClick={() => setViewMode("focus")} />
            <SideNavItem collapsed={sidebarCollapsed} icon={<LayoutGrid className="h-4 w-4" />} label="Board View" active={viewMode === "grid"} onClick={() => setViewMode("grid")} />
            <SideNavItem collapsed={sidebarCollapsed} icon={<List className="h-4 w-4" />} label="List View" active={viewMode === "list"} onClick={() => setViewMode("list")} />
            {user?.role === "ADMIN" && (
              <>
                <div className={`tf-divider my-3 border-t border-slate-100 dark:border-white/[0.04] ${sidebarCollapsed ? "mx-1" : ""}`} />
                {!sidebarCollapsed && (
                  <p className="tf-label text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 px-3 mb-2.5">Admin</p>
                )}
                <SideNavItem collapsed={sidebarCollapsed} icon={<Shield className="h-4 w-4" />} label="Manage Users" onClick={() => navigate("/admin")} />
              </>
            )}
          </nav>

          {todos.length > 0 && (
            <div className={sidebarCollapsed ? "mt-4" : "mt-6"}>
              <SidebarProgressPanel
                todos={todos}
                collapsed={sidebarCollapsed}
                expanded={progressExpanded}
                onToggle={() => setProgressExpanded(v => !v)}
                bossBattleEnabled={funSettings.bossBattleEnabled}
              />
            </div>
          )}
        </div>

        {/* Expand button when collapsed */}
        {sidebarCollapsed && (
          <div className="flex-shrink-0 px-2 pb-2">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="tf-icon-btn w-full h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* User — pinned to bottom */}
        <div className={`tf-sidebar-foot flex-shrink-0 pb-4 pt-3 border-t border-slate-100 dark:border-white/[0.04] ${sidebarCollapsed ? "px-2" : "px-3"}`}>
          <div className={`flex items-center rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors group cursor-default ${sidebarCollapsed ? "justify-center py-2" : "gap-3 px-2 py-2.5"}`}>
            <div
              className="tf-avatar tf-accent-bg h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm"
              title={sidebarCollapsed ? user?.name ?? undefined : undefined}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="tf-user-name text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-none">{user?.name}</p>
                  <p className="tf-user-email text-[10px] text-slate-400 dark:text-slate-600 truncate mt-0.5">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="tf-topbar h-14 flex items-center justify-between px-5 md:px-7 border-b border-slate-200/80 dark:border-white/[0.05] backdrop-blur-xl flex-shrink-0 z-40">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">TaskFlow</span>
          </div>

          {/* Search */}
          <div className="tf-search hidden md:flex items-center gap-2 bg-slate-50 dark:bg-white/[0.04] rounded-xl px-3.5 py-2.5 border border-slate-200/70 dark:border-white/[0.06] w-72 focus-within:border-indigo-400/60 dark:focus-within:border-indigo-500/40 focus-within:bg-white dark:focus-within:bg-white/[0.06] transition-all duration-200">
            <Search className="tf-input-icon h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <input
              ref={searchInputRef}
              className="bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 flex-1"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:block text-[10px] text-slate-400 border border-slate-200 dark:border-white/[0.1] rounded-md px-1.5 py-0.5 font-mono bg-white dark:bg-white/[0.04]">/</kbd>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFunSettings(true)}
              className="tf-icon-btn h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              title="Fun Stack settings"
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <button onClick={() => setShowShortcuts(true)} className="tf-icon-btn h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors" title="Keyboard Shortcuts">
              <Keyboard className="h-4 w-4" />
            </button>
            <button onClick={toggleTheme} className="tf-icon-btn h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors" title="Toggle Theme">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={openThemeStudio}
              className={`tf-icon-btn h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                isCustomActive ? "tf-icon-btn-active" : ""
              }`}
              title="Theme Studio"
            >
              <Palette className="h-4 w-4" />
            </button>
            <div className="md:hidden ml-1 h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white cursor-pointer" onClick={handleLogout}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="tf-main flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 space-y-7">

            {/* Error */}
            {error && (
              <div className="p-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-center justify-between gap-3">
                <span>{error}</span>
                <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
              </div>
            )}

            {/* Greeting */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="tf-heading text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {getGreeting()}, {user?.name?.split(" ")[0]}.
                </h1>
                <p className="tf-subtext text-sm text-slate-500 mt-1.5">
                  {activeCount === 0 && todos.length > 0
                    ? "All tasks completed — great work!"
                    : activeCount === 0
                      ? "Your workspace is empty. Add a task to get started."
                      : `You have ${activeCount} active task${activeCount === 1 ? "" : "s"} remaining.`}
                </p>
              </div>

              {/* Desktop view toggle + fun actions */}
              <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                {funSettings.focusRouletteEnabled && (
                  <button
                    onClick={openRouletteWithContext}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200/60 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <Dices className="h-3.5 w-3.5" /> Focus Roulette
                  </button>
                )}
                {aiActive && funSettings.aiBriefingEnabled && (
                  <button
                    onClick={() => briefing.refresh(todoSummaries, user?.name?.split(" ")[0] ?? "there")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200/60 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:border-amber-300 dark:hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Daily Briefing
                  </button>
                )}
                {funSettings.smartSplitEnabled && (
                  <button
                    onClick={() => smartSplit.open()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200/60 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:border-violet-300 dark:hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                  >
                    <ListTree className="h-3.5 w-3.5" /> Smart Split
                  </button>
                )}
              <div className="tf-view-toggle flex items-center bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200/60 dark:border-white/[0.06] gap-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`tf-view-toggle-btn flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "grid" ? "tf-view-toggle-active bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Board
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`tf-view-toggle-btn flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "list" ? "tf-view-toggle-active bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                  <List className="h-3.5 w-3.5" /> List
                </button>
              </div>
              </div>
            </div>

            {aiActive && funSettings.aiBriefingEnabled && briefing.visible && (
              <AIBriefingCard
                briefing={briefing.briefing}
                loading={briefing.loading}
                error={briefing.error}
                onRefresh={() => briefing.refresh(todoSummaries, user?.name?.split(" ")[0] ?? "there")}
                onDismiss={briefing.dismiss}
              />
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <StatCard icon={<BarChart3 className="h-4 w-4 text-slate-500 dark:text-slate-400" />} iconBg="bg-slate-100 dark:bg-white/[0.06]" value={todos.length} label="Total Tasks" valueClass="tf-stat-value" border="border-slate-200/60 dark:border-white/[0.06]" />
              <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} iconBg="bg-emerald-50 dark:bg-emerald-500/10" value={topLevelCompleted} label="Completed" valueClass="tf-stat-value-success" border="border-emerald-100 dark:border-emerald-500/15" />
              <StatCard icon={<Clock className="h-4 w-4 text-indigo-500" />} iconBg="bg-indigo-50 dark:bg-indigo-500/10" value={topLevelPending} label="Remaining" valueClass="tf-stat-value-accent" border="border-indigo-100 dark:border-indigo-500/15" />
            </div>

            {/* Create input */}
            <div className="group/input relative">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-indigo-500/30 via-violet-500/30 to-pink-500/30 opacity-0 group-focus-within/input:opacity-100 blur-sm transition-opacity duration-500" />
              <div className="relative flex items-center gap-3 tf-surface tf-neon-card bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-200/70 dark:border-white/[0.07] group-focus-within/input:border-indigo-300/60 dark:group-focus-within/input:border-indigo-500/30 px-4 py-3 shadow-sm transition-all duration-300">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <Input
                  ref={taskInputRef}
                  className="flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent text-[15px] font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600 text-slate-900 dark:text-slate-100 py-0 h-auto"
                  placeholder="What needs to get done? Press N to focus..."
                  value={todo}
                  onChange={(e) => setTodo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleParent()}
                />
                {aiActive && funSettings.aiNaturalLanguageAddEnabled && (
                  <button
                    type="button"
                    onClick={handleAIParseClick}
                    disabled={nlLoading || !todo.trim()}
                    className="h-9 w-9 rounded-xl border border-amber-200/60 dark:border-amber-500/30 flex items-center justify-center text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors flex-shrink-0 disabled:opacity-30"
                    title="AI parse (natural language)"
                  >
                    <Sparkles className={`h-4 w-4 ${nlLoading ? "animate-pulse" : ""}`} />
                  </button>
                )}
                <button
                  onClick={handleParent}
                  disabled={loading || nlLoading || !todo.trim()}
                  className="tf-accent-bg h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                >
                  Add Task
                </button>
                {funSettings.smartSplitEnabled && (
                  <button
                    type="button"
                    onClick={() => smartSplit.open()}
                    className="h-9 px-3 rounded-xl border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-500/40 transition-colors flex-shrink-0 hidden sm:flex items-center gap-1.5"
                    title="Smart Split (Ctrl+Shift+V)"
                  >
                    <ListTree className="h-3.5 w-3.5" />
                    Split
                  </button>
                )}
              </div>
            </div>

            {/* Mobile search */}
            <div className="md:hidden">
              <div className="flex items-center gap-2 bg-white dark:bg-white/[0.04] rounded-xl px-3.5 py-2.5 border border-slate-200 dark:border-white/[0.06] shadow-sm">
                <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  className="bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 flex-1"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Task grid / list / focus */}
            {viewMode === "focus" ? (
              <TodaysFocusPanel
                tasks={sortedFilteredTodos}
                getPriority={getPriority}
                onSelectTask={handleFocusTaskSelect}
                onOpenRoulette={funSettings.focusRouletteEnabled ? openRouletteWithContext : undefined}
                bossBattleEnabled={funSettings.bossBattleEnabled}
              />
            ) : viewMode === "grid" ? (
              <SortableTaskGrid
                items={sortedFilteredTodos}
                parentId={null}
                onReorder={(pid, active, over) => handleReorder(pid, active, over)}
                renderCard={(item, handle) => (
                  <TodoCard item={item} actions={actionHandlers} dragHandle={handle} sortByOrder={sortByOrder} onReorder={handleReorder} fun={funUI} />
                )}
              />
            ) : (
              <div className="tf-surface tf-neon-card bg-white dark:bg-white/[0.02] rounded-2xl border border-slate-200/60 dark:border-white/[0.06] overflow-hidden shadow-sm">
                {sortedFilteredTodos.length > 0 && (
                  <SortableTaskList
                    items={sortedFilteredTodos}
                    parentId={null}
                    onReorder={(pid, active, over) => handleReorder(pid, active, over)}
                    renderRow={(item, handle) => (
                      <TodoListItem item={item} level={0} actions={actionHandlers} dragHandle={handle} fun={funUI} />
                    )}
                  />
                )}
              </div>
            )}

            {/* Empty state */}
            {viewMode !== "focus" && sortedFilteredTodos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="relative mb-5">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center">
                    <Star className="h-7 w-7 text-indigo-400 dark:text-indigo-500" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                    <Plus className="h-3 w-3 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  {searchQuery ? "No tasks match your search" : "Your workspace is empty"}
                </h3>
                <p className="text-sm text-slate-400 dark:text-slate-600 max-w-xs leading-relaxed">
                  {searchQuery
                    ? `No results for "${searchQuery}". Try a different term.`
                    : "Add your first task above and start building momentum."}
                </p>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="bg-white dark:bg-[#13131f] border-slate-200 dark:border-white/[0.08] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Delete this task?</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              This will permanently delete the task and all its subtasks. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="border-slate-200 dark:border-white/[0.1] dark:text-slate-300 dark:hover:bg-white/[0.06]">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading} className="bg-red-500 hover:bg-red-600">
              {loading ? "Deleting..." : "Delete Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <ThemeStudio />
      <FunSettingsModal
        open={showFunSettings}
        settings={funSettings}
        onUpdate={updateFunSetting}
        onReset={resetFunDefaults}
        onClose={() => setShowFunSettings(false)}
      />
      <FocusRouletteModal
        open={roulette.isOpen}
        tab={roulette.tab}
        onTabChange={roulette.setTabAndFetch}
        aiCoachEnabled={aiActive && funSettings.aiFocusCoachEnabled}
        spinning={roulette.spinning}
        displayName={roulette.displayName}
        winner={roulette.winner}
        candidates={roulette.candidates}
        coachLoading={roulette.coachLoading}
        coachError={roulette.coachError}
        coachResult={roulette.coachResult}
        coachLocalFallback={roulette.coachLocalFallback}
        onSpin={roulette.spin}
        onGoToTask={handleGoToRouletteTask}
        onFetchCoach={roulette.fetchCoach}
        onClose={roulette.closeRoulette}
      />
      <SmartSplitModal
        open={smartSplit.isOpen}
        text={smartSplit.text}
        onTextChange={smartSplit.setText}
        mode={smartSplit.mode}
        onModeChange={smartSplit.setMode}
        parentTitle={smartSplit.parentTitle}
        onParentTitleChange={smartSplit.setParentTitle}
        existingParentId={smartSplit.existingParentId}
        onExistingParentChange={smartSplit.setExistingParentId}
        parsed={smartSplit.parsed}
        creating={smartSplit.creating}
        progress={smartSplit.progress}
        topLevelTodos={todos}
        aiEnabled={aiActive && funSettings.aiSmartSplitEnabled}
        useAI={smartSplit.useAI}
        onUseAIChange={smartSplit.setUseAI}
        aiLoading={smartSplit.aiLoading}
        aiPreview={smartSplit.aiPreview}
        aiError={smartSplit.aiError}
        showReasoning={smartSplit.showReasoning}
        onToggleReasoning={() => smartSplit.setShowReasoning((v) => !v)}
        onConfirm={handleSmartSplitConfirm}
        onClose={smartSplit.close}
      />
      <NaturalLanguagePreview
        open={!!nlPreview}
        parent={nlPreview?.parent ?? ""}
        subtasks={nlPreview?.subtasks ?? []}
        loading={nlLoading}
        onConfirm={confirmNaturalLanguageCreate}
        onCancel={() => setNlPreview(null)}
      />
      <CompletionBurst bursts={bursts} onDone={removeBurst} />
      </div>
    </div>
  );
};

// ── Sidebar progress (overall + per task) ──
const SidebarProgressPanel = ({
  todos,
  collapsed,
  expanded,
  onToggle,
  bossBattleEnabled,
}: {
  todos: Todo[];
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  bossBattleEnabled?: boolean;
}) => {
  const { total, done } = countAll(todos);
  const overall = total > 0 ? Math.round((done / total) * 100) : 0;
  const pending = total - done;

  if (collapsed) {
    return (
      <div
        className="mx-auto flex flex-col items-center gap-1.5 tf-progress-panel tf-surface rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.025] p-2"
        title={`${overall}% complete · ${done} done · ${pending} left`}
      >
        <div className="relative h-9 w-9">
          <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" className="stroke-slate-200 dark:stroke-white/10" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15" fill="none"
              className={overall === 100 ? "stroke-[var(--tf-success,#10b981)]" : "stroke-[var(--tf-accent,#6366f1)]"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(overall / 100) * 94.2} 94.2`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">
            {overall}
          </span>
        </div>
      </div>
    );
  }

  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 mb-2.5 group"
      >
        <p className="tf-label text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-500 transition-colors">
          Progress
        </p>
        <ChevronDown className={`tf-muted h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      <div className="tf-progress-panel tf-surface mx-1 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.025] overflow-hidden">
        {/* Overall hero — always visible */}
        <div className={`px-3.5 py-3 ${expanded ? "tf-divider border-b border-slate-100 dark:border-white/[0.05]" : ""}`}>
          <div className="flex items-end justify-between gap-2 mb-2">
            <div>
              <p className="tf-muted text-[10px] font-medium text-slate-400 dark:text-slate-500">Overall</p>
              <p className="tf-heading text-xl font-bold leading-none mt-0.5 text-slate-800 dark:text-white tabular-nums">{overall}%</p>
            </div>
            <div className="text-right text-[10px] text-slate-400 leading-relaxed">
              <span className="tf-success-text block text-emerald-600 dark:text-emerald-400 font-semibold">{done} done</span>
              <span className="tf-muted block">{pending} left</span>
            </div>
          </div>
          <div className="tf-progress-track h-1.5 bg-slate-200/80 dark:bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`tf-progress-bar tf-progress-fill h-full rounded-full transition-all duration-700 ${overall === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`}
              style={{ width: `${overall}%` }}
            />
          </div>
        </div>

        {/* Per-task list — collapsible */}
        {expanded && (
          <ul className="px-2 py-2 space-y-0.5">
            {todos.map((task) => {
              const pct = calculateProgress(task);
              const subCounts = task.subTodos?.length ? countAll(task.subTodos) : null;
              const complete = pct === 100 || task.done;
              const bossHp = bossBattleEnabled && task.subTodos?.length ? getBossHp(task) : null;
              const lowBoss = bossHp !== null && bossHp > 0 && bossHp < 50;

              return (
                <li
                  key={task.id}
                  className="rounded-lg px-2 py-2 hover:bg-white/60 dark:hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${complete ? "bg-[var(--tf-success,#10b981)]" : pct > 0 ? "bg-[var(--tf-accent,#6366f1)]" : "bg-slate-300 dark:bg-slate-600"}`}
                    />
                    {lowBoss && (
                      <span title={`Boss HP ${bossHp}%`}>
                        <Skull className="h-3 w-3 text-orange-500 flex-shrink-0" aria-hidden />
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-medium truncate flex-1 min-w-0 ${task.done ? "line-through tf-muted text-slate-400 dark:text-slate-600" : "tf-card-title text-slate-700 dark:text-slate-300"}`}
                      title={task.text}
                    >
                      {task.text}
                    </span>
                    <span className={`text-[10px] font-bold tabular-nums flex-shrink-0 ${complete ? "tf-success-text text-emerald-500" : "tf-accent-pct text-indigo-500 dark:text-indigo-400"}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="ml-3.5 tf-progress-track h-0.5 bg-slate-200/80 dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`tf-progress-bar tf-progress-fill h-full rounded-full transition-all duration-700 ${complete ? "bg-emerald-500" : "bg-indigo-400/80 dark:bg-indigo-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {subCounts && (
                    <p className="tf-muted ml-3.5 mt-1 text-[9px] text-slate-400">{subCounts.done}/{subCounts.total} subtasks</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

// ── Today's Focus dashboard ──
const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0, high: 1, medium: 2, low: 3, none: 4,
};

const TodaysFocusPanel = ({
  tasks,
  getPriority,
  onSelectTask,
  onOpenRoulette,
  bossBattleEnabled,
}: {
  tasks: Todo[];
  getPriority: (id: number) => Priority;
  onSelectTask: (id: number) => void;
  onOpenRoulette?: () => void;
  bossBattleEnabled: boolean;
}) => {
  const incomplete = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const sorted = useMemo(
    () =>
      [...incomplete].sort(
        (a, b) => PRIORITY_RANK[getPriority(a.id)] - PRIORITY_RANK[getPriority(b.id)]
      ),
    [incomplete, getPriority]
  );

  if (!tasks.length) {
    return (
      <div className="tf-surface tf-neon-card rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] py-16 text-center">
        <BarChart3 className="h-10 w-10 mx-auto text-indigo-400 tf-accent-text mb-3" />
        <p className="tf-heading text-sm font-semibold text-slate-700 dark:text-slate-300">No tasks yet</p>
        <p className="tf-muted text-sm text-slate-400 mt-1">Add a task above to build your focus list.</p>
      </div>
    );
  }

  if (!incomplete.length) {
    return (
      <div className="tf-surface tf-neon-card rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 py-16 text-center">
        <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
        <p className="tf-heading text-sm font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
        <p className="tf-muted text-sm text-slate-400 mt-1">Every task is complete — great work today.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="tf-heading text-lg font-bold text-slate-900 dark:text-white">Today&apos;s priorities</h2>
          <p className="tf-muted text-sm text-slate-500 mt-0.5">
            {incomplete.length} active task{incomplete.length === 1 ? "" : "s"} · sorted by priority
          </p>
        </div>
        {onOpenRoulette && (
          <button
            type="button"
            onClick={onOpenRoulette}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200/60 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0"
          >
            <Dices className="h-3.5 w-3.5" /> Pick for me
          </button>
        )}
      </div>

      <div className="grid gap-3">
        {sorted.map((task, index) => {
          const priority = getPriority(task.id);
          const pc = PRIORITY_CONFIG[priority];
          const pct = calculateProgress(task);
          const subCounts = task.subTodos?.length ? countAll(task.subTodos) : null;
          const bossHp = bossBattleEnabled && task.subTodos?.length ? getBossHp(task) : null;

          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelectTask(task.id)}
              className={`tf-surface tf-neon-card w-full text-left rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-4 hover:border-indigo-300/60 dark:hover:border-indigo-500/30 transition-all group ${pc.ring ? `border-l-4 ${pc.ring}` : ""}`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:text-indigo-400 tf-accent-text">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="tf-heading text-sm font-semibold text-slate-800 dark:text-white truncate">{task.text}</p>
                    {pc.label && (
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${pc.badge}`}>{pc.label}</span>
                    )}
                    {bossHp !== null && bossHp > 0 && (
                      <span className="text-[10px] font-medium text-orange-500 flex items-center gap-0.5">
                        <Skull className="h-3 w-3" /> {bossHp}% HP
                      </span>
                    )}
                  </div>
                  {subCounts && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200/80 dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="tf-progress-fill h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold tabular-nums text-indigo-500 dark:text-indigo-400 tf-accent-text shrink-0">
                        {pct}%
                      </span>
                    </div>
                  )}
                  {subCounts && (
                    <p className="tf-muted text-[10px] text-slate-400 mt-1">
                      {subCounts.done}/{subCounts.total} subtasks done
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Sidebar nav item ──
const SideNavItem = ({
  icon, label, active, onClick, collapsed,
}: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; collapsed?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`tf-nav-item relative z-10 cursor-pointer w-full flex items-center rounded-lg text-xs font-medium transition-all ${
      collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2 text-left"
    } ${
      active
        ? "tf-nav-item-active bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
        : "text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
    }`}
  >
    {icon}
    {!collapsed && label}
  </button>
);

// ── Stat card ──
const StatCard = ({ icon, iconBg, value, label, valueClass, border }: {
  icon: React.ReactNode; iconBg: string; value: number;
  label: string; valueClass: string; border: string;
}) => (
  <div className={`tf-stat-card tf-surface tf-neon-card bg-white dark:bg-white/[0.03] rounded-2xl border ${border} p-4 md:p-5 shadow-sm`}>
    <div className={`h-9 w-9 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>{icon}</div>
    <p className={`text-2xl font-bold leading-none ${valueClass}`}>{value}</p>
    <p className="tf-muted text-[11px] text-slate-400 mt-1.5 font-medium">{label}</p>
  </div>
);

// ── Board card ──
const TodoCard = ({
  item, actions, dragHandle, sortByOrder, onReorder, fun,
}: {
  item: Todo;
  actions: TodoActions;
  dragHandle?: ReactNode;
  sortByOrder: <T extends { id: number }>(items: T[], parentId: number | null) => T[];
  onReorder: (parentId: number | null, activeId: number, overId: number) => void;
  fun?: FunUIProps;
}) => {
  const progress = calculateProgress(item);
  const subCounts = item.subTodos?.length ? countAll(item.subTodos) : null;
  const sortedSubtasks = sortByOrder(item.subTodos ?? [], item.id);
  const isEditing = actions.editingId === item.id;
  const priority = actions.getPriority(item.id);
  const pc = PRIORITY_CONFIG[priority];
  const showBoss = fun?.bossBattleEnabled && item.subTodos && item.subTodos.length > 0;
  const bossHp = showBoss ? getBossHp(item) : null;
  const defeated = bossHp === 0;
  const damaged = fun?.isDamaged(item.id) ?? false;
  const focused = fun?.focusedTaskId === item.id;
  const lore = fun?.aiBossLoreEnabled ? fun.getLore(item) : null;
  const showTaunt = damaged && !!lore;

  return (
    <div
      id={`task-${item.id}`}
      data-task-card={item.id}
      className={`tf-surface tf-neon-card group relative bg-white dark:bg-white/[0.03] rounded-2xl border shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-200 overflow-hidden ${
        defeated && showBoss
          ? "border-emerald-300/70 dark:border-emerald-500/40"
          : "border-slate-200/60 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/[0.12]"
      } ${damaged ? "tf-boss-shake" : ""} ${focused ? "ring-2 ring-[var(--tf-accent,#6366f1)] animate-pulse" : ""}`}
    >
      {/* Priority top strip */}
      {priority !== "none" && <div className={`h-0.5 w-full ${pc.strip}`} />}

      <div className="p-4 pb-3">
        {/* Title */}
        <div className="flex items-start gap-2 mb-3">
          {dragHandle}
          <Checkbox
            checked={item.done}
            onCheckedChange={() => actions.onCheck(item.id, item.done, item.subTodos, { direct: true })}
            data-task-check={item.id}
            className={`mt-0.5 h-4 w-4 flex-shrink-0 transition-colors rounded-full border-2 ${item.done ? "border-emerald-500 bg-emerald-500 data-[state=checked]:bg-emerald-500" : "border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500"}`}
          />
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex gap-1.5">
                <Input
                  value={actions.editText}
                  onChange={(e) => actions.setEditText(e.target.value)}
                  autoFocus
                  className="h-7 text-sm px-2 bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-600 focus-visible:ring-1 focus-visible:ring-indigo-500 dark:text-white rounded-lg"
                  onKeyDown={(e) => { if (e.key === "Enter") actions.onEdit(item.id); if (e.key === "Escape") actions.cancelEdit(); }}
                />
                <button onClick={() => actions.onEdit(item.id)} className="h-7 w-7 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white flex items-center justify-center flex-shrink-0 transition-colors">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={actions.cancelEdit} className="h-7 w-7 bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 rounded-lg text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <h3
                  className={`tf-card-title text-sm font-semibold leading-snug cursor-pointer select-none transition-colors ${item.done ? "line-through tf-card-muted text-slate-400 dark:text-slate-600" : "text-slate-800 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-400"}`}
                  onDoubleClick={() => actions.startEdit(item.id, item.text)}
                  title="Double-click to edit"
                >
                  {lore && showBoss ? lore.bossName : item.text}
                </h3>
                {lore && showBoss && !item.done && (
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.text}</p>
                )}
                {showTaunt && lore && (
                  <p className="text-[10px] text-amber-600/90 dark:text-amber-400/90 italic mt-1">
                    &ldquo;{lore.taunt}&rdquo;
                  </p>
                )}
                {defeated && lore && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 italic mt-1">
                    {lore.defeatMessage}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {item.owner && <span className="text-[10px] text-slate-400">{item.owner.name || item.owner.email.split("@")[0]}</span>}
                  {priority !== "none" && <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${pc.badge}`}>{pc.label}</span>}
                  {item.done && <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Done</span>}
                  {defeated && showBoss && <BossDefeatedBadge />}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Progress / Boss HP bar */}
        {item.subTodos && item.subTodos.length > 0 && (
          showBoss ? (
            <BossHPBar todo={item} animate={damaged} />
          ) : (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] text-slate-400">{subCounts!.done}/{subCounts!.total} subtasks</span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{progress}%</span>
            </div>
            <div className="h-1 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`tf-progress-bar h-full rounded-full transition-all duration-700 ${progress === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          )
        )}

        {/* Subtasks */}
        {sortedSubtasks.length > 0 ? (
          <SortableSubtaskList
            items={sortedSubtasks}
            parentId={item.id}
            onReorder={onReorder}
            renderSubtask={(sub, handle) => (
              <NestedItem item={sub} level={1} actions={actions} dragHandle={handle} sortByOrder={sortByOrder} onReorder={onReorder} />
            )}
          />
        ) : (
          <div className="h-10 border border-dashed border-slate-200 dark:border-white/[0.06] rounded-xl flex items-center justify-center">
            <span className="text-[10px] text-slate-400 dark:text-slate-600">No subtasks yet</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="tf-card-footer px-4 py-2.5 border-t border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between">
        {actions.openfor === item.id ? (
          <div className="flex-1 flex gap-1.5" onClick={e => e.stopPropagation()}>
            <Input
              className="h-7 text-xs bg-white dark:bg-white/[0.06] border-slate-200 dark:border-white/[0.1] focus-visible:ring-1 focus-visible:ring-indigo-500 dark:text-slate-200 placeholder:text-slate-400"
              placeholder="Subtask name..."
              value={actions.subtodo}
              onChange={e => actions.setSubtodo(e.target.value)}
              onKeyDown={e => e.key === "Enter" && actions.handleAddChild(item.id)}
              autoFocus
            />
            <button onClick={() => actions.handleAddChild(item.id)} className="tf-accent-bg h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0">
              Add
            </button>
          </div>
        ) : (
          <button onClick={e => { e.stopPropagation(); actions.openInput(item.id); }} className="tf-card-muted flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">
            <Plus className="h-3 w-3" /> Add subtask
          </button>
        )}

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button onClick={e => { e.stopPropagation(); actions.cyclePriority(item.id); }} className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all" title="Priority">
            <Flag className={`h-3 w-3 ${priority !== "none" ? pc.dot.split(" ")[0].replace("bg-", "text-") : ""}`} />
          </button>
          <button onClick={() => actions.startEdit(item.id, item.text)} className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all">
            <Edit2 className="h-3 w-3" />
          </button>
          <button onClick={() => actions.onDelete(item.id)} className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Nested sub-item ──
const NestedItem = ({
  item, level, actions, dragHandle, sortByOrder, onReorder,
}: {
  item: Todo;
  level: number;
  actions: TodoActions;
  dragHandle?: ReactNode;
  sortByOrder?: <T extends { id: number }>(items: T[], parentId: number | null) => T[];
  onReorder?: (parentId: number | null, activeId: number, overId: number) => void;
}) => {
  const isEditing = actions.editingId === item.id;
  const sortedNested = sortByOrder && item.subTodos?.length ? sortByOrder(item.subTodos, item.id) : item.subTodos ?? [];

  return (
    <div className={`relative group/item ${level > 1 ? "ml-3 pl-3 border-l border-slate-200 dark:border-white/[0.06]" : ""}`}>
      <div className="flex items-start gap-1.5 py-1 px-1 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
        {dragHandle}
        <Checkbox
          checked={item.done}
          onCheckedChange={() => actions.onCheck(item.id, item.done, item.subTodos, { direct: true })}
          data-task-check={item.id}
          className="mt-0.5 h-3.5 w-3.5 rounded-sm border-slate-300 dark:border-slate-600 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex gap-1 items-center">
              <Input
                value={actions.editText}
                onChange={(e) => actions.setEditText(e.target.value)}
                autoFocus
                className="h-6 text-xs p-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                onKeyDown={(e) => { if (e.key === "Enter") actions.onEdit(item.id); if (e.key === "Escape") actions.cancelEdit(); }}
              />
              <button onClick={() => actions.onEdit(item.id)} className="h-6 w-6 bg-emerald-500 rounded text-white flex items-center justify-center flex-shrink-0">
                <Check className="h-3 w-3" />
              </button>
              <button onClick={actions.cancelEdit} className="h-6 w-6 bg-slate-200 dark:bg-slate-600 rounded text-slate-600 dark:text-slate-200 flex items-center justify-center flex-shrink-0">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-start">
              <span
                className={`text-[11px] font-medium leading-relaxed cursor-pointer select-none transition-colors ${item.done ? "line-through text-slate-400 dark:text-slate-600" : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
                onDoubleClick={() => actions.startEdit(item.id, item.text)}
              >
                {item.text}
              </span>
              <div className="hidden group-hover/item:flex items-center gap-0.5 flex-shrink-0 ml-1">
                {level < 2 && (
                  <button className="h-4 w-4 rounded flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all" onClick={e => { e.stopPropagation(); actions.openSubInput(actions.subopenfor === item.id ? null : item.id); }}>
                    <Plus className="h-3 w-3" />
                  </button>
                )}
                <button className="h-4 w-4 rounded flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all" onClick={() => actions.startEdit(item.id, item.text)}>
                  <Edit2 className="h-3 w-3" />
                </button>
                <button className="h-4 w-4 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all" onClick={() => actions.onDelete(item.id)}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {level === 1 && actions.subopenfor === item.id && (
            <div className="mt-1.5 flex gap-1" onClick={e => e.stopPropagation()}>
              <Input
                className="h-6 text-[11px] bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                placeholder="Nested task..."
                value={actions.supersubtodo}
                onChange={e => actions.setSuperSubtodo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && actions.handleAddSuperChild(item.id, item.id)}
                autoFocus
              />
              <button onClick={() => actions.handleAddSuperChild(item.id, item.id)} className="h-6 px-2 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium flex-shrink-0">
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      {sortedNested.length > 0 && sortByOrder && onReorder ? (
        <div className="mt-0.5">
          <SortableSubtaskList
            items={sortedNested}
            parentId={item.id}
            onReorder={onReorder}
            renderSubtask={(sub, handle) => (
              <NestedItem item={sub} level={level + 1} actions={actions} dragHandle={handle} sortByOrder={sortByOrder} onReorder={onReorder} />
            )}
          />
        </div>
      ) : sortedNested.length > 0 ? (
        <div className="mt-0.5 space-y-0.5">
          {sortedNested.map(sub => <NestedItem key={sub.id} item={sub} level={level + 1} actions={actions} />)}
        </div>
      ) : null}
    </div>
  );
};

// ── List view item ──
const TodoListItem = ({
  item, level, actions, dragHandle, fun,
}: {
  item: Todo;
  level: number;
  actions: TodoActions;
  dragHandle?: ReactNode;
  fun?: FunUIProps;
}) => {
  const isEditing = actions.editingId === item.id;
  const priority = level === 0 ? actions.getPriority(item.id) : "none";
  const pc = PRIORITY_CONFIG[priority];
  const showBossStrip = level === 0 && fun?.bossBattleEnabled && item.subTodos && item.subTodos.length > 0;
  const focused = fun?.focusedTaskId === item.id;

  return (
    <div
      id={level === 0 ? `task-${item.id}` : undefined}
      data-task-card={level === 0 ? item.id : undefined}
      className={`group hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors ${level > 0 ? "pl-8 border-l-2 border-slate-100 dark:border-white/[0.04] ml-6" : "px-4 md:px-5"} py-3 ${focused ? "ring-2 ring-inset ring-[var(--tf-accent,#6366f1)] animate-pulse" : ""}`}
    >
      {showBossStrip && <BossHPBar todo={item} variant="strip" showLabel={false} />}
      <div className="flex items-center gap-2">
        {level === 0 && dragHandle}
        {level === 0 && priority !== "none" && <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pc.dot}`} />}
        <Checkbox
          checked={item.done}
          onCheckedChange={() => actions.onCheck(item.id, item.done, item.subTodos, { direct: true })}
          data-task-check={item.id}
          className={`h-4 w-4 rounded-full flex-shrink-0 border-2 transition-colors ${item.done ? "bg-emerald-500 border-emerald-500" : "border-slate-300 dark:border-slate-600 hover:border-indigo-400"}`}
        />
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex gap-2 items-center">
              <Input value={actions.editText} onChange={(e) => actions.setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") actions.onEdit(item.id); if (e.key === "Escape") actions.cancelEdit(); }} autoFocus className="h-8 text-sm dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white" />
              <button onClick={() => actions.onEdit(item.id)} className="h-8 w-8 bg-emerald-500 rounded-lg text-white flex items-center justify-center flex-shrink-0"><Check className="h-4 w-4" /></button>
              <button onClick={actions.cancelEdit} className="h-8 w-8 bg-slate-100 dark:bg-white/[0.08] rounded-lg text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex justify-between items-center min-w-0">
              <span className={`text-sm font-medium truncate ${item.done ? "line-through text-slate-400 dark:text-slate-600" : "text-slate-700 dark:text-slate-300"}`}>
                {item.text}
                {item.owner && <span className="ml-2 text-[10px] text-slate-400 font-normal">{item.owner.name || item.owner.email.split("@")[0]}</span>}
              </span>
              <div className="flex items-center gap-1 ml-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {priority !== "none" && <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${pc.badge}`}>{pc.label}</span>}
                {level === 0 && (
                  <button className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all" onClick={() => actions.cyclePriority(item.id)} title="Change priority">
                    <Flag className="h-3 w-3" />
                  </button>
                )}
                <button className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all" onClick={() => actions.startEdit(item.id, item.text)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all" onClick={() => actions.onDelete(item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {item.subTodos?.map(sub => <TodoListItem key={sub.id} item={sub} level={level + 1} actions={actions} fun={fun} />)}
    </div>
  );
};

export default NestedTodo;
