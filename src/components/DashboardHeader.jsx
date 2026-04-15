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

function DashboardHeader() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isHr = user?.is_hr === true || user?.isHr === true;
  const isHead = user?.is_head === true || user?.isHead === true;
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
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-gray-1 text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-primary-hover transition-all active:scale-95 shadow-lg shadow-red-a3"
          >
            Approvals <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* 3. HERO BANNER: Personalized */}
      <PersonalizedHeroBanner />
    </div>
  );
}

export default DashboardHeader;
