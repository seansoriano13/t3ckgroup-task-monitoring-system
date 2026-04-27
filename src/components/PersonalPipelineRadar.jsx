import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { taskService } from "../services/taskService.js";
import { Activity, TrendingUp, Star, Clock, CheckCircle2 } from "lucide-react";
import { TASK_STATUS } from "../constants/status";
import Avatar from "./Avatar";

export default function PersonalPipelineRadar({ selectedMonth }) {
  const { user } = useAuth();

  // Fetch the user's tasks (reusing dashboard query)
  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: ["dashboardTasks", user?.id, "personal"],
    queryFn: () => taskService.getMyTasks(user?.id),
    enabled: !!user?.id,
  });

  const stats = useMemo(() => {
    if (!rawTasks.length) return null;

    const selDate = selectedMonth ? new Date(selectedMonth) : new Date();
    const currentMonth = selDate.getMonth();
    const currentYear = selDate.getFullYear();

    let total = 0;
    let draft = 0;
    let rejected = 0;
    let pendingHead = 0;
    let pendingHr = 0;
    let verified = 0;
    let totalGrade = 0;
    let gradedCount = 0;

    rawTasks.forEach((task) => {
      const taskDate = new Date(task.createdAt);
      if (
        taskDate.getMonth() !== currentMonth ||
        taskDate.getFullYear() !== currentYear
      ) {
        return;
      }
      if (task.status === TASK_STATUS.DELETED) return;

      total++;
      if (task.status === TASK_STATUS.INCOMPLETE) draft++;
      if (task.status === TASK_STATUS.AWAITING_APPROVAL) pendingHead++;
      if (task.status === TASK_STATUS.NOT_APPROVED) rejected++;
      if (task.status === TASK_STATUS.COMPLETE && !task.hrVerified) pendingHr++;
      if (task.hrVerified) verified++;

      if (task.status === TASK_STATUS.COMPLETE && task.grade > 0) {
        totalGrade += task.grade;
        gradedCount++;
      }
    });

    return {
      total,
      draft,
      rejected,
      pendingHead,
      pendingHr,
      verified,
      avgGrade: gradedCount > 0 ? (totalGrade / gradedCount).toFixed(1) : "N/A",
      completionRate:
        Math.round(((pendingHead + pendingHr + verified) / total) * 100) || 0,
    };
  }, [rawTasks, selectedMonth]);

  if (isLoading) {
    return (
      <div className="h-48 bg-card border border-border rounded-3xl animate-pulse" />
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="bg-card border border-border rounded-3xl p-8 text-center">
        <Activity className="mx-auto text-mauve-5 mb-3" size={32} />
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
          No tasks recorded for this period
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-primary/20 rounded-3xl shadow-xl overflow-hidden relative group">
      {/* Visual background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl -mr-32 -mt-32 rounded-full pointer-events-none" />

      <div className="p-6 sm:p-8 relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <Avatar
                name={user?.name}
                src={user?.picture ?? undefined}
                size="lg"
                className="ring-2 ring-primary/20 shadow-lg shrink-0"
              />
              <div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                  <Activity className="text-primary" size={20} /> My Pipeline Radar
                </h2>
                <p className="text-sm text-muted-foreground mt-1 font-medium italic">
                  Visual performance tracking for{" "}
                  {selectedMonth
                    ? new Date(selectedMonth).toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })
                    : "this month"}
                </p>
              </div>
            </div>
          </div>


          <div className="flex gap-4">
            <div className="bg-muted border border-border rounded-2xl px-5 py-3 text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                Avg Grade
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[color:var(--blue-9)]">
                <Star size={16} className="fill-current" />
                <span className="text-lg font-black">{stats.avgGrade}</span>
              </div>
            </div>
            <div className="bg-muted border border-border rounded-2xl px-5 py-3 text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                Execution
              </p>
              <div className="flex items-center justify-center gap-1.5 text-green-9">
                <TrendingUp size={16} />
                <span className="text-lg font-black">
                  {stats.completionRate}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* The Pipeline Bar */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-end">
            <span className="text-xs font-black text-mauve-10 uppercase tracking-widest">
              Task Distribution
            </span>
            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
              {stats.total} Total Tasks
            </span>
          </div>

          <div className="h-6 w-full bg-muted/50 rounded-full overflow-hidden flex shadow-inner border border-border">
            {stats.draft > 0 && (
              <div
                style={{ width: `${(stats.draft / stats.total) * 100}%` }}
                className="bg-mauve-6/30 border-r border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground"
                title="Drafts"
              >
                {stats.draft}
              </div>
            )}
            {stats.rejected > 0 && (
              <div
                style={{ width: `${(stats.rejected / stats.total) * 100}%` }}
                className="bg-primary/50 border-r border-mauve-2 flex items-center justify-center text-[10px] font-bold text-primary-foreground shadow-inner"
                title="Rejected"
              >
                {stats.rejected}
              </div>
            )}
            {stats.pendingHead > 0 && (
              <div
                style={{ width: `${(stats.pendingHead / stats.total) * 100}%` }}
                className="bg-primary border-r border-mauve-2 flex items-center justify-center text-[10px] font-bold text-primary-foreground shadow-inner"
                title="Awaiting Head Approval"
              >
                {stats.pendingHead}
              </div>
            )}
            {stats.pendingHr > 0 && (
              <div
                style={{ width: `${(stats.pendingHr / stats.total) * 100}%` }}
                className="bg-warning border-r border-mauve-2 animate-pulse flex items-center justify-center text-[10px] font-bold text-amber-950"
                title="Pending Verification"
              >
                {stats.pendingHr}
              </div>
            )}
            {stats.verified > 0 && (
              <div
                style={{ width: `${(stats.verified / stats.total) * 100}%` }}
                className="bg-green-9 flex items-center justify-center text-[10px] font-bold text-primary-foreground shadow-lg"
                title="Verified"
              >
                {stats.verified}
              </div>
            )}
          </div>
        </div>

        {/* Legend / Breakdown Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <LegendItem
            icon={<Clock size={12} />}
            label="Incomplete"
            value={stats.draft}
            color="bg-mauve-6/50"
          />
          <LegendItem
            icon={<Activity size={12} />}
            label="Rejected"
            value={stats.rejected}
            color="bg-primary/50"
          />
          <LegendItem
            icon={<Clock size={12} />}
            label="Awaiting Head"
            value={stats.pendingHead}
            color="bg-primary"
          />
          <LegendItem
            icon={<Clock size={12} />}
            label="Wait Review"
            value={stats.pendingHr}
            color="bg-warning"
          />
          <LegendItem
            icon={<CheckCircle2 size={12} />}
            label="Verified"
            value={stats.verified}
            color="bg-green-9"
          />
        </div>
      </div>
    </div>
  );
}

function LegendItem({ icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 bg-muted/50 border border-border/50 p-2 rounded-xl">
      <div className={`p-1.5 rounded-lg ${color} text-primary-foreground shadow-sm`}>
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
          {label}
        </p>
        <p className="text-sm font-black text-foreground leading-none">{value}</p>
      </div>
    </div>
  );
}
