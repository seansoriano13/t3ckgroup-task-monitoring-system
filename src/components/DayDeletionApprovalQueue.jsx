import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { salesService } from "../services/salesService";
import { useAuth } from "../context/AuthContext";
import { confirmDeleteToast } from "./ui/CustomToast";
import toast from "react-hot-toast";
import {
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Maximize2,
  Clock,
} from "lucide-react";
import SalesTaskDetailsModal from "./SalesTaskDetailsModal";
import Dot from "./ui/Dot";

export default function DayDeletionApprovalQueue({ initialHighlightDate }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewActivity, setViewActivity] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["dayDeletionRequests", user?.department],
    queryFn: async () => {
      const isSuperAdmin = user?.is_super_admin || user?.isSuperAdmin;

      let query = supabase
        .from("sales_activities")
        .select(
          `
           *,
           employees!sales_activities_employee_id_fkey!inner(name, department, sub_department)
        `,
        )
        .not("delete_requested_by", "is", null)
        .neq("is_deleted", true)
        .order("scheduled_date", { ascending: false });

      if (!isSuperAdmin && user?.department) {
        query = query.eq("employees.department", user.department);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by Employee + Date
      const grouped = {};
      data.forEach((act) => {
        const key = `${act.employee_id}_${act.scheduled_date}`;
        if (!grouped[key]) {
          grouped[key] = {
            employee_id: act.employee_id,
            employeeName: act.employees?.name,
            date: act.scheduled_date,
            reason: act.delete_reason,
            activities: [],
          };
        }
        grouped[key].activities.push(act);
      });

      const actualResults = Object.values(grouped);

      return actualResults;
    },
    enabled: !!user?.id,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ employeeId, date, isApproved }) =>
      salesService.resolveDayDeletion(employeeId, date, isApproved, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dayDeletionRequests"] });
      queryClient.invalidateQueries({ queryKey: ["salesHeadPending"] });
      queryClient.invalidateQueries({ queryKey: ["allSalesActivities"] });
      toast.success("Day deletion request resolved.");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || requests.length === 0) return null;


  return (
    <div className="space-y-4">

      {requests.map((req) => {
        const isHighlighted = initialHighlightDate === req.date;
        return (
          <div
            key={`${req.employee_id}_${req.date}`}
            className={`bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group ${
              isHighlighted ? "ring-2 ring-red-500/20 border-red-500/40" : ""
            }`}
          >
            {/* Header: Matching EmployeeBlock */}
            <div className="bg-muted/30 p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive font-black flex items-center justify-center border border-red-500/20 shadow-inner">
                  {req.employeeName?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground leading-tight">
                    {req.employeeName}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <Calendar size={12} /> {req.date}
                    </span>
                    <span className="text-[10px] font-black bg-destructive/10 text-destructive border border-red-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest">
                      {req.activities.length} Activities
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-destructive">Pending Wipe</span>
                <span className="text-[9px] text-mauve-5 font-bold uppercase tracking-tighter">Deletion Request</span>
              </div>
            </div>

            <div className="p-6 flex flex-col lg:flex-row gap-6">
              <div className="flex items-center gap-4 shrink-0">
                <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive font-black flex items-center justify-center border border-red-500/20 shadow-inner text-xl">
                  {req.employeeName?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg leading-tight uppercase tracking-tight">
                    {req.employeeName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black bg-card border border-mauve-3 px-2 py-0.5 rounded text-muted-foreground flex items-center gap-1 uppercase tracking-widest">
                      <Calendar size={12} /> {req.date}
                    </span>
                    <span className="text-[10px] font-black bg-red-100 border border-destructive/30 px-2 py-0.5 rounded text-destructive uppercase tracking-widest">
                      {req.activities.length} Activities
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-4">
                <div className="bg-mauve-1 border border-mauve-4 rounded-xl p-4 shadow-inner">
                  <label className="text-[10px] font-black text-destructive uppercase tracking-widest block mb-2 flex items-center gap-1.5">
                    <AlertCircle size={14} /> Reason for Wipe
                  </label>
                  <p className="text-sm text-foreground font-medium leading-relaxed italic">
                    "{req.reason || "No reason provided"}"
                  </p>
                </div>

                <div className="mt-4 space-y-1.5 border-t border-red-500/10 pt-3">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                    Activities to be Wiped ({req.activities.length})
                  </p>
                  <div className="max-h-[240px] overflow-y-auto pr-2 custom-scrollbar space-y-1.5">
                    {req.activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="bg-card border border-mauve-4 rounded-lg p-2 flex items-center justify-between gap-3 hover:border-destructive/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Dot
                              size="w-1.5 h-1.5"
                              color={activity.activity_type === 'SALES CALL' ? 'bg-green-8' : 'bg-blue-400'}
                            />
                            <p className="text-[11px] font-black text-foreground truncate" title={activity.account_name}>
                              {activity.account_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 ml-3.5">
                            <span className="text-[9px] font-bold text-mauve-5 uppercase tracking-wide flex items-center gap-1">
                              <Clock size={8} /> {activity.time_of_day}
                            </span>
                            <span className="text-mauve-4 text-[9px]">•</span>
                            <span className="text-[9px] font-bold text-mauve-5 uppercase tracking-wide">
                              {activity.activity_type}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="text-mauve-4 hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-destructive/5 shrink-0"
                          onClick={() => setViewActivity(activity)}
                          title="View Details"
                        >
                          <Maximize2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-row lg:flex-col items-center justify-center gap-3 shrink-0">
                <button
                  disabled={resolveMutation.isPending}
                  onClick={() =>
                    resolveMutation.mutate({
                      employeeId: req.employee_id,
                      date: req.date,
                      isApproved: false,
                    })
                  }
                  className="w-full lg:w-32 px-4 py-2.5 bg-mauve-2 hover:bg-mauve-3 text-mauve-7 text-[10px] font-black uppercase tracking-widest rounded-xl border border-mauve-4 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle size={14} /> Deny
                </button>
                <button
                  disabled={resolveMutation.isPending}
                  onClick={() => {
                    confirmDeleteToast(
                      "Approve Day Deletion?",
                      `This will PERMANENTLY delete all ${req.activities.length} activities for ${req.employeeName} on ${req.date}. This cannot be undone.`,
                      () => resolveMutation.mutate({
                        employeeId: req.employee_id,
                        date: req.date,
                        isApproved: true,
                      })
                    );
                  }}
                  className="w-full lg:w-32 px-4 py-2.5 bg-destructive hover:bg-red-700 text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <SalesTaskDetailsModal
        isOpen={!!viewActivity}
        onClose={() => setViewActivity(null)}
        activity={viewActivity}
      />
    </div>
  );
}
