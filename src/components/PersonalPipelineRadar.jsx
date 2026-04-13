import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { taskService } from "../services/taskService.js";
import { Activity, TrendingUp, Star, Clock, CheckCircle2 } from "lucide-react";
import { TASK_STATUS } from "../constants/status";

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
      pendingHr,
      verified,
      avgGrade: gradedCount > 0 ? (totalGrade / gradedCount).toFixed(1) : "N/A",
      completionRate: Math.round(((pendingHr + verified) / total) * 100) || 0,
    };
  }, [rawTasks, selectedMonth]);

  if (isLoading) {
    return (
      <div className="h-48 bg-gray-1 border border-gray-4 rounded-3xl animate-pulse" />
    );
  }

  if (!stats || stats.total === 0) {
      return (
          <div className="bg-gray-1 border border-gray-4 rounded-3xl p-8 text-center">
              <Activity className="mx-auto text-gray-5 mb-3" size={32} />
              <p className="text-gray-9 font-bold uppercase tracking-widest text-xs">No tasks recorded for this period</p>
          </div>
      );
  }

  return (
    <div className="bg-gray-1 border border-primary/20 rounded-3xl shadow-xl overflow-hidden relative group">
      {/* Visual background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl -mr-32 -mt-32 rounded-full pointer-events-none" />
      
      <div className="p-6 sm:p-8 relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
          <div>
            <h2 className="text-xl font-black text-gray-12 uppercase tracking-tight flex items-center gap-2">
              <Activity className="text-primary" size={20} /> My Pipeline Radar
            </h2>
            <p className="text-sm text-gray-9 mt-1 font-medium italic">
              Visual performance tracking for {selectedMonth ? new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' }) : 'this month'}
            </p>
          </div>

          <div className="flex gap-4">
             <div className="bg-gray-2 border border-gray-4 rounded-2xl px-5 py-3 text-center">
                <p className="text-[10px] font-black text-gray-8 uppercase tracking-widest mb-1">Avg Grade</p>
                <div className="flex items-center justify-center gap-1.5 text-blue-500">
                    <Star size={16} className="fill-current" />
                    <span className="text-lg font-black">{stats.avgGrade}</span>
                </div>
             </div>
             <div className="bg-gray-2 border border-gray-4 rounded-2xl px-5 py-3 text-center">
                <p className="text-[10px] font-black text-gray-8 uppercase tracking-widest mb-1">Execution</p>
                <div className="flex items-center justify-center gap-1.5 text-green-500">
                    <TrendingUp size={16} />
                    <span className="text-lg font-black">{stats.completionRate}%</span>
                </div>
             </div>
          </div>
        </div>

        {/* The Pipeline Bar */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-end">
            <span className="text-xs font-black text-gray-10 uppercase tracking-widest">Task Distribution</span>
            <span className="text-[10px] font-bold text-gray-8 bg-gray-2 px-2 py-0.5 rounded border border-gray-4">{stats.total} Total Tasks</span>
          </div>
          
          <div className="h-6 w-full bg-gray-3 rounded-full overflow-hidden flex shadow-inner border border-gray-4">
            {stats.draft > 0 && (
              <div 
                style={{ width: `${(stats.draft / stats.total) * 100}%` }}
                className="bg-gray-6/30 border-r border-gray-4 flex items-center justify-center text-[10px] font-bold text-gray-8"
                title="Drafts"
              >
                {stats.draft}
              </div>
            )}
            {stats.rejected > 0 && (
              <div 
                style={{ width: `${(stats.rejected / stats.total) * 100}%` }}
                className="bg-red-500 border-r border-gray-2 flex items-center justify-center text-[10px] font-bold text-white shadow-inner"
                title="Rejected"
              >
                {stats.rejected}
              </div>
            )}
            {stats.pendingHr > 0 && (
              <div 
                style={{ width: `${(stats.pendingHr / stats.total) * 100}%` }}
                className="bg-amber-500 border-r border-gray-2 animate-pulse flex items-center justify-center text-[10px] font-bold text-amber-950"
                title="Pending Verification"
              >
                {stats.pendingHr}
              </div>
            )}
            {stats.verified > 0 && (
              <div 
                style={{ width: `${(stats.verified / stats.total) * 100}%` }}
                className="bg-green-500 flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
                title="Verified"
              >
                {stats.verified}
              </div>
            )}
          </div>
        </div>

        {/* Legend / Breakdown Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <LegendItem icon={<Clock size={12}/>} label="Incomplete" value={stats.draft} color="bg-gray-6/50" />
           <LegendItem icon={<Activity size={12}/>} label="Rejected" value={stats.rejected} color="bg-red-500" />
           <LegendItem icon={<Clock size={12}/>} label="Wait Review" value={stats.pendingHr} color="bg-amber-500" />
           <LegendItem icon={<CheckCircle2 size={12}/>} label="Verified" value={stats.verified} color="bg-green-500" />
        </div>
      </div>
    </div>
  );
}

function LegendItem({ icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 bg-gray-2/50 border border-gray-4/50 p-2 rounded-xl">
      <div className={`p-1.5 rounded-lg ${color} text-white shadow-sm`}>{icon}</div>
      <div>
        <p className="text-[9px] font-bold text-gray-8 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-sm font-black text-gray-12 leading-none">{value}</p>
      </div>
    </div>
  );
}
