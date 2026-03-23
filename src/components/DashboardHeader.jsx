import { useMemo, useEffect, useState } from "react";
import { Search, Bell, AlertCircle, ArrowRight } from "lucide-react";
import { INPUT_STYLE } from "../pages/login";
import { useAuth } from "../context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../services/taskService";
import { Link } from "react-router";
import { supabase } from "../lib/supabase.js";
import { ThemeToggle } from "./ThemeToggle";

function DashboardHeader() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [hasNewAlert, setHasNewAlert] = useState(false);

  const isHr = user?.is_hr === true || user?.isHr === true;
  const isHead = user?.is_head === true || user?.isHead === true;
  const isManagement = isHr || isHead;
  const userSubDept = user?.sub_department || user?.subDepartment;

  const { data: rawTasks = [] } = useQuery({
    queryKey: ["dashboardTasks", user?.id, "all"],
    queryFn: () => taskService.getAllTasks(),
    enabled: !!user?.id && isManagement,
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("tasks-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          const taskOwner =
            payload.new?.loggedById ||
            payload.new?.logged_by_id ||
            payload.old?.loggedById ||
            payload.old?.logged_by ||
            payload.old?.logged_by_id;

          if (!isManagement && taskOwner !== user.id) return;

          queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
          queryClient.invalidateQueries({ queryKey: ["allTasks"] });
          queryClient.invalidateQueries({ queryKey: ["tasks"] });

          setHasNewAlert(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isManagement, queryClient, user?.id]);

  const pendingCount = useMemo(() => {
    if (!isManagement) return 0;

    return rawTasks.filter((t) => {
      const isNotMe = t.loggedById !== user?.id;
      if (isHr) {
        return isNotMe && t.status === "COMPLETE" && !t.hrVerified;
      } else if (isHead) {
        const taskSubDept =
          t.sub_department ||
          t.subDepartment ||
          t.creator?.sub_department ||
          t.employees?.sub_department ||
          "";
        return (
          isNotMe && taskSubDept === userSubDept && t.status === "INCOMPLETE"
        );
      }
      return false;
    }).length;
  }, [rawTasks, user, isManagement, isHr, isHead, userSubDept]);

  return (
    <div className="grid gap-4 md:gap-6">
      {/* 1. TOP BAR: SEARCH & BELL */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <input
            className={`${INPUT_STYLE} text-gray-12 px-4! pr-10! placeholder:text-sm placeholder:text-gray-10 w-full`}
            placeholder="Search..."
            type="text"
          />
          <Search
            size={18}
            className="absolute text-gray-6 right-3 top-1/2 -translate-y-1/2"
          />
        </div>

        <div
          className="relative cursor-pointer p-2.5 rounded-full bg-gray-2 hover:bg-gray-3 transition-colors shrink-0"
          onClick={() => setHasNewAlert(false)}
        >
          <Bell
            className="text-gray-10 hover:text-gray-12 transition-colors"
            size={20}
          />
          {hasNewAlert && (
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-gray-1"></span>
            </span>
          )}
        </div>

        <ThemeToggle />
      </div>

      {/* 2. EXPRESS BANNER: Responsive stacking */}
      {pendingCount > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg text-primary shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="text-gray-12 font-bold text-sm">
                Action Required
              </h3>
              <p className="text-gray-10 text-xs mt-0.5">
                <span className="font-bold text-primary">{pendingCount}</span>{" "}
                tasks need your {isHr ? "verification" : "approval"}.
              </p>
            </div>
          </div>
          <Link
            to="/approvals"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-gray-12 text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-primary-hover transition-all active:scale-95 shadow-lg shadow-red-a3"
          >
            Go to Inbox <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* 3. HERO BANNER: Responsive Font & Layout */}
      <div className="relative z-0 bg-black rounded-2xl overflow-hidden shadow-lg min-h-[140px] md:min-h-[180px] flex items-center">
        <img
          className="opacity-60 absolute inset-0 w-full h-full object-cover"
          src="/leaf-background.jpg"
          alt=""
        />
        <div className="relative z-10 p-6 md:p-10 text-white flex flex-col md:flex-row md:justify-between md:items-center w-full gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Hi {user?.name?.split(" ")[0] || "Team"},
            </h1>
            <p className="text-gray-6 mt-1 font-medium text-base md:text-xl">
              Good to see you back!
            </p>
          </div>
          <div className="hidden sm:block border-t border-white/10 md:border-none pt-4 md:pt-0">
            <p className="italic text-xs md:text-sm text-left md:text-right text-gray-6 font-medium leading-relaxed">
              Begin each day with a <br className="hidden md:block" /> Grateful
              Heart.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardHeader;
