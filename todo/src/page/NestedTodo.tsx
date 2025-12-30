import { useState, useEffect } from "react";
import { todoApi } from "../services/todoService";
import type { Todo } from "../types/todo.types";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { Card } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import {
  Search,
  Shield,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  Check,
  LayoutGrid,
  List,
  TrendingUp,
  Star,
} from "lucide-react";
// Dropdown imports removed as they were unused
import { useToast } from "../hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

// --- Types ---
interface TodoActions {
  onCheck: (id: number, currentDone: boolean, subTodos?: Todo[]) => void;
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
}

// --- Main Component ---
const NestedTodo = () => {
  // State
  const [todo, setTodo] = useState("");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [subtodo, setSubtodo] = useState("");
  const [supersubtodo, setSuperSubtodo] = useState("");

  // UI State
  const [openfor, setOpenfor] = useState<number | null>(null);
  const [subopenfor, setSubOpenfor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { toast } = useToast();

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const data = await todoApi.getAllTodos();
      setTodos(data);
    } catch (err) {
      console.error(err);
      setError("Could not load tasks.");
    } finally {
      setLoading(false);
    }
  };

  // --- Actions ---
  const handleParent = async () => {
    if (!todo.trim()) return;
    setLoading(true);
    try {
      await todoApi.createTodo({ text: todo });
      setTodo("");
      await fetchTodos();
      toast({
        title: "Task Created",
        description: "Your main task has been added.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create task.",
      });
    } finally {
      setLoading(false);
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
      toast({
        title: "Subtask Added",
        description: "Your subtask has been created successfully.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add subtask.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuperChild = async (parentId: number, childId: number) => {
    if (!supersubtodo.trim()) return;
    setLoading(true);
    try {
      await todoApi.createTodo({ text: supersubtodo, parentId: childId });
      setSuperSubtodo("");
      await fetchTodos();
      toast({
        title: "Nested Task Added",
        description: "Your nested task has been created successfully.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add nested task.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async (
    id: number,
    currentDone: boolean,
    subTodos: Todo[] = []
  ) => {
    setLoading(true);
    try {
      const newStatus = !currentDone;
      await todoApi.updateTodo(id, { done: newStatus });
      // Simulation of cascade update
      const updateHasChildren = async (children: Todo[], status: boolean) => {
        for (const child of children) {
          await todoApi.updateTodo(child.id, { done: status });
          if (child.subTodos && child.subTodos.length > 0)
            await updateHasChildren(child.subTodos, status);
        }
      };
      if (subTodos && subTodos.length > 0)
        await updateHasChildren(subTodos, newStatus);
      await fetchTodos();
    } catch {
      setError("Update status failed.");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (id: number, text: string) => {
    setEditingId(id);
    setEditText(text);
  };
  const handleUpdateText = async (id: number) => {
    if (!editText.trim()) return;
    setLoading(true);
    try {
      await todoApi.updateTodo(id, { text: editText.trim() });
      setEditingId(null);
      await fetchTodos();
    } catch {
      setError("Update text failed.");
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await todoApi.deleteTodo(deleteId);
      await fetchTodos();
      toast({
        title: "Task Deleted",
        description: "The task and its subtasks have been removed.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete task.",
      });
    } finally {
      setLoading(false);
      setDeleteId(null);
    }
  };

  const actionHandlers: TodoActions = {
    onCheck: handleCheck,
    onDelete: handleDelete,
    onEdit: handleUpdateText,
    startEdit,
    cancelEdit: () => setEditingId(null),
    setEditingId,
    handleAddChild: handelChild,
    handleAddSuperChild: handleSuperChild,
    openInput: setOpenfor,
    openSubInput: setSubOpenfor,
    openfor,
    subopenfor,
    editingId,
    editText,
    setEditText,
    subtodo,
    setSubtodo,
    supersubtodo,
    setSuperSubtodo,
  };

  const filteredTodos = todos.filter((t) =>
    t.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Render ---
  return (
    <div
      className="min-h-screen bg-neutral-50/50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900"
      onClick={() => {
        setOpenfor(null);
        setSubOpenfor(null);
      }}
    >
      {/* 1. Glassmorphism Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/80 backdrop-blur-xl shadow-sm supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 max-w-7xl items-center justify-between mx-auto px-4 md:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              TaskFlow
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-slate-100/80 rounded-full px-4 py-1.5 gap-2 border border-slate-200/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-slate-400"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {user?.role === "ADMIN" && (
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex gap-2 bg-slate-100 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                onClick={() => navigate("/admin")}
              >
                <Shield className="w-4 h-4" /> Manage Users
              </Button>
            )}

            <div className="h-4 w-px bg-slate-200 hidden md:block" />

            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-400 font-medium">Workspace</p>
                <p className="text-sm font-semibold text-slate-900 leading-none">
                  {user?.name}'s Plan
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-slate-100 text-slate-500 hover:text-red-500 transition-colors"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 " />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-10">
        {/* 2. Hero / Status Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Today's Focus
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              You have{" "}
              <span className="text-indigo-600 font-semibold">
                {filteredTodos.filter((t) => !t.done).length} active tasks
              </span>{" "}
              remaining.
            </p>
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              onClick={() => setViewMode("grid")}
              className={`rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-slate-100 text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
              size="sm"
            >
              <LayoutGrid className="w-4 h-4 mr-2" /> Board
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              onClick={() => setViewMode("list")}
              className={`rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-slate-100 text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
              size="sm"
            >
              <List className="w-4 h-4 mr-2" /> List
            </Button>
          </div>
        </div>

        {/* 3. Floating Input Bar */}
        <div className="relative group max-w-3xl mx-auto z-10">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500 group-hover:duration-200"></div>
          <div className="relative flex items-center gap-3 bg-white p-2 pr-2 rounded-2xl shadow-xl shadow-indigo-100/50 border border-slate-100">
            <div className="pl-4 text-slate-400">
              <Plus className="w-6 h-6" />
            </div>
            <Input
              className="flex-1 border-0 shadow-none focus-visible:ring-0 text-lg py-7 bg-transparent placeholder:text-slate-300 font-medium"
              placeholder="What is your next big goal?"
              value={todo}
              onChange={(e) => setTodo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleParent()}
            />
            <Button
              onClick={handleParent}
              disabled={loading || !todo.trim()}
              className="h-10 px-6 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Create
            </Button>
          </div>
        </div>

        {/* 4. Task Grid/List */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 auto-rows-min">
            {filteredTodos.map((t) => (
              <TodoCard key={t.id} item={t} actions={actionHandlers} />
            ))}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {filteredTodos.length > 0 ? (
              filteredTodos.map((t) => (
                <TodoListItem
                  key={t.id}
                  item={t}
                  level={0}
                  actions={actionHandlers}
                />
              ))
            ) : (
              <div className="p-12 text-center text-slate-400">
                No tasks found
              </div>
            )}
          </div>
        )}

        {filteredTodos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-60">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Star className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 text-lg">Your workspace is clean.</p>
            <p className="text-slate-400 text-sm">
              Add a task abover to get started.
            </p>
          </div>
        )}
      </main>

      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              task and all its sub-tasks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const calculateProgress = (item: Todo) => {
  if (!item.subTodos?.length) return item.done ? 100 : 0;
  const completed = item.subTodos.filter((t) => t.done).length;
  return Math.round((completed / item.subTodos.length) * 100);
};

// Reuseable Card
const TodoCard = ({ item, actions }: { item: Todo; actions: TodoActions }) => {
  const progress = calculateProgress(item);
  const isEditing = actions.editingId === item.id;

  return (
    <Card className="group relative flex flex-col overflow-hidden border border-slate-200 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.1)] rounded-2xl">
      {/* Card Header Color Strip */}
      {/* <div
        className={`h-1.5 w-full bg-gradient-to-r ${
          item.done
            ? "from-slate-200 to-slate-200"
            : "from-indigo-500 via-purple-500 to-pink-500"
        } transition-all`}
      /> */}

      <div className="p-5 flex-1 flex flex-col">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={actions.editText}
                  onChange={(e) => actions.setEditText(e.target.value)}
                  autoFocus
                  className="h-8 text-base font-semibold px-2 border-indigo-200 focus-visible:ring-indigo-500"
                  onKeyDown={(e) =>
                    e.key === "Enter" && actions.onEdit(item.id)
                  }
                />
                <Button
                  size="sm"
                  onClick={() => actions.onEdit(item.id)}
                  className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white"
                >
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <h3
                  className={`text-lg font-bold leading-tight truncate cursor-pointer transition-colors ${
                    item.done
                      ? "text-slate-400 line-through decoration-slate-300"
                      : "text-slate-800 group-hover:text-indigo-700"
                  }`}
                  onDoubleClick={() => actions.startEdit(item.id, item.text)}
                  title={item.text}
                >
                  {item.text}
                </h3>
                {item.owner && (
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                    by {item.owner.name || item.owner.email.split("@")[0]}
                  </p>
                )}
              </>
            )}
            {item.done && (
              <Badge
                variant="secondary"
                className="mt-2 text-[10px] bg-slate-100 text-slate-500"
              >
                Completed
              </Badge>
            )}
          </div>

          <div className="flex-shrink-0">
            <Checkbox
              checked={item.done}
              onCheckedChange={() =>
                actions.onCheck(item.id, item.done, item.subTodos)
              }
              className={`h-6 w-6 rounded-md border-2 transition-all ${
                item.done
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-slate-300 hover:border-indigo-400"
              }`}
            />
          </div>
        </div>

        {/* Progress Bar */}
        {item.subTodos && item.subTodos.length > 0 && (
          <div className="space-y-1.5 mb-6">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
              <span>{progress}% Complete</span>
              <span>
                {item.subTodos.filter((t) => t.done).length}/
                {item.subTodos.length} Tasks
              </span>
            </div>
            <Progress
              value={progress}
              className="h-1.5 bg-slate-100 indicator:bg-gradient-to-r indicator:from-indigo-500 indicator:to-purple-500"
            />
          </div>
        )}

        {/* Subtask List */}
        <div className="flex-1 space-y-2 relative">
          {item.subTodos?.map((sub) => (
            <NestedItem key={sub.id} item={sub} level={1} actions={actions} />
          ))}

          {(!item.subTodos || item.subTodos.length === 0) && (
            <div className="h-20 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/30">
              <span className="text-xs text-slate-400 font-medium">
                No subtasks yet
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
        {/* Input for new subtask showing conditionally or button to open */}
        {actions.openfor === item.id ? (
          <div
            className="flex-1 flex gap-2 animate-in slide-in-from-bottom-2 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              className="h-8 text-xs bg-white border-slate-200 focus-visible:ring-indigo-500"
              placeholder="Add Step..."
              value={actions.subtodo}
              onChange={(e) => actions.setSubtodo(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && actions.handleAddChild(item.id)
              }
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => actions.handleAddChild(item.id)}
              className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Add
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              actions.openInput(item.id);
            }}
            className="text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-slate-200/50"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
          </Button>
        )}

        {/* Context Menu / Options */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => actions.startEdit(item.id, item.text)}
            className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => actions.onDelete(item.id)}
            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Recursive Item (Level 1+)
const NestedItem = ({
  item,
  level,
  actions,
}: {
  item: Todo;
  level: number;
  actions: TodoActions;
}) => {
  const isEditing = actions.editingId === item.id;
  return (
    <div
      className={`relative group/item pl-3 ${
        level > 1 ? "ml-3 border-l-2 border-slate-100" : ""
      }`}
    >
      <div className="flex items-start gap-2.5 py-1.5 pr-2 rounded-lg hover:bg-slate-50 transition-colors">
        <Checkbox
          checked={item.done}
          onCheckedChange={() =>
            actions.onCheck(item.id, item.done, item.subTodos)
          }
          className="mt-0.5 h-4 w-4 rounded-sm border-slate-300 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
        />
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex gap-1 items-center">
              <Input
                value={actions.editText}
                onChange={(e) => actions.setEditText(e.target.value)}
                autoFocus
                className="h-6 text-xs p-1"
                onKeyDown={(e) => e.key === "Enter" && actions.onEdit(item.id)}
              />
              <Button
                size="sm"
                onClick={() => actions.onEdit(item.id)}
                className="h-6 w-6 p-0 bg-green-500 hover:bg-green-600 text-white"
              >
                <Check className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="flex justify-between items-start">
              <span
                className={`text-sm font-medium leading-tight cursor-pointer select-none transition-all ${
                  item.done
                    ? "line-through text-slate-400 decoration-slate-300"
                    : "text-slate-700 hover:text-slate-900"
                }`}
                onDoubleClick={() => actions.startEdit(item.id, item.text)}
              >
                {item.text}
              </span>

              {/* Hover Actions */}
              <div className="hidden group-hover/item:flex items-center gap-1 transition-all">
                {level < 2 && (
                  <Plus
                    className="w-3 h-3 text-slate-400 hover:text-indigo-600 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.openSubInput(
                        actions.subopenfor === item.id ? null : item.id
                      );
                    }}
                  />
                )}
                <Edit2
                  className="w-3 h-3 text-slate-400 hover:text-blue-600 cursor-pointer"
                  onClick={() => actions.startEdit(item.id, item.text)}
                />
                <Trash2
                  className="w-3 h-3 text-slate-400 hover:text-red-500 cursor-pointer"
                  onClick={() => actions.onDelete(item.id)}
                />
              </div>
            </div>
          )}

          {/* Nested Input */}
          {level === 1 && actions.subopenfor === item.id && (
            <div
              className="mt-2 flex gap-1 animate-in zoom-in-95 duration-200 origin-top"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                className="h-6 text-[11px] bg-white"
                placeholder="Sub-task..."
                value={actions.supersubtodo}
                onChange={(e) => actions.setSuperSubtodo(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  actions.handleAddSuperChild(item.id, item.id)
                }
                autoFocus
              />
              <Button
                size="sm"
                onClick={() => actions.handleAddSuperChild(item.id, item.id)}
                className="h-6 px-2 text-[10px] bg-slate-900 text-white"
              >
                Save
              </Button>
            </div>
          )}
        </div>
      </div>

      {item.subTodos && item.subTodos.length > 0 && (
        <div className="mt-1 space-y-1">
          {item.subTodos.map((sub) => (
            <NestedItem
              key={sub.id}
              item={sub}
              level={level + 1}
              actions={actions}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// List View Item (Simple)
const TodoListItem = ({
  item,
  level,
  actions,
}: {
  item: Todo;
  level: number;
  actions: TodoActions;
}) => {
  const isEditing = actions.editingId === item.id;
  return (
    <div
      className={`p-3 group hover:bg-slate-50 transition-colors ${
        level > 0 ? "ml-6 border-l border-slate-200 pl-4" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={item.done}
          onCheckedChange={() =>
            actions.onCheck(item.id, item.done, item.subTodos)
          }
        />
        <div className="flex-1">
          {isEditing ? (
            <Input
              value={actions.editText}
              onChange={(e) => actions.setEditText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && actions.onEdit(item.id)}
              autoFocus
            />
          ) : (
            <div className="flex justify-between">
              <span
                className={`text-sm ${
                  item.done
                    ? "line-through text-slate-400"
                    : "text-slate-700 font-medium"
                }`}
              >
                {item.text}
                {item.owner && (
                  <span className="ml-2 text-[10px] text-slate-400 font-normal">
                    by {item.owner.name || item.owner.email.split("@")[0]}
                  </span>
                )}
              </span>
              <div className="hidden group-hover:flex gap-2">
                <Edit2
                  className="w-4 h-4 text-slate-400 cursor-pointer hover:text-indigo-600"
                  onClick={() => actions.startEdit(item.id, item.text)}
                />
                <Trash2
                  className="w-4 h-4 text-slate-400 cursor-pointer hover:text-red-600"
                  onClick={() => actions.onDelete(item.id)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      {item.subTodos &&
        item.subTodos.length > 0 &&
        item.subTodos.map((sub) => (
          <TodoListItem
            key={sub.id}
            item={sub}
            level={level + 1}
            actions={actions}
          />
        ))}
    </div>
  );
};

export default NestedTodo;
