import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { salesService } from "../services/salesService";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function DayDeletionApprovalQueue({ initialHighlightDate }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

      return Object.values(grouped);
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
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-between mb-4 border-b border-gray-4 pb-2">
        <div className="flex items-center gap-2">
          <Trash2 className="text-red-500" size={20} />
          <h2 className="text-lg font-black text-gray-12 uppercase tracking-tight">
            Day Deletion Requests
          </h2>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full text-[10px] font-black text-red-600 tracking-widest">
          {requests.length} URGENT
        </div>
      </div>

      {requests.map((req) => {
        const isHighlighted = initialHighlightDate === req.date;
        return (
          <div
            key={`${req.employee_id}_${req.date}`}
            className={`bg-gray-1 border rounded-2xl overflow-hidden shadow-sm hover:border-red-500/40 transition-all group ${isHighlighted ? "border-red-500 ring-2 ring-red-500/20 scale-[1.01] z-10" : "border-red-500/20"}`}
          >
            <div className="bg-red-500/5 p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4 shrink-0">
                <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-600 font-black flex items-center justify-center border border-red-500/20 shadow-inner text-xl">
                  {req.employeeName?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-12 text-lg leading-tight uppercase tracking-tight">
                    {req.employeeName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black bg-white border border-gray-3 px-2 py-0.5 rounded text-gray-9 flex items-center gap-1 uppercase tracking-widest">
                      <Calendar size={12} /> {req.date}
                    </span>
                    <span className="text-[10px] font-black bg-red-100 border border-red-200 px-2 py-0.5 rounded text-red-700 uppercase tracking-widest">
                      {req.activities.length} Activities
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0 bg-white/50 border border-red-500/10 rounded-xl p-4 shadow-inner">
                <label className="text-[10px] font-black text-red-600 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
                  <AlertCircle size={14} /> Reason for Wipe
                </label>
                <p className="text-sm text-gray-12 font-medium leading-relaxed italic">
                  "{req.reason || "No reason provided"}"
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                <button
                  disabled={resolveMutation.isPending}
                  onClick={() =>
                    resolveMutation.mutate({
                      employeeId: req.employee_id,
                      date: req.date,
                      isApproved: false,
                    })
                  }
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-1 hover:bg-gray-2 text-gray-11 font-black uppercase tracking-widest text-[11px] rounded-xl border border-gray-4 transition-all active:scale-95 disabled:opacity-50"
                >
                  <XCircle size={16} className="text-gray-8" /> Deny
                </button>
                <button
                  disabled={resolveMutation.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Are you sure you want to PERMANENTLY delete all ${req.activities.length} activities for ${req.employeeName} on ${req.date}?`,
                      )
                    ) {
                      resolveMutation.mutate({
                        employeeId: req.employee_id,
                        date: req.date,
                        isApproved: true,
                      });
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Approve Wipe
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
