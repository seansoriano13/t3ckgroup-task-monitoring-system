import {
  CheckCircle2,
  Circle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Clock } from "lucide-react";
import Pagination from "./Pagination";

/**
 * Full table view for the Activities tab.
 */
export default function ActivitiesTable({
  filteredActivities,
  isLoading,
  activitiesPage,
  setActivitiesPage,
  itemsPerPage,
  onActivityClick,
  appSettings,
}) {
  return (
    <div className="bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-2 border-b border-gray-4">
              <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Date</th>
              <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Employee</th>
              <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Account</th>
              <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Activity</th>
              <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Details</th>
              <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Ref # / Expense</th>
              <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-4">
            {isLoading ? (
              <tr>
                <td colSpan="7" className="p-10 text-center text-gray-9 font-bold">
                  Loading Activities...
                </td>
              </tr>
            ) : filteredActivities.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-10 text-center text-gray-9 font-bold flex justify-center gap-2 items-center">
                  <AlertCircle /> No activities match the filters.
                </td>
              </tr>
            ) : (
              filteredActivities
                .slice((activitiesPage - 1) * itemsPerPage, activitiesPage * itemsPerPage)
                .map((act) => {
                  const isDone = act.status === "DONE" || act.status === "APPROVED";
                  const showApprovedStatus = act.expense_amount > 0 && !appSettings?.sales_self_approve_expenses;

                  return (
                    <tr
                      key={act.id}
                      onClick={() => onActivityClick(act)}
                      className="hover:bg-gray-3/50 cursor-pointer transition-colors"
                    >
                      {/* Date + badges */}
                      <td className="p-4 flex flex-col items-start gap-1">
                        <span className="font-mono text-sm font-bold text-gray-12">
                          {act.scheduled_date}
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] bg-gray-4 px-2 py-0.5 rounded uppercase tracking-widest text-gray-11 font-black">
                            {act.time_of_day}
                          </span>
                          <PlanStatusBadge act={act} isDone={isDone} showApprovedStatus={showApprovedStatus} />
                        </div>
                      </td>

                      {/* Employee */}
                      <td className="p-4">
                        <p className="font-bold text-sm text-gray-12">{act.employees?.name || "Unknown"}</p>
                        <p className="text-[10px] font-bold text-gray-9 uppercase tracking-wider">{act.employees?.department}</p>
                      </td>

                      {/* Account */}
                      <td className="p-4 font-bold text-sm text-gray-12 max-w-[200px] truncate" title={act.account_name}>
                        {act.account_name || <span className="text-gray-8 italic font-normal">No Account</span>}
                      </td>

                      {/* Activity type */}
                      <td className="p-4">
                        <span className="text-xs font-semibold text-gray-11">{act.activity_type}</span>
                        {(act.is_unplanned || !act.sales_weekly_plans?.status) && (
                          <span className="block mt-1 text-[10px] text-blue-500 bg-blue-500/10 w-max px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">
                            Unplanned
                          </span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="p-4 text-xs text-gray-11 max-w-[250px] truncate" title={act.details_daily}>
                        {act.details_daily || act.remarks_plan || <span className="text-gray-7 italic">Blank</span>}
                      </td>

                      {/* Ref / Expense / Outcome */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {act.reference_number && (
                            <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full w-max">
                              {act.reference_number}
                            </span>
                          )}
                          {act.expense_amount && (
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full w-max">
                              ₱ {Number(act.expense_amount).toLocaleString()}
                            </span>
                          )}
                          {act.sales_outcome === "COMPLETED" && (
                            <span className="text-[10px] font-black text-green-600 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full w-max">WON</span>
                          )}
                          {act.sales_outcome === "LOST" && (
                            <span className="text-[10px] font-black text-red-600 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full w-max">LOST</span>
                          )}
                          {!act.reference_number && !act.expense_amount && !act.sales_outcome && (
                            <span className="text-gray-7 italic text-[10px]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Status icon */}
                      <td className="p-4 text-center">
                        <ActivityStatusIcon status={act.status} showApprovedStatus={showApprovedStatus} />
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={activitiesPage}
        totalItems={filteredActivities.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setActivitiesPage}
      />
    </div>
  );
}

/* ── Tiny sub-components (no need for separate files) ────────────────── */

function PlanStatusBadge({ act, isDone, showApprovedStatus }) {
  const planStatus = act.sales_weekly_plans?.status;
  const isUnplanned = act.is_unplanned || !planStatus;

  if (isUnplanned) {
    return (
      <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded uppercase tracking-widest font-black" title="Unplanned Injection">
        UNPLANNED
      </span>
    );
  }

  const shouldShow = !isDone || showApprovedStatus;
  if (!shouldShow) return null;

  const config = {
    DRAFT: { bg: "bg-yellow-500/10 text-yellow-600", label: "DRAFT" },
    SUBMITTED: { bg: "bg-green-500/10 text-green-600", label: "SUBMITTED" },
    APPROVED: { bg: "bg-green-500/10 text-green-600 border border-green-500/30", label: "APPROVED" },
  };

  const c = config[planStatus];
  if (!c) return null;

  return (
    <span className={`text-[10px] ${c.bg} px-2 py-0.5 rounded uppercase tracking-widest font-black`} title={`${c.label} Plan`}>
      {c.label}
    </span>
  );
}

function ActivityStatusIcon({ status, showApprovedStatus }) {
  if (status === "APPROVED") {
    return (
      <div className="flex flex-col items-center gap-1 text-green-500">
        <CheckCircle2 size={18} />
        {showApprovedStatus && (
          <span className="text-[10px] font-black uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded">APPROVED</span>
        )}
      </div>
    );
  }
  if (status === "PENDING") {
    return (
      <div className="flex flex-col items-center gap-1 text-amber-500">
        <Clock size={18} />
        <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded">PENDING</span>
      </div>
    );
  }
  if (status === "REJECTED") {
    return (
      <div className="flex flex-col items-center gap-1 text-red-500">
        <XCircle size={18} />
        <span className="text-[10px] font-black uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded">REJECTED</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1 text-gray-8">
      <Circle size={18} />
      <span className="text-[10px] font-bold uppercase tracking-widest">Incomplete</span>
    </div>
  );
}
