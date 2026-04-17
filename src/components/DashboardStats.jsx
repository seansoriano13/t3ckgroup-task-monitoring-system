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

export default function DashboardStats({ selectedRange }) {
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
    // 1. Filter tasks for ONLY this date range, EXCLUDING Super Admin
    const rangeStart = selectedRange?.startDate ? new Date(`${selectedRange.startDate}T00:00:00`) : new Date(0);
    const rangeEnd = selectedRange?.endDate ? new Date(`${selectedRange.endDate}T23:59:59.999`) : new Date();

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

      return taskDate >= rangeStart && taskDate <= rangeEnd;
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
  }, [rawTasks, user?.id, isHead, isHr, userSubDept, userDept, selectedRange]);

  if (isLoading) {
    return (
      <div className="h-24 bg-gray-2 rounded-xl border border-gray-4 animate-pulse"></div>
    );
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[#E5E7EB] overflow-hidden shadow-sm">
      {/* --- EMPLOYEE VIEW --- */}
      {!isManagement && (
        <>
          <StatCard
            title="My Pending"
            value={stats.myPending}
            subtitle="Drafting"
            icon={<Clock size={20} className="text-gray-9" />}
          />
          <StatCard
            title="Pending Approval"
            value={stats.myPendingApproval}
            subtitle="Head Review"
            icon={<Clock size={20} className="text-yellow-600" />}
          />
          <StatCard
            title="Pending HR Verification"
            value={stats.myPendingHr}
            subtitle="HR Verification"
            icon={<ShieldAlert size={20} className="text-red-600" />}
          />
          <StatCard
            title="My Completed"
            value={stats.myCompleted}
            subtitle="Verified this Month"
            icon={<CheckCircle2 size={20} className="text-green-600" />}
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
            icon={<AlertCircle size={20} className="text-[#111827]" />}
          />
          <StatCard
            title="Rejected Tasks"
            value={stats.teamRejected}
            subtitle="Needs Fixing"
            icon={<XCircle size={20} className="text-red-600" />}
          />
          <StatCard
            title="Pending HR Verification"
            value={stats.teamPendingHr}
            subtitle="Waiting HR Review"
            icon={<Clock size={20} className="text-amber-600" />}
          />
          <StatCard
            title="Completed Tasks"
            value={stats.teamCompleted}
            subtitle="Completed this Month"
            icon={<CheckCircle2 size={20} className="text-emerald-600" />}
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
            icon={<Clock size={20} className="text-yellow-600" />}
          />
          <StatCard
            title="Pending Verification"
            value={stats.hrPendingVerification}
            subtitle="HR Action Required"
            icon={<ShieldAlert size={20} className="text-red-600" />}
          />
          <StatCard
            title="Rejected Tasks"
            value={stats.hrRejected}
            subtitle="Needs Fixing"
            icon={<XCircle size={20} className="text-red-600" />}
          />
          <StatCard
            title="All Tasks"
            value={stats.hrAllTasks}
            subtitle="Org Output this Month"
            icon={<Database size={20} className="text-blue-600" />}
          />
        </>
      )}
    </div>
  );
}

// Reusable Sub-component for the cards
function StatCard({ title, value, subtitle, icon }) {
  return (
    <div className="bg-white p-5 relative overflow-hidden transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-3xl font-black text-[#111827] mt-1">{value}</h3>
        </div>
        <div className="flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
        {subtitle}
      </p>
    </div>
  );
}
