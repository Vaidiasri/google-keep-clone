import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import NestedTodo from "./page/NestedTodo";
import LogIn from "./page/LogIn";
import Register from "./page/Register";
import AdminUsers from "./page/AdminUsers";
import { useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/toaster";

// Protected Route Component
// Agar user logged in nahi hai to Login page par bhej dega
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route (Login/Register accessible only if NOT logged in)
const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LogIn />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <NestedTodo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              {/* Strict Role Check inside component or wrapper? */}
              {/* For now, ProtectedRoute just checks auth, AdminUsers will check role implicitly via API 403 or we can add RoleGuard */}
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
