import { Calendar as CalendarIcon, Save, Send, Loader2, Trash2, X, HelpCircle, CheckCircle2 } from "lucide-react";
import { getStartOfWeek, formatDateToYMD } from "../utils";

export function ScheduleHeader({
  isLocked,
  plan,
  includeSaturday,
  setIncludeSaturday,
  includeSunday,
  setIncludeSunday,
  activeTab,
  setActiveTab,
  weekStartDate,
  setWeekStartDate,
  deletePlanMutation,
  submitMutation,
  saveMutation,
  allDaysFilled,
  isRequestingAmendment,
  setIsRequestingAmendment,
  amendmentReason,
  setAmendmentReason,
  requestAmendmentMutation,
  compactMode,
  setCompactMode,
  weekSummary,
  dayProgress,
  unplannedRatio,
}) {
  const totalDaysRequired = 5 + (includeSaturday ? 1 : 0) + (includeSunday ? 1 : 0);
  const readinessPercent = Math.min(100, Math.round((weekSummary.daysReady / totalDaysRequired) * 100));

  return (
    <div className="space-y-4 border-b border-gray-4 pb-4 mt-2">
      {/* TITLE & ACTIONS ROW */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-12">Weekly Coverage Plan</h1>
          <p className="text-gray-9 mt-1 font-medium">Plan your tasks and sales calls for the upcoming week.</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border uppercase tracking-widest flex items-center ${
            plan.status === 'APPROVED' || plan.status === 'SUBMITTED' ? 'bg-green-500/10 text-green-700 border-green-500/20' :
            plan.status === 'REVISION' ? 'bg-blue-500/10 text-blue-700 border-blue-500/20' :
            plan.status === 'LOCKED' ? 'bg-amber-500/10 text-amber-700 border-amber-500/20' :
            'bg-gray-3 text-gray-10 border-gray-4'
          }`}>
            Status: {plan.status}
          </span>

          {!isLocked || plan.status === 'REVISION' ? (
            <>
              {plan?.id && (
                <button
                  onClick={() => {
                    const msg = plan.status === 'REVISION' 
                      ? "Discard all current changes and revert to previously approved state?" 
                      : "Are you sure you want to completely delete this Draft plan?";
                    if (window.confirm(msg)) deletePlanMutation.mutate();
                  }}
                  disabled={deletePlanMutation.isPending || submitMutation.isPending || saveMutation.isPending}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                  title={plan.status === 'REVISION' ? 'Discard Amendment' : 'Delete Draft'}
                >
                  {deletePlanMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : plan.status === 'REVISION' ? <X size={16} /> : <Trash2 size={16} />}
                </button>
              )}
              
              <button 
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || deletePlanMutation.isPending || submitMutation.isPending}
                className="px-4 py-2 bg-gray-2 hover:bg-gray-3 border border-gray-4 text-gray-12 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                Save Draft
              </button>

              <div className="relative group flex items-center bg-gray-1 border border-gray-3 p-1 rounded-xl shadow-sm">
                <button 
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending || saveMutation.isPending || !allDaysFilled}
                  className={`px-5 py-1.5 ${allDaysFilled ? "bg-primary hover:bg-primary/90 text-white shadow shadow-primary/20 cursor-pointer" : "bg-gray-4 text-gray-8 cursor-not-allowed"} rounded-lg font-bold flex items-center gap-2 transition-all`}
                >
                  {submitMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 
                  {plan.status === 'REVISION' ? 'Submit Amendments' : 'Submit Plan'}
                </button>
                <div 
                  className="px-2 text-gray-6 hover:text-gray-9 cursor-help transition-colors" 
                  title="Remember to submit your schedule! Note: Mon-Sat require at least 1 task each to unlock submission. Sunday is optional."
                >
                  <HelpCircle size={16} />
                </div>
              </div>
            </>
          ) : (
            /* LOCKED ACTIONS */
            !isRequestingAmendment ? (
              <button 
                onClick={() => setIsRequestingAmendment(true)} 
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold flex items-center gap-2 transition-all shadow shadow-amber-500/20"
              >
                Request Amendment
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-amber-500/5 p-1 rounded-xl border border-amber-500/20">
                <input 
                  autoFocus
                  type="text" 
                  value={amendmentReason} 
                  onChange={(e) => setAmendmentReason(e.target.value)} 
                  placeholder="Reason for amendment..." 
                  className="text-sm px-3 py-1.5 rounded-lg border border-amber-500/30 outline-none w-[220px] bg-white" 
                />
                <button 
                  onClick={() => requestAmendmentMutation.mutate()} 
                  disabled={!amendmentReason.trim() || requestAmendmentMutation.isPending} 
                  className="px-3 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-lg disabled:opacity-50"
                >
                  {requestAmendmentMutation.isPending ? "Submitting..." : "Submit"}
                </button>
                <button 
                  onClick={() => setIsRequestingAmendment(false)} 
                  className="px-3 py-1.5 text-xs font-bold text-gray-8 hover:text-gray-12 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* UTILITY & METRICS ROW */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Date Picker */}
          <div className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 flex items-center shadow-sm">
            <CalendarIcon size={16} className="text-gray-8 mr-2" />
            <input
              type="date"
              value={weekStartDate}
              onChange={(e) => {
                const pickedDate = new Date(e.target.value);
                const startOfWeek = getStartOfWeek(e.target.value);
                setWeekStartDate(formatDateToYMD(startOfWeek));
                const dayIndex = pickedDate.getDay() - 1; // Mon=0, Fri=4, Sat=5
                if (dayIndex >= 0 && dayIndex <= 5) {
                  setActiveTab(dayIndex);
                } else if (pickedDate.getDay() === 0) {
                  setActiveTab((includeSunday || includeSaturday) ? 6 : 0);
                }
              }}
              className="bg-transparent text-gray-12 text-sm font-bold outline-none cursor-pointer"
            />
          </div>

          {/* Toggles */}
          {!isLocked && (
            <div className="flex items-center gap-4 bg-gray-1 border border-gray-3 rounded-lg px-3 py-2 shadow-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${compactMode ? 'bg-primary' : 'bg-gray-5'}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${compactMode ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
                </div>
                <span className="text-xs font-bold text-gray-10 select-none">Compact Mode</span>
                <input type="checkbox" className="sr-only" checked={compactMode} onChange={() => setCompactMode(!compactMode)} />
              </label>

              <div className="w-[1px] h-4 bg-gray-3" />

              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${includeSaturday ? 'bg-primary' : 'bg-gray-5'}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${includeSaturday ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
                </div>
                <span className="text-xs font-bold text-gray-10 select-none">Include Weekends</span>
                <input type="checkbox" className="sr-only" checked={includeSaturday} onChange={(e) => {
                  const checked = e.target.checked;
                  setIncludeSaturday(checked);
                  if (checked) {
                    setIncludeSunday(true);
                  } else {
                    setIncludeSunday(false);
                    if (activeTab >= 5) setActiveTab(4);
                  }
                }} />
              </label>
            </div>
          )}
        </div>

        {/* Readiness Metrics */}
        <div className="flex items-center gap-3">
          <span 
            className="text-sm font-bold text-gray-10 flex items-center gap-1.5 cursor-help select-none" 
            title={`Missing Days: ${weekSummary.missingDays} | Unplanned Ratio: ${unplannedRatio}%`}
          >
            <CheckCircle2 size={18} className={weekSummary.daysReady >= totalDaysRequired ? "text-green-500" : "text-gray-5"} />
            Readiness: <span className="text-gray-12">{weekSummary.daysReady} of {totalDaysRequired} Days</span>
          </span>
          <div className="w-[100px] h-2 bg-gray-3 rounded-full overflow-hidden shadow-inner">
            <div 
              className={`h-full transition-all duration-500 ease-out ${readinessPercent === 100 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-primary'}`} 
              style={{ width: `${readinessPercent}%` }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
