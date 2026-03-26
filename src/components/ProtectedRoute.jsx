import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  requireHead = false,
  requireHr = false,
  requireSuperAdmin = false,
}) {
  const { user, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-bold">
        Loading Portal...
      </div>
    );
  }

  //   If not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin barrier
  if (requireSuperAdmin && !user.isSuperAdmin && !user.is_super_admin) {
    return <Navigate to="/" replace />;
  }

  //   If not HR and not Head
  if (requireHead && !user.isHead && !user.isHr) {
    return <Navigate to="/" replace />;
  }

  //   if not HR
  if (requireHr && !user.isHr) {
    return <Navigate to="/" replace />;
  }

  return children;
}
