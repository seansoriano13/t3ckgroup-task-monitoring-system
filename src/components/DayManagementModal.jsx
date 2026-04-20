import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../services/salesService";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  X,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

export default function DayManagementModal({
  isOpen,
  onClose,
  weekDates,
  weeklyActivities,
}) {
  const simulatedActivities = useMemo(() => {
    return weeklyActivities;
  }, [weeklyActivities]);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDates, setSelectedDates] = useState([]);
  const [wipeReason, setWipeReason] = useState("");
  const [isConfirmingWipe, setIsConfirmingWipe] = useState(false);

  // Group activities by date for easier rendering
  const dayStats = useMemo(() => {
    const stats = {};
    weekDates.forEach((wd) => {
      const activities = simulatedActivities.filter(
        (a) => a.scheduled_date === wd.dateStr && !a.is_deleted
      );
      const isRequested = activities.some((a) => a.delete_requested_by);
      
      stats[wd.dateStr] = {
        label: wd.label,
        count: activities.length,
        activities: activities, // Pass the activities themselves for preview
        isRequested,
        hasActivities: activities.length > 0,
      };
    });
    return stats;
  }, [weekDates, simulatedActivities]);

  const requestWipeMutation = useMutation({
    mutationFn: () =>
      salesService.requestDayDeletion(user.id, selectedDates, wipeReason, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyActivities"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyPlanLoc"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyPlan"] });
      toast.success(
        selectedDates.length > 1
          ? `Deletion requested for ${selectedDates.length} days.`
          : "Deletion requested for the selected day."
      );
      setSelectedDates([]);
      setWipeReason("");
      setIsConfirmingWipe(false);
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleDateSelection = (dateStr) => {
    if (dayStats[dateStr].isRequested) return; // Can't re-request

    setSelectedDates((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  const handleSelectAll = () => {
    const allEligible = Object.entries(dayStats)
      .filter(([_, stats]) => stats.hasActivities && !stats.isRequested)
      .map(([date, _]) => date);
    
    if (selectedDates.length === allEligible.length) {
      setSelectedDates([]);
    } else {
      setSelectedDates(allEligible);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-[2rem] shadow-2xl shadow-indigo-500/10 overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Trash2 size={22} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground tracking-tight">Manage Schedule</h2>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Wipe activities per day</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center text-slate-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-8">
          {!isConfirmingWipe ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Days to Wipe</span>
                <button 
                  onClick={handleSelectAll}
                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                >
                  {selectedDates.length > 0 ? "Deselect All" : "Select All Available"}
                </button>
              </div>

              <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {weekDates.map((wd) => {
                  const stats = dayStats[wd.dateStr];
                  const isSelected = selectedDates.includes(wd.dateStr);
                  const canSelect = stats.hasActivities && !stats.isRequested;

                  return (
                    <div 
                      key={wd.dateStr}
                      onClick={() => canSelect && toggleDateSelection(wd.dateStr)}
                      className={`group flex flex-col p-4 rounded-2xl border transition-all ${
                        isSelected 
                          ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/10 shadow-sm"
                          : stats.isRequested
                            ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                            : canSelect
                              ? "bg-card border-border hover:border-indigo-200 hover:bg-muted/30 cursor-pointer"
                              : "bg-muted/10 border-border opacity-40 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                          <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
                            isSelected 
                              ? "bg-indigo-600 border-indigo-600 text-white" 
                              : "bg-white border-border group-hover:border-indigo-300"
                          }`}>
                            {isSelected && <CheckCircle2 size={14} strokeWidth={3} />}
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? "text-indigo-600" : "text-slate-400"}`}>
                              {wd.label}
                            </span>
                            <span className="text-base font-black text-foreground">
                              {wd.dateStr}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {stats.isRequested && (
                            <span className="px-3 py-1 bg-amber-500/10 text-amber-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-500/20 flex items-center gap-1.5">
                              <Clock size={12} /> Pending Request
                            </span>
                          )}
                          {stats.hasActivities ? (
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                              isSelected 
                                ? "bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm font-black" 
                                : "bg-muted text-slate-500 border-border"
                            }`}>
                              {stats.count} Activities
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-muted/50 text-slate-300 text-[9px] font-black uppercase tracking-widest rounded-full border border-border/50">
                              No Logs
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Activity Chips Preview (Only when selected or heavy day) */}
                      {isSelected && stats.hasActivities && (
                        <div className="mt-4 pt-3 border-t border-indigo-200/50 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                          {stats.activities.map((a, idx) => (
                            <div 
                              key={idx} 
                              className="px-2 py-0.5 bg-white border border-indigo-100 rounded-md text-[9px] font-bold text-indigo-600 flex items-center gap-1 max-w-[120px] truncate"
                              title={a.account_name}
                            >
                              <div className={`w-1 h-1 rounded-full ${a.activity_type === 'SALES CALL' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                              <span className="truncate">{a.account_name || "Untitled"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-6 border-t border-border flex justify-end gap-3">
                <button 
                  onClick={onClose}
                  className="px-6 h-12 rounded-2xl text-sm font-black text-slate-500 uppercase tracking-widest hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={selectedDates.length === 0}
                  onClick={() => setIsConfirmingWipe(true)}
                  className="px-8 h-12 rounded-2xl bg-destructive text-white text-sm font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-700 disabled:opacity-30 transition-all flex items-center gap-2"
                >
                  Continue Request ({selectedDates.length})
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
               <div className="p-6 rounded-3xl bg-destructive/5 border border-destructive/10">
                  <div className="flex items-center gap-3 text-destructive mb-3">
                    <ShieldAlert size={20} />
                    <span className="text-sm font-black uppercase tracking-tighter">Destructive Action Confirmation</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    You are requesting to <span className="font-bold text-destructive underline underline-offset-4">permanently wipe</span> all activities for <strong>{selectedDates.length} selected day(s)</strong>. This requires Management approval before being finalized.
                  </p>
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    What is the reason for this wipe?
                  </label>
                  <textarea 
                    autoFocus
                    value={wipeReason}
                    onChange={(e) => setWipeReason(e.target.value)}
                    placeholder="Provide a valid internal reason for management audit..."
                    className="w-full bg-muted/30 border border-border rounded-2xl p-5 text-foreground placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium h-32 resize-none"
                  />
               </div>

               <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => setIsConfirmingWipe(false)}
                    className="flex-1 h-12 rounded-2xl bg-muted text-slate-500 text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={14} /> Go Back & Edit
                  </button>
                  <button 
                    disabled={!wipeReason.trim() || requestWipeMutation.isPending}
                    onClick={() => requestWipeMutation.mutate()}
                    className="flex-[2] h-14 rounded-2xl bg-destructive text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20 hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {requestWipeMutation.isPending ? "Submitting..." : "Send Request to Management"}
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
