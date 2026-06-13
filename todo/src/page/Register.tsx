import { useState } from "react";
import apiClient from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../components/ui/input";
import { UserPlus, Loader2, Mail, Lock, User } from "lucide-react";
import type { User as AuthUser } from "../types/auth.types";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await apiClient.post<{ token: string; user: AuthUser }>("/register", { name, email, password });
      login(response.data.token, response.data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] dark:bg-[#0b0b12] px-4">
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-400/10 dark:bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-400/10 dark:bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="bg-white dark:bg-[#0f0f18] rounded-3xl border border-slate-200/70 dark:border-white/[0.07] shadow-xl dark:shadow-black/40 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Create an account</h1>
            <p className="text-sm text-slate-500 mt-1">Join TaskFlow and organize your work</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="John Doe"
                  className="pl-10 h-11 bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] focus-visible:ring-indigo-500 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10 h-11 bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] focus-visible:ring-indigo-500 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Create a strong password"
                  className="pl-10 h-11 bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] focus-visible:ring-indigo-500 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold shadow-md transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</> : "Get Started"}
              </button>
            </div>

            <p className="text-center text-sm text-slate-500 pt-1">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-600 mt-6">© 2025 TaskFlow Inc.</p>
      </div>
    </div>
  );
};

export default Register;
