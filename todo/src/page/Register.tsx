import { useState } from "react";
import apiClient from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { UserPlus, Loader2, Mail, Lock, User } from "lucide-react";
import type { User as AuthUser } from "../types/auth.types"; // Renamed to avoid conflict if any

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
      const response = await apiClient.post<{ token: string; user: AuthUser }>(
        "/register",
        {
          name,
          email,
          password,
        }
      );

      console.log("Registration Success:", response.data);
      login(response.data.token, response.data.user);
      navigate("/");
    } catch (err: any) {
      console.error("Registration Failed:", err);
      setError(
        err.response?.data?.error || "Registration failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-50 to-white -z-10" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />

      <Card className="w-full max-w-md border-0 shadow-2xl bg-white/70 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="space-y-4 flex flex-col items-center text-center pb-2">
          <div className="h-12 w-12 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 ring-4 ring-white">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              Create an account
            </CardTitle>
            <CardDescription className="text-slate-500">
              Join TaskFlow to organize your work effectively
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-slate-600 text-xs font-semibold uppercase tracking-wider"
              >
                Full Name
              </Label>
              <div className="relative group">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  id="name"
                  placeholder="John Doe"
                  className="pl-10 h-10 border-slate-200 bg-slate-50/50 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-slate-600 text-xs font-semibold uppercase tracking-wider"
              >
                Email
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10 h-10 border-slate-200 bg-slate-50/50 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-slate-600 text-xs font-semibold uppercase tracking-wider"
              >
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  className="pl-10 h-10 border-slate-200 bg-slate-50/50 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-lg shadow-slate-200 hover:shadow-xl transition-all duration-300"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Get Started"
              )}
            </Button>

            <div className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Footer Branding */}
      <div className="absolute bottom-3 text-center text-slate-400 text-xs">
        <p>© 2025 TaskFlow Inc.</p>
      </div>
    </div>
  );
};

export default Register;
