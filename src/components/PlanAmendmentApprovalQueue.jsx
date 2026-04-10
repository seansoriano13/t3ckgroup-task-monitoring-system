import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { salesService } from "../services/salesService";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { ClipboardList, Clock, CheckCircle2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

export default function PlanAmendmentApprovalQueue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);

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
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-between mb-4 border-b border-gray-4 pb-2">
         <div className="flex items-center gap-2">
            <ClipboardList className="text-amber-500" size={20} />
            <h2 className="text-lg font-black text-gray-12 uppercase tracking-tight">Schedule Amendments</h2>
         </div>
         <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-black text-amber-600 tracking-widest">
            {amendments.length} PENDING
         </div>
      </div>
      
      {amendments.map(plan => {
         const isExpanded = expandedId === plan.id;
         const changes = compareSnapshotToActivities(plan.amendment_snapshot || [], plan.sales_activities || []);
         
         return (
            <div key={plan.id} className={`bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden shadow-sm transition-all hover:border-gray-6 ${isExpanded ? 'ring-2 ring-amber-500/20 border-amber-500/30' : ''}`}>
               <div 
                 onClick={() => setExpandedId(isExpanded ? null : plan.id)}
                 className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-amber-500/5' : 'bg-gray-2/50 hover:bg-gray-2'}`}
               >
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-black border border-primary/20 flex items-center justify-center uppercase shrink-0 shadow-inner">
                       {plan.employees?.name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-12 leading-tight flex items-center gap-2">
                         {plan.employees?.name}
                         <span className="text-[10px] font-normal text-gray-9 bg-gray-2 px-2 py-0.5 rounded border border-gray-4 uppercase tracking-widest">
                            Week: {plan.week_start_date}
                         </span>
                      </h3>
                      <p className="text-xs text-gray-11 mt-1 flex items-center gap-1.5 line-clamp-1">
                         <AlertCircle size={14} className="text-amber-600 shrink-0"/> 
                         <span className="font-semibold text-amber-700">Reason:</span> {plan.amendment_reason || 'No reason provided'}
                      </p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-end mr-2">
                       <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Review Items</span>
                       <span className="text-[9px] text-gray-9 font-bold">{changes.added.length + changes.removed.length + changes.modified.length} Changes Detected</span>
                    </div>
                    {isExpanded ? <ChevronUp size={20} className="text-gray-12"/> : <ChevronDown size={20} className="text-gray-8"/>}
                 </div>
               </div>

               {isExpanded && (
                  <div className="p-6 bg-white border-t border-gray-4 animate-in slide-in-from-top-2">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
                           <h4 className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              Added ({changes.added.length})
                           </h4>
                           <div className="space-y-2">
                              {changes.added.length === 0 ? <p className="text-xs text-gray-8 italic">None</p> : changes.added.map((a, i) => (
                                 <div key={i} className="bg-white border border-green-500/20 px-2 py-1.5 rounded shadow-sm">
                                    <p className="text-xs font-bold text-gray-12 truncate">+{a.account_name}</p>
                                    <p className="text-[10px] text-gray-9 uppercase tracking-tighter">{a.scheduled_date} • {a.time_of_day}</p>
                                 </div>
                              ))}
                           </div>
                        </div>
                        
                        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                           <h4 className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              Removed ({changes.removed.length})
                           </h4>
                           <div className="space-y-2">
                              {changes.removed.length === 0 ? <p className="text-xs text-gray-8 italic">None</p> : changes.removed.map((a, i) => (
                                 <div key={i} className="bg-white border border-red-500/20 px-2 py-1.5 rounded shadow-sm opacity-60">
                                    <p className="text-xs font-bold text-gray-12 line-through truncate">-{a.account_name}</p>
                                    <p className="text-[10px] text-gray-9 uppercase tracking-tighter">{a.scheduled_date} • {a.time_of_day}</p>
                                 </div>
                              ))}
                           </div>
                        </div>

                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                           <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              Modified ({changes.modified.length})
                           </h4>
                           <div className="space-y-2">
                              {changes.modified.length === 0 ? <p className="text-xs text-gray-8 italic">None</p> : changes.modified.map((m, i) => (
                                 <div key={i} className="bg-white border border-blue-500/20 px-2 py-1.5 rounded shadow-sm">
                                    <p className="text-xs font-bold text-gray-12 truncate">{m.activity.account_name}</p>
                                    <div className="mt-1 space-y-0.5">
                                       {m.diffs.map((d, j) => <p key={j} className="text-[10px] text-blue-700 bg-blue-50 px-1 rounded inline-block w-full">{d}</p>)}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>

                     <div className="flex justify-end gap-3 pt-4 border-t border-gray-4">
                         <button 
                            disabled={resolveMutation.isPending}
                            onClick={() => resolveMutation.mutate({ planId: plan.id, isApproved: false })}
                            className="px-5 py-2.5 bg-gray-1 hover:bg-gray-2 text-gray-11 font-black uppercase tracking-widest text-[11px] rounded-xl border border-gray-4 transition-all active:scale-95 disabled:opacity-50"
                         >
                            Reject & Revert
                         </button>
                         <button 
                            disabled={resolveMutation.isPending}
                            onClick={() => resolveMutation.mutate({ planId: plan.id, isApproved: true })}
                            className="px-8 py-2.5 bg-gray-12 hover:bg-black text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
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
