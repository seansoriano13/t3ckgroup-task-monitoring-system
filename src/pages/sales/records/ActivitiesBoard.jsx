import { useState, useMemo } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Clock } from "lucide-react";
import { AlertCircle, Users } from "lucide-react";

/**
 * Board / Kanban view for Activities — groups by employee then by date.
 */
export default function ActivitiesBoard({
  boardData,
  timeframe,
  onActivityClick,
  appSettings,
}) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {boardData.length === 0 ? (
        <div className="p-10 text-center text-gray-9 font-bold bg-gray-1 rounded-2xl border border-gray-4">
          <AlertCircle className="mx-auto mb-2 text-gray-8" />
          No activities match the filters.
        </div>
      ) : (
        boardData.map((empGroup) => (
          <div
            key={empGroup.employeeName}
            className="bg-gray-1 border border-gray-4 rounded-2xl p-4 sm:p-6 shadow-sm"
          >
            <h2 className="text-xl font-black text-gray-12 mb-4 border-b border-gray-4 pb-2 flex items-center gap-2">
              <Users size={20} /> {empGroup.employeeName}
            </h2>
            <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 custom-scrollbar snap-x items-start">
              {empGroup.dates.map((dateBlock) => {
                if (timeframe !== "DAILY") {
                  return (
                    <ExpandableSummaryCard
                      key={dateBlock.dateStr}
                      dateBlock={dateBlock}
                      appSettings={appSettings}
                      label={
                        timeframe === "MONTHLY"
                          ? new Date(dateBlock.dateStr + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })
                          : dateBlock.dateStr
                      }
                      onActivityClick={onActivityClick}
                    />
                  );
                }

                return (
                  <DailyColumn
                    key={dateBlock.dateStr}
                    dateBlock={dateBlock}
                    timeframe={timeframe}
                    onActivityClick={onActivityClick}
                    appSettings={appSettings}
                  />
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Daily column card
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function DailyColumn({ dateBlock, timeframe, onActivityClick, appSettings }) {
  return (
    <div className="min-w-[280px] sm:min-w-[320px] w-[280px] sm:w-[320px] shrink-0 bg-gray-2 rounded-xl border border-gray-4 p-4 flex flex-col snap-start">
      <h3
        className="font-bold text-gray-12 mb-3 bg-gray-3 px-3 py-1.5 rounded-lg text-center font-mono text-sm tracking-wide truncate"
        title={dateBlock.dateStr}
      >
        {timeframe === "WEEKLY"
          ? dateBlock.dateStr
          : `${new Date(dateBlock.dateStr).toLocaleDateString("en-US", { weekday: "long" })} - ${dateBlock.dateStr}`}
      </h3>

      <div className="space-y-4 flex-1 flex flex-col">
        <TimeBlock
          label="AM Block"
          activities={dateBlock.AM}
          onActivityClick={onActivityClick}
          appSettings={appSettings}
        />
        <TimeBlock
          label="PM Block"
          activities={dateBlock.PM}
          onActivityClick={onActivityClick}
          appSettings={appSettings}
        />
      </div>
    </div>
  );
}

function TimeBlock({ label, activities, onActivityClick, appSettings }) {
  return (
    <div className="flex-1 bg-white dark:bg-gray-3 rounded-lg border border-gray-4 p-3 h-full">
      <h4 className="flex items-center gap-2 text-[10px] font-black text-gray-10 uppercase tracking-widest mb-2 border-b border-gray-4 pb-1">
        {label}
      </h4>
      <div className="space-y-2">
        {activities.length === 0 && (
          <p className="text-xs text-gray-8 italic text-center py-2">
            No {label} Tasks
          </p>
        )}
        {activities.map((act) => (
          <BoardActivityCard
            key={act.id}
            act={act}
            onClick={() => onActivityClick(act)}
            appSettings={appSettings}
          />
        ))}
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Expandable summary card (weekly / monthly / yearly)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function ExpandableSummaryCard({ dateBlock, label, onActivityClick, appSettings }) {
  const [expanded, setExpanded] = useState(false);
  const total = dateBlock.all.length;
  const done = dateBlock.all.filter(
    (a) => a.status === "DONE" || a.status === "APPROVED",
  ).length;
  const pending = dateBlock.all.filter(
    (a) => a.status === "PENDING_APPROVAL" || a.status === "PENDING",
  ).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const pctColor =
    pct >= 80
      ? "text-green-600 bg-green-500/10 border-green-500/20"
      : pct >= 50
        ? "text-yellow-600 bg-yellow-500/10 border-yellow-500/20"
        : "text-red-600 bg-red-500/10 border-red-500/20";

  const activitiesByDate = useMemo(() => {
    return dateBlock.all.reduce((acc, act) => {
      const d = act.scheduled_date;
      if (!acc[d]) acc[d] = { AM: [], PM: [] };
      if (act.time_of_day === "AM") acc[d].AM.push(act);
      else acc[d].PM.push(act);
      return acc;
    }, {});
  }, [dateBlock]);

  const datesSorted = Object.keys(activitiesByDate).sort();

  return (
    <div className="min-w-[300px] shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm snap-start flex flex-col overflow-hidden transition-all">
      {/* Summary header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate">
            {label}
          </p>
          <p className="text-2xl font-black text-gray-800 leading-tight">
            {total}
            <span className="text-xs font-semibold text-gray-400 ml-1.5">activities</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pending > 0 && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              {pending} pending
            </span>
          )}
          <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${pctColor}`}>
            {pct}%
          </span>
          <span className={`text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </div>
      </button>

      {/* Completion bar */}
      <div className="h-1 bg-gray-100 mx-4 rounded-full mb-1">
        <div
          className={`h-1 rounded-full transition-all duration-500 ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Expandable body */}
      {expanded && (
        <div className="bg-gray-50 border-t border-gray-100 p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {datesSorted.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-2">No activities</p>
          ) : (
            datesSorted.map((d) => (
              <div key={d} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                <h4 className="text-xs font-bold text-gray-800 mb-3 border-b border-gray-100 pb-1 flex justify-between items-center">
                  {new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  <span className="text-[10px] text-gray-500 font-normal bg-gray-100 px-1.5 py-0.5 rounded text-center">
                    {activitiesByDate[d].AM.length + activitiesByDate[d].PM.length} tasks
                  </span>
                </h4>
                <div className="space-y-3">
                  {activitiesByDate[d].AM.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Clock size={10} /> AM Block
                      </p>
                      <div className="space-y-1.5">
                        {activitiesByDate[d].AM.map((act) => (
                          <BoardActivityCard key={act.id} act={act} onClick={() => onActivityClick(act)} appSettings={appSettings} />
                        ))}
                      </div>
                    </div>
                  )}
                  {activitiesByDate[d].PM.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 mt-2">
                        <Clock size={10} /> PM Block
                      </p>
                      <div className="space-y-1.5">
                        {activitiesByDate[d].PM.map((act) => (
                          <BoardActivityCard key={act.id} act={act} onClick={() => onActivityClick(act)} appSettings={appSettings} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Individual activity card used on the board
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function BoardActivityCard({ act, onClick, appSettings }) {
  const isDone = act.status === "DONE" || act.status === "APPROVED";
  const isLost = act.sales_outcome === "LOST";
  const isWon = act.sales_outcome === "COMPLETED";
  return (
    <div
      onClick={onClick}
      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm
        ${isLost
          ? "bg-red-500/5 border-red-500/30"
          : isWon
            ? "bg-green-500/10 border-green-500/20"
            : isDone
              ? "bg-gray-2 border-gray-4"
              : "bg-gray-1 border-gray-3 hover:border-gray-5"
        }
        ${act.is_unplanned && "bg-gray-a2! border-0"}
      `}
    >
      <p
        className={`text-[13px] font-bold truncate ${isDone ? "text-gray-9 line-through" : "text-gray-12"}`}
        title={act.account_name}
      >
        {act.account_name || <span className="text-gray-8 italic">No Account</span>}
      </p>
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1 overflow-hidden">
          <span className="text-[9px] uppercase font-bold text-gray-10 truncate max-w-[80px]">
            {act.activity_type}
          </span>
          <CardPlanBadge act={act} isDone={isDone} appSettings={appSettings} />
        </div>
        {isDone ? (
          <CheckCircle2 size={12} className="text-green-500 shrink-0" />
        ) : (
          <Circle size={12} className="text-gray-7 shrink-0" />
        )}
      </div>
      {/* Metadata badges */}
      {(act.reference_number || act.expense_amount || act.sales_outcome) && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {act.reference_number && (
            <span className="text-[8px] font-black text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20 truncate max-w-[80px]">
              {act.reference_number}
            </span>
          )}
          {act.expense_amount && (
            <span className="text-[8px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
              ₱{Number(act.expense_amount).toLocaleString()}
            </span>
          )}
          {isWon && (
            <span className="text-[8px] font-black text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full border border-green-500/20">WON</span>
          )}
          {isLost && (
            <span className="text-[8px] font-black text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20">LOST</span>
          )}
        </div>
      )}
    </div>
  );
}

function CardPlanBadge({ act, isDone, appSettings }) {
  const planStatus = act.sales_weekly_plans?.status;
  const isUnplanned = act.is_unplanned || !planStatus;

  if (isUnplanned) {
    return (
      <span className="shrink-0 text-[8px] bg-blue-500/10 text-blue-600 px-1 py-0.5 rounded uppercase tracking-widest font-black">
        UNPLANNED
      </span>
    );
  }

  const shouldShow = !isDone || (act.expense_amount > 0 && !appSettings?.sales_self_approve_expenses);
  if (!shouldShow) return null;

  const config = {
    DRAFT: { bg: "bg-yellow-500/10 text-yellow-600", label: "DRAFT" },
    SUBMITTED: { bg: "bg-green-500/10 text-green-600", label: "SUBMITTED" },
    APPROVED: { bg: "bg-green-500/10 text-green-600", label: "APPROVED" },
  };

  const c = config[planStatus];
  if (!c) return null;

  return (
    <span className={`shrink-0 text-[8px] ${c.bg} px-1 py-0.5 rounded uppercase tracking-widest font-black`}>
      {c.label}
    </span>
  );
}
