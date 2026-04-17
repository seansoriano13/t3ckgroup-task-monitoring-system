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
    <div className="space-y-5 border-b border-border pb-6 mt-2">
      {/* TITLE & ACTIONS ROW */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Weekly Coverage Plan</h1>
          <p className="text-muted-foreground mt-1 font-medium text-sm">Plan your tasks and sales calls for the upcoming week.</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl border uppercase tracking-[0.2em] flex items-center shadow-sm ${
            plan.status === 'APPROVED' || plan.status === 'SUBMITTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            plan.status === 'REVISION' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
            plan.status === 'LOCKED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-muted text-muted-foreground border-border'
          }`}>
            {plan.status || 'DRAFT'}
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
                  className="p-2 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all border border-transparent hover:border-destructive/20"
                  title={plan.status === 'REVISION' ? 'Discard Amendment' : 'Delete Draft'}
                >
                  {deletePlanMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : plan.status === 'REVISION' ? <X size={16} /> : <Trash2 size={16} />}
                </button>
              )}
              
              <button 
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || deletePlanMutation.isPending || submitMutation.isPending}
                className="px-4 py-2 bg-card hover:bg-muted border border-border text-foreground rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm h-10"
              >
                {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                Save Draft
              </button>

              <div className="relative group flex items-center bg-card border border-border p-1 rounded-xl shadow-sm">
                <button 
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending || saveMutation.isPending || !allDaysFilled}
                  className={`px-5 py-1.5 ${allDaysFilled ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 cursor-pointer" : "bg-muted text-muted-foreground cursor-not-allowed"} rounded-lg font-bold flex items-center gap-2 transition-all h-8`}
                >
                  {submitMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 
                  {plan.status === 'REVISION' ? 'Submit Amendments' : 'Submit Plan'}
                </button>
                <div 
                  className="px-2 text-slate-400 hover:text-muted-foreground cursor-help transition-colors" 
                  title="Remember to submit your schedule by Friday End of Day for the following week! Note: Mon-Sat require at least 5 AM/PM tasks each to unlock submission. Sunday is optional."
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
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-amber-200 h-10"
              >
                Request Amendment
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-amber-50 p-1.5 rounded-xl border border-amber-200 shadow-sm">
                <input 
                  autoFocus
                  type="text" 
                  value={amendmentReason} 
                  onChange={(e) => setAmendmentReason(e.target.value)} 
                  placeholder="Reason for amendment..." 
                  className="text-sm px-3 py-2 rounded-lg border border-amber-200 outline-none w-[220px] bg-white focus:border-amber-400 transition-colors font-medium" 
                />
                <button 
                  onClick={() => requestAmendmentMutation.mutate()} 
                  disabled={!amendmentReason.trim() || requestAmendmentMutation.isPending} 
                  className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                >
                  {requestAmendmentMutation.isPending ? "Submitting..." : "Submit"}
                </button>
                <button 
                  onClick={() => setIsRequestingAmendment(false)} 
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-foreground transition-colors"
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
          <div className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm hover:border-indigo-300 transition-colors">
            <CalendarIcon size={16} className="text-indigo-500" />
            <input
              type="date"
              value={weekStartDate}
              onChange={(e) => {
                const pickedDate = new Date(e.target.value);
                const startOfWeek = getStartOfWeek(e.target.value);
                setWeekStartDate(formatDateToYMD(startOfWeek));
                const dayIndex = pickedDate.getDay() - 1;
                if (dayIndex >= 0 && dayIndex <= 5) {
                  setActiveTab(dayIndex);
                } else if (pickedDate.getDay() === 0) {
                  setActiveTab((includeSunday || includeSaturday) ? 6 : 0);
                }
              }}
              className="bg-transparent text-foreground text-sm font-bold outline-none cursor-pointer"
            />
          </div>

          {/* Toggles */}
          {!isLocked && (
            <div className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-2.5 shadow-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${compactMode ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${compactMode ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
                </div>
                <span className="text-xs font-bold text-muted-foreground select-none">Compact</span>
                <input type="checkbox" className="sr-only" checked={compactMode} onChange={() => setCompactMode(!compactMode)} />
              </label>

              <div className="w-px h-4 bg-border" />

              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${includeSaturday ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${includeSaturday ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
                </div>
                <span className="text-xs font-bold text-muted-foreground select-none">+ Weekends</span>
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
            className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 cursor-help select-none" 
            title={`Missing AM: ${weekSummary.missingAM} | Missing PM: ${weekSummary.missingPM} | Unplanned Ratio: ${unplannedRatio}%`}
          >
            <CheckCircle2 size={16} className={weekSummary.daysReady >= totalDaysRequired ? "text-emerald-500" : "text-slate-300"} />
            Readiness: <span className="text-foreground font-black">{weekSummary.daysReady}/{totalDaysRequired}</span>
          </span>
          <div className="w-[120px] h-2.5 bg-muted rounded-full overflow-hidden shadow-inner border border-border/30">
            <div 
              className={`h-full transition-all duration-700 ease-out ${readinessPercent === 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-indigo-500'}`} 
              style={{ width: `${readinessPercent}%` }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
