import { useState, useEffect, useMemo } from "react";
import apiClient from "../lib/axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Loader2,
  Plus,
  User,
  Shield,
  MoreVertical,
  Trash2,
  Search,
  Check,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useToast } from "../hooks/use-toast";

// UI Badge Shortcut
const Badge = ({ children, variant, className }: any) => (
  <span
    className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${
      variant === "outline"
        ? "border-slate-200 text-slate-500"
        : "bg-slate-900 text-white"
    } ${className}`}
  >
    {children}
  </span>
);

interface UserData {
  id: number;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  mfa_enabled: boolean;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Create User Form
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [isCreating, setIsCreating] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get<UserData[]>("/admin/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users", err);
      toast({
        variant: "destructive",
        title: "Fetch Failed",
        description: "Could not load user list.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Real-time filtering logic
  const filteredUsers = useMemo(() => {
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.name &&
          user.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await apiClient.post("/admin/users", {
        email,
        name,
        password: "temp",
        role,
      });
      toast({
        title: "User Created",
        description: `Invitation sent to ${email}`,
      });
      setEmail("");
      setName("");
      fetchUsers();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: err.response?.data?.detail || "Could not create user.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure? This will delete all user data.")) return;
    try {
      await apiClient.delete(`/admin/users/${userId}`);
      toast({ title: "User Deleted" });
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete Failed" });
    }
  };

  const handleToggleRole = async (user: UserData) => {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    try {
      await apiClient.patch(`/admin/users/${user.id}`, { role: newRole });
      toast({
        title: "Role Updated",
        description: `${user.email} is now ${newRole}`,
      });
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed" });
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Shield className="h-10 w-10 text-indigo-600" />
            User Management
          </h1>
          <p className="text-slate-500 font-medium text-lg">
            Workspace Directory & Access Controls
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              className="pl-10 h-10 border-none bg-transparent focus-visible:ring-0 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Badge
            variant="outline"
            className="hidden sm:flex bg-slate-50 px-3 h-8 border-slate-200 text-slate-500 font-bold"
          >
            {filteredUsers.length} Users Found
          </Badge>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[400px_1fr] items-start">
        {/* SIDEBAR: CREATE FORM */}
        <Card className="lg:sticky lg:top-8 border-none shadow-2xl bg-indigo-600 text-white overflow-hidden rounded-3xl">
          <CardHeader className="pt-8 px-8 pb-4">
            <CardTitle className="text-2xl font-bold">
              Register Member
            </CardTitle>
            <CardDescription className="text-indigo-100/80 font-medium">
              Add a new teammate to the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8 space-y-6">
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-indigo-200">
                  Email Address
                </Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  className="bg-white/10 border-white/20 text-white placeholder:text-indigo-200/50 h-12 rounded-2xl focus:bg-white/20"
                  placeholder="name@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-indigo-200">
                  Full Name
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-indigo-200/50 h-12 rounded-2xl focus:bg-white/20"
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-indigo-200">
                  Initial Role
                </Label>
                <div className="grid grid-cols-2 p-1.5 bg-black/10 rounded-2xl gap-1">
                  <button
                    type="button"
                    className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
                      role === "USER"
                        ? "bg-white text-indigo-600 shadow-lg"
                        : "text-white/60 hover:text-white"
                    }`}
                    onClick={() => setRole("USER")}
                  >
                    User
                  </button>
                  <button
                    type="button"
                    className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
                      role === "ADMIN"
                        ? "bg-white text-indigo-600 shadow-lg"
                        : "text-white/60 hover:text-white"
                    }`}
                    onClick={() => setRole("ADMIN")}
                  >
                    Admin
                  </button>
                </div>
              </div>
              <Button
                className="w-full bg-white text-indigo-600 hover:bg-slate-50 h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95"
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Plus className="mr-2 h-5 w-5" /> Quick Register
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* MAIN: COMPACT DIRECTORY */}
        <div className="space-y-4">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Teammate Details
                    </TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                      Security Role
                    </TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                      Security Shield
                    </TableHead>
                    <TableHead className="py-5 px-6 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-64 text-center">
                        <Loader2 className="animate-spin h-10 w-10 mx-auto text-indigo-600" />
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-64 text-center font-medium text-slate-400"
                      >
                        No members match your search criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className="group hover:bg-indigo-50/30 transition-all border-slate-50"
                      >
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 overflow-hidden group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                              <span className="font-bold text-sm">
                                {user.name?.[0] || user.email[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight text-base leading-none mb-1">
                                {user.name || "Unnamed"}
                              </span>
                              <span className="text-xs text-slate-400 font-bold tracking-tight">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                              user.role === "ADMIN"
                                ? "bg-purple-100 text-purple-700 ring-1 ring-purple-200"
                                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                            }`}
                          >
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          {user.mfa_enabled ? (
                            <div className="inline-flex items-center gap-1.5 text-green-600 font-black text-[9px] uppercase tracking-widest">
                              <Check className="h-3.5 w-3.5" /> Secure
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-slate-300 font-black text-[9px] uppercase tracking-widest">
                              <Shield className="h-3.5 w-3.5" /> Classic
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 transition-all"
                              >
                                <MoreVertical className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-56 rounded-2xl p-2 shadow-2xl border-slate-100"
                            >
                              <DropdownMenuItem
                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 font-bold text-xs"
                                onClick={() => handleToggleRole(user)}
                              >
                                {user.role === "ADMIN" ? (
                                  <User className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <Shield className="h-4 w-4 text-indigo-600" />
                                )}
                                <span>
                                  Promote to{" "}
                                  {user.role === "ADMIN" ? "User" : "Admin"}
                                </span>
                              </DropdownMenuItem>
                              <div className="h-px bg-slate-50 my-2" />
                              <DropdownMenuItem
                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer text-red-600 hover:bg-red-50 font-bold text-xs"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Terminate Access</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
