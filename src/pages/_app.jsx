import { Outlet, useLocation } from "react-router";
import SideNav from "../components/SideNav";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";
import RoleSwitcher from "../components/RoleSwitcher";

export default function AppLayout() {
  const { user, isAuthLoading } = useAuth();
  const location = useLocation();

  if (location.pathname === "/login") {
    return <Outlet />;
  }

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mauve-2">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="animate-spin" size={28} />
          <p className="text-sm font-bold uppercase tracking-widest animate-pulse">
            Loading Portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-mauve-2 font-sans overflow-hidden">
      {user && <SideNav />}

      <main className="flex-1 flex flex-col min-w-0 bg-background md:my-2 md:mr-2 md:ml-2 md:rounded-2xl border-l md:border border-border shadow-sm overflow-hidden relative z-10 transition-transform">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="wrapper py-10 px-4 md:px-6">
            <Outlet />
          </div>
        </div>
      </main>

      <RoleSwitcher />
    </div>
  );
}
