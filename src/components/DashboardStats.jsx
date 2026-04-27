import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Activity,
  AlertCircle,
  ShieldAlert,
  XCircle,
  Database,
  UserCheck,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { taskService } from "../services/taskService.js";
import { TASK_STATUS } from "../constants/status.js";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router";

export default function DashboardStats({ selectedRange }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isHr = user?.is_hr || user?.isHr;
  const isHead = user?.is_head || user?.isHead;
  const isManagement = isHr || isHead;
  const userSubDept = user?.sub_department || user?.subDepartment;
  const userDept = user?.department;

  // Used cached data
  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: ["dashboardTasks", user?.id, isManagement ? "all" : "personal"],
    queryFn: () =>
      isManagement
        ? taskService.getAllTasks()
        : taskService.getMyTasks(user?.id),
    enabled: !!user?.id,
  });

  const stats = useMemo(() => {
    // 1. Filter tasks for ONLY this date range, EXCLUDING Super Admin
    const rangeStart = selectedRange?.startDate
      ? new Date(`${selectedRange.startDate}T00:00:00`)
      : new Date(0);
    const rangeEnd = selectedRange?.endDate
      ? new Date(`${selectedRange.endDate}T00:00:00`)
      : new Date();

    const thisMonthTasks = rawTasks.filter((t) => {
      const taskDate = new Date(t.createdAt);

      const roleStr = (t.creator?.role || "").toLowerCase();
      const deptStr = (t.creator?.department || "").toLowerCase();
      if (
        t.creator?.isSuperAdmin ||
        roleStr.includes("admin") ||
        deptStr.includes("super admin") ||
        deptStr.includes("management")
      ) {
        return false;
      }

      return taskDate >= rangeStart && taskDate < rangeEnd;
    });

    // 2. Calculate Personal Stats
    const myTasks = thisMonthTasks.filter((t) => t.loggedById === user?.id);
    const myPending = myTasks.filter(
      (t) => t.status === TASK_STATUS.INCOMPLETE && !t.endAt,
    ).length;
    const myPendingApproval = myTasks.filter(
      (t) =>
        (t.status === TASK_STATUS.INCOMPLETE && !!t.endAt) ||
        t.status === TASK_STATUS.AWAITING_APPROVAL,
    ).length;
    const myPendingHr = myTasks.filter(
      (t) => t.status === TASK_STATUS.COMPLETE && !t.hrVerified,
    ).length;
    // For My Completed, it's tasks that are FULLY completed and verified
    const myCompleted = myTasks.filter(
      (t) => t.status === TASK_STATUS.COMPLETE && t.hrVerified,
    ).length;

    // 3. Calculate Management Stats (Only if Head or HR)
    let teamPendingApprovals = 0;
    let teamCompleted = 0;
    let teamPendingHr = 0;
    let teamRejected = 0;

    let hrInProgress = 0;
    let hrOverdueUnsubmitted = 0;
    let hrAwaitingHead = 0;
    let hrPendingVerification = 0;
    let hrRejected = 0;
    let hrAllTasks = 0;

    const now = new Date();

    if (isHr) {
      // INCOMPLETE + no end_at → actively being logged, nothing to act on
      hrInProgress = thisMonthTasks.filter(
        (t) => t.status === TASK_STATUS.INCOMPLETE && !t.endAt,
      ).length;
      // INCOMPLETE + end_at in the past → employee hasn't submitted yet
      hrOverdueUnsubmitted = thisMonthTasks.filter(
        (t) =>
          t.status === TASK_STATUS.INCOMPLETE &&
          t.endAt &&
          new Date(t.endAt) < now,
      ).length;
      // AWAITING APPROVAL → employee submitted, Head hasn't reviewed
      hrAwaitingHead = thisMonthTasks.filter(
        (t) => t.status === TASK_STATUS.AWAITING_APPROVAL,
      ).length;
      hrPendingVerification = thisMonthTasks.filter(
        (t) => t.status === TASK_STATUS.COMPLETE && !t.hrVerified,
      ).length;
      hrRejected = thisMonthTasks.filter(
        (t) => t.status === TASK_STATUS.NOT_APPROVED,
      ).length;
      hrAllTasks = thisMonthTasks.length;
    } else if (isHead) {
      let teamTasks = thisMonthTasks.filter((t) => t.loggedById !== user?.id);

      // Head only tracks their sub-department, or entire department if no sub-dept
      teamTasks = teamTasks.filter((t) => {
        const taskSubDept =
          t.sub_department ||
          t.creator?.sub_department ||
          t.employees?.sub_department;
        const taskDept = t.creator?.department || t.employees?.department;
        if (userSubDept) {
          return taskSubDept === userSubDept;
        } else {
          return taskDept === userDept;
        }
      });

      teamPendingApprovals = teamTasks.filter(
        (t) =>
          t.status === TASK_STATUS.INCOMPLETE ||
          t.status === TASK_STATUS.AWAITING_APPROVAL,
      ).length;
      teamCompleted = teamTasks.filter(
        (t) => t.status === TASK_STATUS.COMPLETE,
      ).length;
      teamRejected = teamTasks.filter(
        (t) => t.status === TASK_STATUS.NOT_APPROVED,
      ).length;
      teamPendingHr = teamTasks.filter(
        (t) => t.status === TASK_STATUS.COMPLETE && !t.hrVerified,
      ).length;
    }

    return {
      myPending,
      myPendingApproval,
      myPendingHr,
      myCompleted,
      teamPendingApprovals,
      teamCompleted,
      teamRejected,
      teamPendingHr,
      hrInProgress,
      hrOverdueUnsubmitted,
      hrAwaitingHead,
      hrPendingVerification,
      hrRejected,
      hrAllTasks,
    };
  }, [rawTasks, user?.id, isHead, isHr, userSubDept, userDept, selectedRange]);

  if (isLoading) {
    return (
      <div className="h-24 bg-muted rounded-xl border border-border animate-pulse"></div>
    );
  }

  return (
    <div className={`grid gap-4 md:gap-6 ${isHr ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
      {/* --- EMPLOYEE VIEW --- */}
      {!isManagement && (
        <>
          <StatCard
            title="My Pending"
            value={stats.myPending}
            subtitle="Drafting"
            icon={<Clock size={20} className="text-muted-foreground" />}
            color="indigo"
          />
          <StatCard
            title="Pending Approval"
            value={stats.myPendingApproval}
            subtitle="Head Review"
            icon={<Clock size={20} className="text-amber-500" />}
            color="amber"
            onClick={() => navigate("/tasks", { state: { presetFilter: { status: TASK_STATUS.AWAITING_APPROVAL } } })}
          />
          <StatCard
            title="Pending HR Verification"
            value={stats.myPendingHr}
            subtitle="HR Verification"
            icon={<ShieldAlert size={20} className="text-destructive" />}
            color="destructive"
            onClick={() => navigate("/tasks", { state: { presetFilter: { status: TASK_STATUS.COMPLETE } } })}
          />
          <StatCard
            title="My Completed"
            value={stats.myCompleted}
            subtitle="Verified this Month"
            icon={<CheckCircle2 size={20} className="text-green-500" />}
            color="emerald"
            onClick={() => navigate("/tasks", { state: { presetFilter: { status: TASK_STATUS.COMPLETE } } })}
          />
        </>
      )}

      {/* --- HEAD VIEW --- */}
      {isHead && !isHr && (
        <>
          <StatCard
            title="Pending Approval"
            value={stats.teamPendingApprovals}
            subtitle="Requires Review"
            icon={<AlertCircle size={20} className="text-foreground" />}
            color="indigo"
            onClick={() => navigate("/tasks", { state: { presetFilter: { status: TASK_STATUS.AWAITING_APPROVAL } } })}
          />
          <StatCard
            title="Rejected Tasks"
            value={stats.teamRejected}
            subtitle="Needs Fixing"
            icon={<XCircle size={20} className="text-destructive" />}
            color="destructive"
            onClick={() => navigate("/tasks", { state: { presetFilter: { status: TASK_STATUS.NOT_APPROVED } } })}
          />
          <StatCard
            title="Pending HR Verification"
            value={stats.teamPendingHr}
            subtitle="Waiting HR Review"
            icon={<Clock size={20} className="text-amber-500" />}
            color="amber"
            onClick={() => navigate("/tasks", { state: { presetFilter: { status: TASK_STATUS.COMPLETE } } })}
          />
          <StatCard
            title="Completed Tasks"
            value={stats.teamCompleted}
            subtitle="Completed this Month"
            icon={<CheckCircle2 size={20} className="text-green-500" />}
            color="emerald"
            onClick={() => navigate("/tasks", { state: { presetFilter: { status: TASK_STATUS.COMPLETE } } })}
          />
        </>
      )}

      {/* --- HR VIEW --- */}
      {isHr && (
        <>
          {/* Row 1: Pipeline health */}
          <StatCard
            title="In Progress"
            value={stats.hrInProgress}
            subtitle="Actively being logged"
            icon={<Activity size={20} className="text-muted-foreground" />}
            color="slate"
            onClick={() => navigate("/tasks", { state: { presetFilter: { status: TASK_STATUS.INCOMPLETE } } })}
          />
          <StatCard
            title="Overdue — Not Submitted"
            value={stats.hrOverdueUnsubmitted}
            subtitle="Employee action needed"
            icon={<TriangleAlert size={20} className="text-amber-500" />}
            color="amber"
            onClick={() => navigate("/tasks", { state: { presetFilter: { status: TASK_STATUS.INCOMPLETE } } })}
          />
          <StatCard
            title="Awaiting Head Review"
            value={stats.hrAwaitingHead}
            subtitle="Head action needed"
            icon={<UserCheck size={20} className="text-indigo-400" />}
            color="indigo"
            onClick={() => navigate("/tasks", { state: { presetFilter: { status: TASK_STATUS.AWAITING_APPROVAL } } })}
          />
          <StatCard
            title="Pending Verification"
            value={stats.hrPendingVerification}
            subtitle="HR Action Required"
            icon={<ShieldAlert size={20} className="text-destructive" />}
            color="destructive"
            onClick={() => navigate("/tasks", { state: { presetFilter: { status: TASK_STATUS.COMPLETE } } })}
          />
          <StatCard
            title="Rejected Tasks"
            value={stats.hrRejected}
            subtitle="Needs Fixing"
            icon={<XCircle size={20} className="text-destructive" />}
            color="destructive"
            onClick={() => navigate("/tasks", { state: { presetFilter: { status: TASK_STATUS.NOT_APPROVED } } })}
          />
          <StatCard
            title="All Tasks"
            value={stats.hrAllTasks}
            subtitle="Org Output this Month"
            icon={<Database size={20} className="text-foreground" />}
            color="indigo"
            onClick={() => navigate("/tasks")}
          />
        </>
      )}
    </div>
  );
}

// Reusable Sub-component for the cards
function StatCard({ title, value, subtitle, icon, color, onClick }) {
  const colorMap = {
    indigo: "from-indigo-500/15 to-transparent",
    amber: "from-amber-500/15 to-transparent",
    destructive: "from-red-500/15 to-transparent",
    emerald: "from-green-9/15 to-transparent",
    slate: "from-slate-500/15 to-transparent",
  };

  return (
    <Card
      onClick={onClick}
      className={`p-6 relative overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] group border-border shadow-sm ${
        onClick ? "cursor-pointer hover:-translate-y-0.5 active:scale-[0.98]" : ""
      }`}
    >
      <div
        className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorMap[color] || "from-slate-500/10 to-transparent"} -mr-8 -mt-8 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500`}
      />

      <div className="flex justify-between items-start mb-5 relative z-10">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-1">
            {title}
          </p>
          <h3 className="text-4xl font-extrabold tracking-tight text-foreground">
            {value}
          </h3>
        </div>
        <div className="p-2.5 rounded-xl bg-muted/50 border border-border group-hover:bg-muted transition-colors">
          {icon}
        </div>
      </div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest relative z-10">
        {subtitle}
      </p>
      {onClick && (
        <span className="absolute bottom-3 right-4 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest group-hover:text-muted-foreground/70 transition-colors">
          View →
        </span>
      )}
    </Card>
  );
}
