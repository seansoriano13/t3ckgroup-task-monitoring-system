import { useState } from "react";
import Dot from "./ui/Dot";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { salesService } from "../services/salesService";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { ClipboardList, Clock, CheckCircle2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

export default function PlanAmendmentApprovalQueue({ initialExpandedId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(initialExpandedId || null);

  const { data: amendments = [], isLoading } = useQuery({
    queryKey: ["planAmendments", user?.department],
    queryFn: async () => {
      const isSuperAdmin = user?.is_super_admin || user?.isSuperAdmin;
      
      let query = supabase
        .from('sales_weekly_plans')
        .select(`
           *,
           employees!sales_weekly_plans_employee_id_fkey!inner(name, department, sub_department),
           sales_activities(*)
        `)
        .eq('status', 'SUBMITTED')
        .not('amendment_snapshot', 'is', null)
        .order('amendment_requested_at', { ascending: false });

      if (!isSuperAdmin && user?.department) {
         query = query.eq('employees.department', user.department);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data;
    },
    enabled: !!user?.id
  });

  const resolveMutation = useMutation({
    mutationFn: ({ planId, isApproved }) => salesService.resolvePlanAmendment(planId, isApproved, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planAmendments"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyPlanLoc"] });
      queryClient.invalidateQueries({ queryKey: ["allSalesActivities"] });
      toast.success("Amendment resolved successfully.");
    },
    onError: (err) => toast.error(err.message)
  });

  if (isLoading || amendments.length === 0) return null;

  const compareSnapshotToActivities = (oldActivities = [], currentActivities = []) => {
    const changes = { added: [], removed: [], modified: [] };
    
    // Filter out deleted activities from both sides before comparing if they are present
    const activeOld = oldActivities.filter(a => !a.is_deleted);
    const activeCurrent = currentActivities.filter(a => !a.is_deleted);

    const oldMap = new Map();
    activeOld.forEach(a => oldMap.set(a.id, a));

    const currentMap = new Map();
    activeCurrent.forEach(a => currentMap.set(a.id, a));

    // 1. Find Added: In current but not in old
    activeCurrent.forEach(c => {
       if (!c.id || !oldMap.has(c.id)) {
          // Check for similar content to avoid double counting if ID changed (though IDs shouldn't change normally)
          const matchedOld = activeOld.find(o => 
             o.account_name === c.account_name && 
             o.scheduled_date === c.scheduled_date && 
             o.time_of_day === c.time_of_day
          );
          if (!matchedOld) {
             changes.added.push(c);
          }
       }
    });

    // 2. Find Removed & Modified
    activeOld.forEach(o => {
       if (!o.id || !currentMap.has(o.id)) {
          // In old but not in current (or marked as deleted)
          const matchedNew = activeCurrent.find(c => 
             c.account_name === o.account_name && 
             c.scheduled_date === o.scheduled_date && 
             c.time_of_day === o.time_of_day
          );
          if (!matchedNew && (o.activity_type !== 'None' || o.account_name)) {
             changes.removed.push(o);
          }
       } else {
          // Compare fields for modifications
          const c = currentMap.get(o.id);
          const diffs = [];
          
          if (o.account_name !== c.account_name) diffs.push(`Account: ${o.account_name || 'Empty'} -> ${c.account_name || 'Empty'}`);
          if (o.scheduled_date !== c.scheduled_date) diffs.push(`Date: ${o.scheduled_date} -> ${c.scheduled_date}`);
          if (o.time_of_day !== c.time_of_day) diffs.push(`Block: ${o.time_of_day} -> ${c.time_of_day}`);
          if (o.activity_type !== c.activity_type) diffs.push(`Type: ${o.activity_type} -> ${c.activity_type}`);
          if ((o.remarks_plan || '') !== (c.remarks_plan || '')) diffs.push(`Details Changed`);
          if (Number(o.expense_amount || 0) !== Number(c.expense_amount || 0)) diffs.push(`Fund: ₱${o.expense_amount || 0} -> ₱${c.expense_amount || 0}`);
          
          if (diffs.length > 0) {
             changes.modified.push({ activity: c, diffs });
          }
       }
    });

    return changes;
  };

  return (
    <div className="space-y-4">
      
      {amendments.map(plan => {
         const isExpanded = expandedId === plan.id;
         const changes = compareSnapshotToActivities(plan.amendment_snapshot || [], plan.sales_activities || []);
         
         return (
            <div 
              key={plan.id} 
              className={`bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md ${
                isExpanded ? "ring-2 ring-amber-500/20 border-amber-500/40" : ""
              }`}
            >
              {/* Header: Matching EmployeeBlock */}
              <div 
                onClick={() => setExpandedId(isExpanded ? null : plan.id)}
                className="bg-muted/30 p-4 border-b border-border flex items-center justify-between cursor-pointer hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-black border border-primary/20 shadow-inner flex items-center justify-center uppercase">
                    {plan.employees?.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground leading-tight">
                      {plan.employees?.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                        Week: {plan.week_start_date}
                      </span>
                      <span className="text-[10px] font-black bg-warning/10 text-amber-10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest">
                        {changes.added.length + changes.removed.length + changes.modified.length} Changes Detected
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col items-end mr-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-10">Review Items</span>
                    <span className="text-[9px] text-mauve-5 font-bold uppercase tracking-tighter">Plan Amendment</span>
                  </div>
                  {isExpanded ? <ChevronUp size={20} className="text-foreground"/> : <ChevronDown size={20} className="text-muted-foreground"/>}
                </div>
              </div>

               {isExpanded && (
                  <div className="p-6 bg-card border-t border-mauve-4 animate-in slide-in-from-top-2">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-green-9/5 border border-green-500/10 rounded-xl p-4">
                           <h4 className="text-[10px] font-black text-green-11 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Dot color="bg-green-9" />
                              Added ({changes.added.length})
                           </h4>
                           <div className="space-y-2">
                              {changes.added.length === 0 ? <p className="text-xs text-mauve-8 italic">None</p> : changes.added.map((a, i) => (
                                 <div key={i} className="bg-card border border-green-500/20 px-2 py-1.5 rounded shadow-sm">
                                    <p className="text-xs font-bold text-foreground truncate">+{a.account_name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">{a.scheduled_date} • {a.time_of_day}</p>
                                 </div>
                              ))}
                           </div>
                        </div>
                        
                        <div className="bg-destructive/5 border border-red-500/10 rounded-xl p-4">
                           <h4 className="text-[10px] font-black text-destructive uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Dot color="bg-destructive" />
                              Removed ({changes.removed.length})
                           </h4>
                           <div className="space-y-2">
                              {changes.removed.length === 0 ? <p className="text-xs text-mauve-8 italic">None</p> : changes.removed.map((a, i) => (
                                 <div key={i} className="bg-card border border-red-500/20 px-2 py-1.5 rounded shadow-sm opacity-60">
                                    <p className="text-xs font-bold text-foreground line-through truncate">-{a.account_name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">{a.scheduled_date} • {a.time_of_day}</p>
                                 </div>
                              ))}
                           </div>
                        </div>

                        <div className="bg-blue-9/5 border border-blue-500/10 rounded-xl p-4">
                           <h4 className="text-[10px] font-black text-blue-11 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Dot color="bg-blue-9" />
                              Modified ({changes.modified.length})
                           </h4>
                           <div className="space-y-2">
                              {changes.modified.length === 0 ? <p className="text-xs text-mauve-8 italic">None</p> : changes.modified.map((m, i) => (
                                 <div key={i} className="bg-card border border-blue-500/20 px-2 py-1.5 rounded shadow-sm">
                                    <p className="text-xs font-bold text-foreground truncate">{m.activity.account_name}</p>
                                    <div className="mt-1 space-y-0.5">
                                       {m.diffs.map((d, j) => <p key={j} className="text-[10px] text-blue-11 bg-blue-2 px-1 rounded inline-block w-full">{d}</p>)}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>

                      <div className="flex justify-end gap-3 pt-6 border-t border-mauve-3">
                          <button 
                             disabled={resolveMutation.isPending}
                             onClick={() => resolveMutation.mutate({ planId: plan.id, isApproved: false })}
                             className="px-6 py-2.5 bg-mauve-2 hover:bg-mauve-3 text-mauve-7 text-[10px] font-black uppercase tracking-widest rounded-xl border border-mauve-4 transition-all active:scale-95 disabled:opacity-50"
                          >
                             Reject & Revert
                          </button>
                          <button 
                             disabled={resolveMutation.isPending}
                             onClick={() => resolveMutation.mutate({ planId: plan.id, isApproved: true })}
                             className="px-8 py-2.5 bg-foreground hover:bg-mauve-12 text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                          >
                             {resolveMutation.isPending ? 'Processing...' : 'Approve Amendments'}
                          </button>
                      </div>
                  </div>
               )}
            </div>
         );
      })}
    </div>
  );
}
