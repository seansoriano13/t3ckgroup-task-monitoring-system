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
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { taskService } from "../services/taskService.js";
import { TASK_STATUS } from "../constants/status.js";

export default function DashboardStats({ selectedMonth }) {
  const { user } = useAuth();

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
    const selDate = selectedMonth ? new Date(selectedMonth) : new Date();
    const currentMonth = selDate.getMonth();
    const currentYear = selDate.getFullYear();

    // 1. Filter tasks for ONLY this month, EXCLUDING Super Admin
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

      return (
        taskDate.getMonth() === currentMonth &&
        taskDate.getFullYear() === currentYear
      );
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

    let hrPendingApprovals = 0;
    let hrPendingVerification = 0;
    let hrRejected = 0;
    let hrAllTasks = 0;

    if (isHr) {
      hrPendingApprovals = thisMonthTasks.filter(
        (t) =>
          t.status === TASK_STATUS.INCOMPLETE ||
          t.status === TASK_STATUS.AWAITING_APPROVAL,
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
      teamCompleted = teamTasks.filter((t) => t.status === TASK_STATUS.COMPLETE).length;
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
      hrPendingApprovals,
      hrPendingVerification,
      hrRejected,
      hrAllTasks,
    };
  }, [rawTasks, user?.id, isHead, isHr, userSubDept, userDept, selectedMonth]);

  if (isLoading) {
    return (
      <div className="h-24 bg-gray-2 rounded-xl border border-gray-4 animate-pulse"></div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* --- EMPLOYEE VIEW --- */}
      {!isManagement && (
        <>
          <StatCard
            title="My Pending"
            value={stats.myPending}
            subtitle="Drafting"
            icon={<Clock size={20} className="text-gray-9" />}
            borderColor="border-t-gray-500"
          />
          <StatCard
            title="Pending Approval"
            value={stats.myPendingApproval}
            subtitle="Head Review"
            icon={<Clock size={20} className="text-yellow-500" />}
            borderColor="border-t-yellow-500"
          />
          <StatCard
            title="Pending HR Verification"
            value={stats.myPendingHr}
            subtitle="HR Verification"
            icon={<ShieldAlert size={20} className="text-amber-500" />}
            borderColor="border-t-amber-500"
          />
          <StatCard
            title="My Completed"
            value={stats.myCompleted}
            subtitle="Verified this Month"
            icon={<CheckCircle2 size={20} className="text-green-500" />}
            borderColor="border-t-green-500"
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
            icon={<AlertCircle size={20} className="text-primary" />}
            borderColor="border-t-primary"
            highlight={stats.teamPendingApprovals > 0}
          />
          <StatCard
            title="Rejected Tasks"
            value={stats.teamRejected}
            subtitle="Needs Fixing"
            icon={<XCircle size={20} className="text-red-500" />}
            borderColor="border-t-red-500"
          />
          <StatCard
            title="Pending HR Verification"
            value={stats.teamPendingHr}
            subtitle="Waiting HR Review"
            icon={<Clock size={20} className="text-amber-500" />}
            borderColor="border-t-amber-500"
          />
          <StatCard
            title="Completed Tasks"
            value={stats.teamCompleted}
            subtitle="Completed this Month"
            icon={<CheckCircle2 size={20} className="text-blue-500" />}
            borderColor="border-t-blue-500"
          />
        </>
      )}

      {/* --- HR VIEW --- */}
      {isHr && (
        <>
          <StatCard
            title="Pending Approval"
            value={stats.hrPendingApprovals}
            subtitle="Head Review"
            icon={<Clock size={20} className="text-yellow-500" />}
            borderColor="border-t-yellow-500"
          />
          <StatCard
            title="Pending Verification"
            value={stats.hrPendingVerification}
            subtitle="HR Action Required"
            icon={<ShieldAlert size={20} className="text-primary" />}
            borderColor="border-t-primary"
            highlight={stats.hrPendingVerification > 0}
          />
          <StatCard
            title="Rejected Tasks"
            value={stats.hrRejected}
            subtitle="Needs Fixing"
            icon={<XCircle size={20} className="text-red-500" />}
            borderColor="border-t-red-500"
          />
          <StatCard
            title="All Tasks"
            value={stats.hrAllTasks}
            subtitle="Org Output this Month"
            icon={<Database size={20} className="text-blue-500" />}
            borderColor="border-t-blue-500"
          />
        </>
      )}
    </div>
  );
}

// Reusable Sub-component for the cards
function StatCard({ title, value, subtitle, icon, highlight }) {
  return (
    <div
      className={`bg-gray-1 rounded-xl p-5 border border-gray-4 shadow-sm relative overflow-hidden transition-all ${highlight ? "bg-primary/5 border-primary/30" : ""}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] font-bold text-gray-9 uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-3xl font-black text-gray-12 mt-1">{value}</h3>
        </div>
        <div className="p-2 bg-gray-2 rounded-lg border border-gray-4">
          {icon}
        </div>
      </div>
      <p className="text-[10px] font-semibold text-gray-9 uppercase tracking-widest">
        {subtitle}
      </p>

      {/* Decorative background glow if highlighted */}
      {highlight && (
        <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-primary/20 blur-xl rounded-full pointer-events-none" />
      )}
    </div>
  );
}
