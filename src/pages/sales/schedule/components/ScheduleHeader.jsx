import { Calendar as CalendarIcon, Save, Send, Loader2, Trash2, X } from "lucide-react";
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
}) {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-4 pb-4">
        <div>
          <h1 className="text-3xl font-black text-gray-12">
            Weekly Coverage Plan
          </h1>
          <p className="text-gray-9 mt-1 font-medium">
            Plan your tasks and sales calls for the upcoming week.
          </p>
        </div>
        <div className="flex gap-4 items-center flex-wrap">
          {!isLocked && (
            <div className="flex gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-10 hover:text-gray-12 bg-gray-2 px-3 py-2 rounded-lg border border-gray-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={includeSaturday}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIncludeSaturday(checked);
                    if (!checked) {
                      setIncludeSunday(false);
                      // Clamp activeTab if we are on Sat/Sun
                      if (activeTab >= 5) {
                        setActiveTab(4); // Back to Friday
                      }
                    }
                  }}
                  className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <span>Saturday</span>
              </label>
              <label
                className={`flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-10 hover:text-gray-12 bg-gray-2 px-3 py-2 rounded-lg border border-gray-4 whitespace-nowrap transition-opacity ${!includeSaturday ? "opacity-40 pointer-events-none" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={includeSunday}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIncludeSunday(checked);
                    if (!checked && activeTab === 6) {
                      setActiveTab(5); // Back to Saturday
                    }
                  }}
                  disabled={!includeSaturday}
                  className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <span>Sunday</span>
              </label>
            </div>
          )}
          <div className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 flex items-center shadow-inner">
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
                  setActiveTab(includeSunday ? 6 : 0);
                }
              }}
              className="bg-transparent text-gray-12 font-bold outline-none cursor-pointer"
            />
            <span className="ml-3 text-xs font-bold px-2 py-1 rounded bg-gray-3 border border-gray-4">
              Status: {plan.status}
            </span>
          </div>
        </div>
      </div>

      {!isLocked && (
        <div className="bg-blue-900/10 border border-blue-900/30 p-4 rounded-xl flex items-center justify-between">
          <p className="text-sm font-bold text-blue-500">
            Remember to submit your schedule by Friday End of Day for the
            following week!
          </p>
          <div className="flex gap-3">
            {plan?.id && (
              <button
                onClick={() => {
                  const confirmMsg = plan.status === 'REVISION'
                    ? "Are you sure you want to discard your amendment? All current changes will be lost and the plan will revert to its previously approved state."
                    : "Are you sure you want to completely delete this Draft plan and all its activities?";
                  if (window.confirm(confirmMsg)) {
                    deletePlanMutation.mutate();
                  }
                }}
                disabled={
                  deletePlanMutation.isPending ||
                  submitMutation.isPending ||
                  saveMutation.isPending
                }
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 rounded-lg font-bold flex items-center gap-2 transition-colors"
              >
                {deletePlanMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : plan.status === 'REVISION' ? (
                  <X size={16} />
                ) : (
                  <Trash2 size={16} />
                )}{" "}
                {plan.status === 'REVISION' ? 'Discard Amendment' : 'Delete Draft'}
              </button>
            )}
            <button
              onClick={() => saveMutation.mutate()}
              disabled={
                saveMutation.isPending ||
                deletePlanMutation.isPending ||
                submitMutation.isPending
              }
              className="px-4 py-2 bg-gray-2 hover:bg-gray-3 border border-gray-4 text-gray-12 rounded-lg font-bold flex items-center gap-2 transition-colors"
            >
              {saveMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}{" "}
              Save Draft
            </button>
            <button
              onClick={() => submitMutation.mutate()}
              disabled={
                saveMutation.isPending ||
                submitMutation.isPending ||
                !allDaysFilled
              }
              title={
                !allDaysFilled
                  ? "Please plan at least 5 AM tasks and 5 PM tasks for ALL days of the week to unlock submission."
                  : ""
              }
              className={`px-4 py-2 ${allDaysFilled ? "bg-green-600 hover:bg-green-700 shadow-green-900/20 shadow-lg cursor-pointer" : "bg-green-900/50 text-white/50 cursor-not-allowed"} text-white rounded-lg font-bold flex items-center gap-2 transition-colors`}
            >
              <Send size={16} /> Submit Plan
            </button>
          </div>
        </div>
      )}

      {isLocked && plan.status !== "REVISION" && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-amber-600 font-black flex items-center gap-2">
              Plan is Locked
            </h3>
            <p className="text-sm font-bold text-amber-600/80 mt-1">
              This plan has already been submitted or approved. To make
              changes, you must request an amendment.
            </p>
          </div>
          <div>
            {!isRequestingAmendment ? (
              <button
                onClick={() => setIsRequestingAmendment(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 shadow shadow-amber-500/20 text-white rounded-lg font-bold flex items-center gap-2 transition-all"
              >
                Request Amendment
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  autoFocus
                  type="text"
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                  placeholder="Reason for amendment..."
                  className="text-sm p-2 rounded border border-amber-500/30 outline-none w-[250px] bg-white dark:bg-gray-3 text-gray-12"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setIsRequestingAmendment(false)}
                    className="text-xs font-bold text-gray-8 hover:text-gray-11"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => requestAmendmentMutation.mutate()}
                    disabled={
                      !amendmentReason.trim() ||
                      requestAmendmentMutation.isPending
                    }
                    className="px-3 py-1.5 text-xs font-bold bg-amber-500 text-white rounded disabled:opacity-50"
                  >
                    {requestAmendmentMutation.isPending
                      ? "Submitting..."
                      : "Submit Request"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {plan.status === "REVISION" && (
        <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-blue-500 flex items-center gap-2">
              Revision Mode Active
            </p>
            <p className="text-xs text-blue-600 mt-1">
              You can now edit your plan. Click "Submit Amendments" when
              finished.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || submitMutation.isPending}
              className="px-4 py-2 bg-gray-2 hover:bg-gray-3 border border-gray-4 text-gray-12 rounded-lg font-bold transition-colors"
            >
              Save Draft
            </button>
            <button
              onClick={() => submitMutation.mutate()}
              disabled={
                saveMutation.isPending ||
                submitMutation.isPending ||
                !allDaysFilled
              }
              title={
                !allDaysFilled
                  ? "Please plan at least 5 AM tasks and 5 PM tasks for ALL days of the week to unlock submission."
                  : ""
              }
              className={`px-4 py-2 ${allDaysFilled ? "bg-blue-600 hover:bg-blue-700 shadow-blue-900/20 shadow-lg cursor-pointer" : "bg-blue-900/50 text-white/50 cursor-not-allowed"} text-white rounded-lg font-bold flex items-center gap-2 transition-colors`}
            >
              <Send size={16} /> Submit Amendments
            </button>
          </div>
        </div>
      )}
    </>
  );
}
