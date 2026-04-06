import { X, Calendar, User, Briefcase, Phone, Mail, MapPin, Tag, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../services/salesService";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function SalesTaskDetailsModal({ isOpen, onClose, activity }) {
  if (!isOpen || !activity) return null;

  const { user } = useAuth();
  const isAdminView = user?.isSuperAdmin || user?.isHr || user?.is_hr || user?.is_head || user?.isHead;
  const queryClient = useQueryClient();
  const [localOutcome, setLocalOutcome] = useState(activity.sales_outcome || '');

  // Sync local state whenever the opened activity changes
  useEffect(() => {
    setLocalOutcome(activity.sales_outcome || '');
  }, [activity.id, activity.sales_outcome]);

  const outcomeMutation = useMutation({
    mutationFn: ({ id, outcome }) => salesService.updateActivityOutcome(id, outcome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allSalesActivities"] });
      queryClient.invalidateQueries({ queryKey: ["dailyActivities"] });
      toast.success("Outcome saved!");
    },
    onError: (err) => toast.error(err.message)
  });

  const handleOutcomeChange = (val) => {
    setLocalOutcome(val);
    outcomeMutation.mutate({ id: activity.id, outcome: val || null });
  };

  return (
    <>
      <div className={`dropdown-backdrop z-[99] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-full max-w-[600px] bg-gray-2 border-l border-gray-4 shadow-2xl z-[9999] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-4 bg-gray-1 flex justify-between items-start">
           <div>
              <div className="flex items-center gap-3">
                 <h2 className="text-xl font-black text-gray-12">Sales Activity Details</h2>
                 <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${activity.status === 'DONE' || activity.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' : activity.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-4 text-gray-11'}`}>{activity.status}</span>
                 {/* Sales Outcome Badge */}
                 {localOutcome === 'WON' && (
                   <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/30">WON</span>
                 )}
                 {localOutcome === 'LOST' && (
                   <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/30">LOST</span>
                 )}
              </div>
              <p className="text-sm text-gray-9 font-bold mt-1 flex items-center gap-2"><Calendar size={14}/> {activity.scheduled_date} ({activity.time_of_day})</p>
           </div>
           <button onClick={onClose} className="p-2 bg-gray-3 hover:bg-gray-4 rounded-full text-gray-11 transition-colors"><X size={18} /></button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
           
           <div className="bg-gray-1 border border-gray-4 rounded-xl p-5 space-y-4 shadow-sm">
             <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-3">
               <User size={16} className="text-primary" />
               <h3 className="font-bold text-gray-12 text-sm uppercase tracking-wider">Representative</h3>
             </div>
             <p className="font-black text-lg text-gray-12">{activity.employees?.name}</p>
             <p className="text-xs font-bold text-gray-10 uppercase tracking-widest">{activity.employees?.department}</p>
           </div>
           
           <div className="bg-gray-1 border border-gray-4 rounded-xl p-5 shadow-sm">
             <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-3">
               <Briefcase size={16} className="text-blue-500" />
               <h3 className="font-bold text-gray-12 text-sm uppercase tracking-wider">Client &amp; Prospect Info</h3>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Account / Client Name</label>
                  <p className="text-sm font-bold text-gray-12 bg-gray-2 p-3 rounded-lg border border-gray-3">{activity.account_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Contact Person</label>
                  <p className="text-sm font-bold text-gray-12 bg-gray-2 p-3 rounded-lg border border-gray-3 flex items-center gap-2"><User size={14} className="text-gray-9"/> {activity.contact_person || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Contact Number</label>
                  <p className="text-sm font-bold text-gray-12 bg-gray-2 p-3 rounded-lg border border-gray-3 flex items-center gap-2"><Phone size={14} className="text-gray-9"/> {activity.contact_number || 'N/A'}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Email Address</label>
                  <p className="text-sm font-bold text-gray-12 bg-gray-2 p-3 rounded-lg border border-gray-3 flex items-center gap-2"><Mail size={14} className="text-gray-9"/> {activity.email_address || 'N/A'}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Address</label>
                  <p className="text-sm font-bold text-gray-12 bg-gray-2 p-3 rounded-lg border border-gray-3 flex items-center gap-2"><MapPin size={14} className="text-gray-9"/> {activity.address || 'N/A'}</p>
                </div>
             </div>
           </div>

           <div className="bg-gray-1 border border-gray-4 rounded-xl p-5 shadow-sm space-y-4">
             <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-3">
               <h3 className="font-bold text-gray-12 text-sm uppercase tracking-wider">Execution Remarks</h3>
             </div>
             <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Planned Activity Type</label>
                <p className="text-sm font-bold text-gray-12 bg-gray-2 p-3 rounded-lg border border-gray-3 w-max">{activity.activity_type || 'N/A'}</p>
             </div>
             <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Initial Plan Remarks</label>
                <p className="text-sm text-gray-11 bg-gray-2 p-4 rounded-lg border border-gray-3 whitespace-pre-wrap">{activity.remarks_plan || 'No remarks provided.'}</p>
             </div>
             <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Actual Execution Details</label>
                <p className="text-sm font-semibold text-gray-12 bg-blue-500/5 p-4 rounded-lg border border-blue-500/20 whitespace-pre-wrap">{activity.details_daily || 'Not executed yet.'}</p>
             </div>
           </div>

           {/* === FINANCIAL & REFERENCE SECTION === */}
           {(activity.reference_number || activity.expense_amount) && (
             <div className={`bg-gray-1 border rounded-xl p-5 shadow-sm space-y-4 ${localOutcome === 'LOST' ? 'border-red-500/30 bg-red-500/5' : localOutcome === 'WON' ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30'}`}>
               <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-3">
                 <DollarSign size={16} className="text-amber-500" />
                 <h3 className="font-bold text-gray-12 text-sm uppercase tracking-wider">Fund Request &amp; Reference</h3>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                   <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Reference No. (SQ/TRM)</label>
                   <p className="text-sm font-black text-amber-600 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 flex items-center gap-2">
                     <Tag size={14} />
                     {activity.reference_number || <span className="text-gray-7 italic font-normal text-xs">Not set (Generic BizDev)</span>}
                   </p>
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Est. Expense (₱)</label>
                   <p className="text-sm font-black text-emerald-600 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                     {activity.expense_amount ? `₱ ${Number(activity.expense_amount).toLocaleString()}` : <span className="text-gray-7 italic font-normal text-xs">No amount declared</span>}
                   </p>
                 </div>
               </div>
             </div>
           )}

            {/* Admin/Head: Editable Sales Outcome (strictly requires reference number) */}
            {isAdminView && activity.reference_number && (() => {
              const isActivityCompleted = activity.status === 'DONE' || activity.status === 'APPROVED' || activity.status === 'PENDING_APPROVAL' || activity.status === 'PENDING';
             return (
               <div className={`bg-gray-1 border rounded-xl p-5 shadow-sm space-y-3 ${
                 !isActivityCompleted ? 'border-gray-3 opacity-60' :
                 localOutcome === 'LOST' ? 'border-red-500/30' :
                 localOutcome === 'WON' ? 'border-green-500/30' :
                 'border-gray-4'
               }`}>
                 <div className="flex items-center justify-between pb-2 border-b border-gray-3">
                   <h3 className="font-bold text-gray-12 text-sm uppercase tracking-wider">Sales Outcome</h3>
                   {!isActivityCompleted && (
                     <span className="text-[10px] font-bold text-gray-8 bg-gray-3 px-2 py-0.5 rounded-full uppercase tracking-widest">Locked — Not executed yet</span>
                   )}
                 </div>
                 <div className="flex gap-3">
                   {['', 'WON', 'LOST'].map(opt => (
                     <button
                       key={opt}
                       onClick={() => isActivityCompleted && handleOutcomeChange(opt)}
                       disabled={outcomeMutation.isPending || !isActivityCompleted}
                       title={!isActivityCompleted ? 'Activity must be completed first' : undefined}
                       className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all ${
                         localOutcome === opt
                           ? opt === 'WON' ? 'bg-green-500 text-white border-green-500 shadow-green-500/25 shadow-lg'
                           : opt === 'LOST' ? 'bg-red-500 text-white border-red-500 shadow-red-500/25 shadow-lg'
                           : 'bg-gray-4 text-gray-12 border-gray-5'
                           : 'bg-gray-2 text-gray-9 border-gray-4'
                       } disabled:opacity-40 disabled:cursor-not-allowed`}
                     >
                       {opt === '' ? 'Pending' : opt === 'WON' ? 'WON' : 'LOST'}
                     </button>
                   ))}
                 </div>
               </div>
             );
           })()}

        </div>
      </div>
    </>
  )
}
