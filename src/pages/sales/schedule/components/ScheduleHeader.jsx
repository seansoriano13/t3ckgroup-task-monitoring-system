import { Calendar as CalendarIcon, Save, Send, Loader2, Trash2, X, HelpCircle, CheckCircle2 } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getStartOfWeek, formatDateToYMD } from "../utils";
import { confirmDeleteToast } from "../../../../components/ui/CustomToast";

import PageHeader from "../../../../components/ui/PageHeader";

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
      <PageHeader
        title="Weekly Coverage Plan"
        description="Plan your tasks and sales calls for the upcoming week."
      >
        <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl border uppercase tracking-[0.2em] flex items-center shadow-sm ${
          plan.status === 'APPROVED' || plan.status === 'SUBMITTED' ? 'bg-green-2 text-green-11 border-green-6' :
          plan.status === 'REVISION' ? 'bg-[color:var(--violet-2)] text-[color:var(--violet-11)] border-mauve-5' :
          plan.status === 'LOCKED' ? 'bg-[color:var(--amber-2)] text-[color:var(--amber-11)] border-[color:var(--amber-6)]' :
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
                  const title = plan.status === 'REVISION' ? "Discard Amendment?" : "Delete Draft Plan?";
                  confirmDeleteToast(title, msg, () => deletePlanMutation.mutate());
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
                className={`px-5 py-1.5 ${allDaysFilled ? "bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer" : "bg-muted text-muted-foreground cursor-not-allowed"} rounded-lg font-bold flex items-center gap-2 transition-all h-8`}
              >
                {submitMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 
                {plan.status === 'REVISION' ? 'Submit Amendments' : 'Submit Plan'}
              </button>
              <div 
                className="px-2 text-muted-foreground hover:text-muted-foreground cursor-help transition-colors" 
                title="Remember to submit your schedule by Friday End of Day for the following week! Note: Mon-Sat require at least 1 activity each to unlock submission. Sunday is optional."
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
              className="px-4 py-2 bg-warning hover:bg-[color:var(--amber-10)] text-primary-foreground rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-[color:var(--amber-5)] h-10"
            >
              Request Amendment
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-[color:var(--amber-2)] p-1.5 rounded-xl border border-[color:var(--amber-6)] shadow-sm">
              <input 
                autoFocus
                type="text" 
                value={amendmentReason} 
                onChange={(e) => setAmendmentReason(e.target.value)} 
                placeholder="Reason for amendment..." 
                className="text-sm px-3 py-2 rounded-lg border border-[color:var(--amber-6)] outline-none w-[220px] bg-card focus:border-[color:var(--amber-8)] transition-colors font-medium" 
              />
              <button 
                onClick={() => requestAmendmentMutation.mutate()} 
                disabled={!amendmentReason.trim() || requestAmendmentMutation.isPending} 
                className="px-3 py-1.5 text-xs font-bold bg-warning hover:bg-[color:var(--amber-10)] text-primary-foreground rounded-lg disabled:opacity-50 transition-colors"
              >
                {requestAmendmentMutation.isPending ? "Submitting..." : "Submit"}
              </button>
              <button 
                onClick={() => setIsRequestingAmendment(false)} 
                className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          )
        )}
      </PageHeader>

      {/* Missing Activities Alert for Approved Plans */}
      {plan.status === "APPROVED" && (weekSummary.missingDays > 0) && (
        <div className="bg-[color:var(--amber-2)] border border-[color:var(--amber-6)] rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-3">
            <div className="bg-[color:var(--amber-3)] p-2 rounded-xl">
              <AlertTriangle size={20} className="text-[color:var(--amber-10)]" />
            </div>
            <div>
              <p className="text-sm font-black text-[color:var(--amber-12)] uppercase tracking-tight">Schedule Incomplete</p>
              <p className="text-xs font-bold text-[color:var(--amber-11)]/80">Your plan is approved but has gaps due to wiped activities. Request an amendment to refill your schedule.</p>
            </div>
          </div>
          {!isRequestingAmendment && (
            <button 
              onClick={() => setIsRequestingAmendment(true)}
              className="px-4 py-2 bg-warning hover:bg-[color:var(--amber-10)] text-primary-foreground rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95"
            >
              Start Amendment
            </button>
          )}
        </div>
      )}

      {/* UTILITY & METRICS ROW */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Date Picker */}
          <div className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm hover:border-indigo-300 transition-colors">
            <CalendarIcon size={16} className="text-[color:var(--violet-9)]" />
            <DatePicker
              selected={weekStartDate ? new Date(weekStartDate) : null}
              onChange={(date) => {
                if (!date) return;
                const dStr = formatDateToYMD(date);
                const startOfWeek = getStartOfWeek(dStr);
                setWeekStartDate(formatDateToYMD(startOfWeek));
                const dayIndex = date.getDay() - 1;
                if (dayIndex >= 0 && dayIndex <= 5) {
                  setActiveTab(dayIndex);
                } else if (date.getDay() === 0) {
                  setActiveTab((includeSunday || includeSaturday) ? 6 : 0);
                }
              }}
              portalId="root"
              className="bg-transparent text-foreground text-sm font-bold outline-none cursor-pointer w-[120px]"
              dateFormat="MMM d, yyyy"
            />
          </div>

          {/* Toggles */}
          {!isLocked && (
            <div className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-2.5 shadow-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${compactMode ? 'bg-primary' : 'bg-mauve-5'}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-card shadow transition-transform ${compactMode ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
                </div>
                <span className="text-xs font-bold text-muted-foreground select-none">Compact</span>
                <input type="checkbox" className="sr-only" checked={compactMode} onChange={() => setCompactMode(!compactMode)} />
              </label>

              <div className="w-px h-4 bg-border" />

              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${includeSaturday ? 'bg-primary' : 'bg-mauve-5'}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-card shadow transition-transform ${includeSaturday ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
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
            className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 cursor-help select-none" 
            title={`Missing Days: ${weekSummary.missingDays} | Unplanned Ratio: ${unplannedRatio}%`}
          >
            <CheckCircle2 size={16} className={weekSummary.daysReady >= totalDaysRequired ? "text-green-9" : "text-muted-foreground"} />
            Readiness: <span className="text-foreground font-black">{weekSummary.daysReady}/{totalDaysRequired}</span>
          </span>
          <div className="w-[120px] h-2.5 bg-muted rounded-full overflow-hidden shadow-inner border border-border/30">
            <div 
              className={`h-full transition-all duration-700 ease-out ${readinessPercent === 100 ? 'bg-green-9 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-primary'}`} 
              style={{ width: `${readinessPercent}%` }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
