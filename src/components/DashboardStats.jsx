import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Activity, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { taskService } from "../services/taskService.js";

export default function DashboardStats() {
  const { user } = useAuth();

  const isHr = user?.is_hr || user?.isHr;
  const isHead = user?.is_head || user?.isHead;
  const isManagement = isHr || isHead;
  const userSubDept = user?.sub_department || user?.subDepartment;

  // 🔥 MAGIC: This uses the exact same Query Key as TasksList.
  // TanStack will just hand over the cached data instantly. Zero extra loading!
  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: ["dashboardTasks", user?.id, isManagement ? "all" : "personal"],
    queryFn: () =>
      isManagement
        ? taskService.getAllTasks()
        : taskService.getMyTasks(user?.id),
    enabled: !!user?.id,
  });

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Filter tasks for ONLY this month
    const thisMonthTasks = rawTasks.filter((t) => {
      const taskDate = new Date(t.createdAt);
      return (
        taskDate.getMonth() === currentMonth &&
        taskDate.getFullYear() === currentYear
      );
    });

    // 2. Calculate Personal Stats
    const myTasks = thisMonthTasks.filter((t) => t.loggedById === user?.id);
    const myCompleted = myTasks.filter((t) => t.status === "COMPLETE").length;
    const myPending = myTasks.filter(
      (t) => t.status !== "COMPLETE" && t.status !== "REJECTED",
    ).length;

    // 3. Calculate Management Stats (Only if Head or HR)
    let teamPendingApprovals = 0;
    let teamCompleted = 0;

    if (isManagement) {
      let teamTasks = thisMonthTasks.filter((t) => t.loggedById !== user?.id);

      if (isHead && !isHr) {
        // Head only tracks their sub-department
        teamTasks = teamTasks.filter(
          (t) =>
            (t.sub_department ||
              t.creator?.sub_department ||
              t.employees?.sub_department) === userSubDept,
        );
      }

      teamPendingApprovals = teamTasks.filter(
        (t) => t.status === "INCOMPLETE",
      ).length;
      teamCompleted = teamTasks.filter((t) => t.status === "COMPLETE").length;
    }

    return {
      myCompleted,
      myPending,
      teamPendingApprovals,
      teamCompleted,
      totalMine: myTasks.length,
    };
  }, [rawTasks, user?.id, isManagement, isHead, isHr, userSubDept]);

  if (isLoading) {
    return (
      <div className="h-24 bg-gray-2 rounded-xl border border-gray-4 animate-pulse"></div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CARD 1: My Completed  */}
      {!isManagement && (
        <StatCard
          title="My Completed"
          value={stats.myCompleted}
          subtitle="This Month"
          icon={<CheckCircle2 size={20} className="text-green-500" />}
          borderColor="border-t-green-500"
        />
      )}

      {/* CARD 2: My Pending  */}
      {!isManagement && (
        <StatCard
          title="My Pending"
          value={stats.myPending}
          subtitle="In Queue"
          icon={<Clock size={20} className="text-yellow-500" />}
          borderColor="border-t-yellow-500"
        />
      )}

      {/* CARD 3 & 4: Management vs Standard Employee View */}
      {isManagement ? (
        <>
          <StatCard
            title="Team Pending Approval"
            value={stats.teamPendingApprovals}
            subtitle="Requires Review"
            icon={<AlertCircle size={20} className="text-primary" />}
            borderColor="border-t-primary"
            highlight={stats.teamPendingApprovals > 0} // Glows red if tasks need action!
          />
          <StatCard
            title={isHr ? "Org Output" : "Team Output"}
            value={stats.teamCompleted}
            subtitle="Completed this month"
            icon={<Activity size={20} className="text-blue-500" />}
            borderColor="border-t-blue-500"
          />
        </>
      ) : (
        <>
          <StatCard
            title="Total Logged"
            value={stats.totalMine}
            subtitle="Tasks this month"
            icon={<Activity size={20} className="text-primary" />}
            borderColor="border-t-primary"
          />
          <div className="hidden lg:block bg-gray-2/50 rounded-xl border border-gray-4 border-dashed" />
          {/* Empty spacer for grid alignment on desktop for normal employees */}
        </>
      )}
    </div>
  );
}

// Reusable Sub-component for the cards
function StatCard({ title, value, subtitle, icon, borderColor, highlight }) {
  return (
    <div
      className={`bg-gray-1 rounded-xl p-5 border border-gray-4 border-t-4 ${borderColor} shadow-sm relative overflow-hidden transition-all ${highlight ? "bg-primary/5 border-primary/30" : ""}`}
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
