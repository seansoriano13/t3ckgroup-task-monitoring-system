import { useMemo, useEffect } from "react";
import { Search, AlertCircle, ArrowRight } from "lucide-react";
import { INPUT_STYLE } from "../pages/login";
import { useAuth } from "../context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../services/taskService";
import { Link } from "react-router";
import { supabase } from "../lib/supabase.js";
import { ThemeToggle } from "./ThemeToggle";
import { TASK_STATUS } from "../constants/status";
import PersonalizedHeroBanner from "./PersonalizedHeroBanner";
import { Input } from "@/components/ui/input";

function DashboardHeader() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // isHr is DB-driven only — no super-admin bypass (mirrors approvals/tasks logic)
  const isHr = user?.is_hr === true || user?.isHr === true;
  const isHead = user?.is_head === true || user?.isHead === true;
  const approvalsLink =
    isHr && !isHead ? "/approvals/hr-verification" : "/approvals/tasks";
  const isManagement = isHr || isHead;
  const userSubDept = user?.sub_department || user?.subDepartment;
  const userDept = user?.department;

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
        return isNotMe && t.status === TASK_STATUS.COMPLETE && !t.hrVerified;
      } else if (isHead) {
        const taskSubDept =
          t.sub_department ||
          t.subDepartment ||
          t.creator?.sub_department ||
          t.employees?.sub_department ||
          "";

        const taskDept = t.creator?.department || t.employees?.department || "";

        let isMyDept = false;
        if (userSubDept) {
          isMyDept = taskSubDept === userSubDept;
        } else {
          isMyDept = taskDept === userDept;
        }

        return isNotMe && isMyDept && t.status === TASK_STATUS.INCOMPLETE;
      }
      return false;
    }).length;
  }, [rawTasks, user, isManagement, isHr, isHead, userSubDept, userDept]);

  return (
    <div className="grid gap-4 md:gap-6">
      {/* 1. TOP BAR: SEARCH & BELL */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Input
            className="w-full pl-4 pr-10 h-11"
            placeholder="Search tasks, projects, or employees..."
            type="text"
          />
          <Search
            size={18}
            className="absolute text-muted-foreground right-3 top-1/2 -translate-y-1/2"
          />
        </div>

        <ThemeToggle />
      </div>

      {/* 2. EXPRESS BANNER: Responsive stacking */}
      {pendingCount > 0 && (
        <div className="bg-violet-2 border border-mauve-3 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="bg-card p-2.5 rounded-xl text-violet-10 shadow-sm border border-mauve-2 shrink-0">
              <AlertCircle size={22} />
            </div>
            <div>
              <h3 className="text-foreground font-bold text-sm tracking-tight">
                Review Required
              </h3>
              <p className="text-muted-foreground text-xs mt-0.5">
                You have{" "}
                <span className="font-bold text-violet-10">{pendingCount}</span>{" "}
                internal tasks awaiting your{" "}
                {isHr ? "verification" : "approval"}.
              </p>
            </div>
          </div>
          <Link
            to={approvalsLink}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-primary-hover transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            {isHr && !isHead ? "Go to Verification" : "Go to Approvals"}{" "}
            <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* 3. HERO BANNER: Personalized */}
      <PersonalizedHeroBanner />
    </div>
  );
}

export default DashboardHeader;
