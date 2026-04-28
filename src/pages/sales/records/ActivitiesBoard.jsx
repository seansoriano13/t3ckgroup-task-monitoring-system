import { useState, useMemo } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Clock } from "lucide-react";
import { AlertCircle, Users } from "lucide-react";
import { REVENUE_STATUS } from "../../../constants/status";
import Avatar from "../../../components/Avatar";
import HighlightText from "../../../components/HighlightText";


/**
 * Board / Kanban view for Activities — groups by employee then by date.
 */
export default function ActivitiesBoard({
  boardData,
  timeframe,
  onActivityClick,
  appSettings,
  searchTerm,
}) {

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {boardData.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground font-bold bg-mauve-1 rounded-2xl border border-mauve-4">
          <AlertCircle className="mx-auto mb-2 text-mauve-8" />
          No activities match the filters.
        </div>
      ) : (
        boardData.map((empGroup) => (
          <div
            key={empGroup.employeeName}
            className="bg-mauve-1 border border-mauve-4 rounded-2xl p-4 sm:p-6 shadow-sm"
          >
            <h2 className="text-xl font-black text-foreground mb-4 border-b border-mauve-4 pb-2 flex items-center gap-2">
              <Avatar name={empGroup.employeeName} size="sm" className="bg-primary/10 text-primary border-primary/20" /> 
              <HighlightText text={empGroup.employeeName} search={searchTerm} />
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
                      searchTerm={searchTerm}
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
                    searchTerm={searchTerm}
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
function DailyColumn({ dateBlock, timeframe, onActivityClick, appSettings, searchTerm }) {

  const allActivities = [...(dateBlock.AM || []), ...(dateBlock.PM || [])];
  const total = allActivities.length;
  const done = allActivities.filter((a) => a.status === REVENUE_STATUS.APPROVED).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const pctColor =
    pct >= 80
      ? "text-green-11 bg-green-3/50 border-green-6/20"
      : pct >= 50
        ? "text-amber-11 bg-amber-3/50 border-amber-6/20"
        : "text-red-11 bg-red-3/50 border-red-6/20";

  const barColor =
    pct >= 80 ? "bg-green-9" : pct >= 50 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div className="min-w-[280px] sm:min-w-[320px] w-[280px] sm:w-[320px] shrink-0 bg-mauve-2 rounded-xl border border-mauve-4 p-4 flex flex-col snap-start">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3
          className="font-bold text-foreground bg-mauve-3 px-3 py-1.5 rounded-lg font-mono text-sm tracking-wide truncate flex-1 text-center"
          title={dateBlock.dateStr}
        >
          {timeframe === "WEEKLY"
            ? dateBlock.dateStr
            : `${new Date(dateBlock.dateStr).toLocaleDateString("en-US", { weekday: "long" })} - ${dateBlock.dateStr}`}
        </h3>
        {total > 0 && (
          <span className={`text-xs font-black px-2.5 py-1 rounded-full border shrink-0 ${pctColor}`}>
            {pct}%
          </span>
        )}
      </div>

      {/* Completion bar */}
      {total > 0 && (
        <div className="h-1 bg-mauve-3 rounded-full mb-3">
          <div
            className={`h-1 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {total === 0 && <div className="mb-3" />}

      <div className="space-y-4 flex-1 flex flex-col">
        <TimeBlock
          label="AM Block"
          activities={dateBlock.AM}
          onActivityClick={onActivityClick}
          appSettings={appSettings}
          searchTerm={searchTerm}
        />
        <TimeBlock
          label="PM Block"
          activities={dateBlock.PM}
          onActivityClick={onActivityClick}
          appSettings={appSettings}
          searchTerm={searchTerm}
        />

      </div>
    </div>
  );
}

function TimeBlock({ label, activities, onActivityClick, appSettings, searchTerm }) {

  return (
    <div className="flex-1 bg-card dark:bg-mauve-3 rounded-lg border border-mauve-4 p-3 h-full">
      <h4 className="flex items-center gap-2 text-[10px] font-black text-mauve-10 uppercase tracking-widest mb-2 border-b border-mauve-4 pb-1">
        {label}
      </h4>
      <div className="space-y-2">
        {activities.length === 0 && (
          <p className="text-xs text-mauve-8 italic text-center py-2">
            No {label} Tasks
          </p>
        )}
        {activities.map((act) => (
          <BoardActivityCard
            key={act.id}
            act={act}
            onClick={() => onActivityClick(act)}
            appSettings={appSettings}
            searchTerm={searchTerm}
          />

        ))}
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Expandable summary card (weekly / monthly / yearly)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function ExpandableSummaryCard({ dateBlock, label, onActivityClick, appSettings, searchTerm }) {

  const [expanded, setExpanded] = useState(false);
  const total = dateBlock.all.length;
  const done = dateBlock.all.filter(
    (a) => a.status === REVENUE_STATUS.APPROVED,
  ).length;
  const pending = dateBlock.all.filter(
    (a) => a.status === REVENUE_STATUS.PENDING,
  ).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const pctColor =
    pct >= 80
      ? "text-green-11 bg-green-3/50 border-green-6/20"
      : pct >= 50
        ? "text-amber-11 bg-amber-3/50 border-amber-6/20"
        : "text-red-11 bg-red-3/50 border-red-6/20";

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
    <div className="min-w-[300px] shrink-0 bg-card rounded-xl border border-mauve-4 shadow-sm snap-start flex flex-col overflow-hidden transition-all">
      {/* Summary header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-mauve-2 transition-colors cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5 truncate">
            {label}
          </p>
          <p className="text-2xl font-black text-foreground leading-tight">
            {total}
            <span className="text-xs font-semibold text-muted-foreground ml-1.5">activities</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pending > 0 && (
            <span className="text-[10px] font-bold text-amber-11 bg-amber-3/50 border border-amber-6/20 px-2 py-0.5 rounded-full">
              {pending} pending
            </span>
          )}
          <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${pctColor}`}>
            {pct}%
          </span>
          <span className={`text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </div>
      </button>

      {/* Completion bar */}
      <div className="h-1 bg-mauve-3 mx-4 rounded-full mb-1">
        <div
          className={`h-1 rounded-full transition-all duration-500 ${pct >= 80 ? "bg-green-9" : pct >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Expandable body */}
      {expanded && (
        <div className="bg-mauve-2 border-t border-mauve-3 p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {datesSorted.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-2">No activities</p>
          ) : (
            datesSorted.map((d) => (
              <div key={d} className="bg-card border border-mauve-4 rounded-lg p-3 shadow-sm">
                <h4 className="text-xs font-bold text-foreground mb-3 border-b border-mauve-3 pb-1 flex justify-between items-center">
                  {new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  <span className="text-[10px] text-muted-foreground font-normal bg-mauve-3 px-1.5 py-0.5 rounded text-center">
                    {activitiesByDate[d].AM.length + activitiesByDate[d].PM.length} tasks
                  </span>
                </h4>
                <div className="space-y-3">
                  {activitiesByDate[d].AM.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-blue-11 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Clock size={10} /> AM Block
                      </p>
                      <div className="space-y-1.5">
                        {activitiesByDate[d].AM.map((act) => (
                          <BoardActivityCard key={act.id} act={act} onClick={() => onActivityClick(act)} appSettings={appSettings} searchTerm={searchTerm} />
                        ))}

                      </div>
                    </div>
                  )}
                  {activitiesByDate[d].PM.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-violet-11 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 mt-2">
                        <Clock size={10} /> PM Block
                      </p>
                      <div className="space-y-1.5">
                        {activitiesByDate[d].PM.map((act) => (
                          <BoardActivityCard key={act.id} act={act} onClick={() => onActivityClick(act)} appSettings={appSettings} searchTerm={searchTerm} />
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
export function BoardActivityCard({ act, onClick, appSettings, searchTerm }) {

  const [showMeta, setShowMeta] = useState(false);
  const isDone = act.status === REVENUE_STATUS.APPROVED;
  const isLost = act.sales_outcome === "LOST";
  const isWon = act.sales_outcome === "COMPLETED";
  return (
    <div
      onClick={onClick}
      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm
        ${isLost
          ? "bg-destructive/5 border-red-500/30"
          : isWon
            ? "bg-green-9/10 border-green-500/20"
            : isDone
              ? "bg-mauve-2 border-mauve-4"
              : "bg-mauve-1 border-mauve-3 hover:border-mauve-5"
        }
        ${act.is_unplanned && "bg-mauve-a2! border-0"}
      `}
    >
      <p
        className={`text-[13px] font-bold truncate ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}
      >
        <HighlightText text={act.account_name || "No Account Specified"} search={searchTerm} />
      </p>

      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1 overflow-hidden">
          <span className="text-[9px] uppercase font-bold text-mauve-10 truncate max-w-[80px]">
            <HighlightText text={act.activity_type} search={searchTerm} />
          </span>

          <CardPlanBadge act={act} isDone={isDone} appSettings={appSettings} />
        </div>
        {isDone ? (
          <CheckCircle2 size={12} className="text-green-9 shrink-0" />
        ) : (
          <Circle size={12} className="text-mauve-7 shrink-0" />
        )}
      </div>
      {/* Metadata badges */}
      {(act.reference_number || act.expense_amount || act.sales_outcome) && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMeta((prev) => !prev);
            }}
            className="text-[9px] font-bold uppercase tracking-widest text-mauve-8 hover:text-mauve-11"
          >
            {showMeta ? "Hide details" : "Show details"}
          </button>
          {showMeta && (
            <div className="flex flex-wrap gap-1 mt-1">
              {act.reference_number && (
                <span className="text-[8px] font-black text-amber-11 bg-amber-3/50 px-1.5 py-0.5 rounded-full border border-amber-6/20 truncate max-w-[80px]">
                  {act.reference_number}
                </span>
              )}
              {act.expense_amount && (
                <span className="text-[8px] font-black text-green-10 bg-green-9/10 px-1.5 py-0.5 rounded-full border border-green-9/20">
                  ₱{Number(act.expense_amount).toLocaleString()}
                </span>
              )}
              {isWon && (
                <span className="text-[8px] font-black text-green-10 bg-green-9/10 px-1.5 py-0.5 rounded-full border border-green-500/20">WON</span>
              )}
              {isLost && (
                <span className="text-[8px] font-black text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full border border-red-500/20">LOST</span>
              )}
            </div>
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
      <span className="shrink-0 text-[8px] bg-blue-3/50 text-blue-11 px-1 py-0.5 rounded uppercase tracking-widest font-black">
        UNPLANNED
      </span>
    );
  }

  const shouldShow = !isDone || (act.expense_amount > 0 && !appSettings?.sales_self_approve_expenses);
  if (!shouldShow) return null;

  const config = {
    DRAFT: { bg: "bg-amber-3/50 text-amber-11", label: "DRAFT" },
    SUBMITTED: { bg: "bg-green-9/10 text-green-10", label: "SUBMITTED" },
    APPROVED: { bg: "bg-green-9/10 text-green-10", label: "APPROVED" },
  };

  const c = config[planStatus];
  if (!c) return null;

  return (
    <span className={`shrink-0 text-[8px] ${c.bg} px-1 py-0.5 rounded uppercase tracking-widest font-black`}>
      {c.label}
    </span>
  );
}
