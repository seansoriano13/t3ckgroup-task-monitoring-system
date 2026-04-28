import { useState } from "react";
import { CheckCircle2, Circle, XCircle, AlertCircle } from "lucide-react";
import { Clock } from "lucide-react";
import Pagination from "./Pagination";
import HighlightText from "../../../components/HighlightText";
import Spinner from "../../../components/ui/Spinner";

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
  searchTerm,
}) {
  const [expandedMetaRow, setExpandedMetaRow] = useState(null);

  return (
    <div className="bg-mauve-1 border border-mauve-4 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-mauve-2 border-b border-mauve-4">
              <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider">
                Date
              </th>
              <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider">
                Employee
              </th>
              <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider">
                Account
              </th>
              <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider">
                Activity
              </th>
              <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider">
                Details
              </th>
              <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider">
                Ref # / Expense
              </th>
              <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-4">
            {isLoading ? (
              <tr>
                <td colSpan="7" className="p-20">
                  <div className="flex justify-center">
                    <Spinner size="md" text="Loading Activities..." />
                  </div>
                </td>
              </tr>
            ) : filteredActivities.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="p-10 text-center text-muted-foreground font-bold flex justify-center gap-2 items-center"
                >
                  <AlertCircle /> No activities match the filters.
                </td>
              </tr>
            ) : (
              filteredActivities
                .slice(
                  (activitiesPage - 1) * itemsPerPage,
                  activitiesPage * itemsPerPage,
                )
                .map((act) => {
                  const isDone =
                    act.status === "DONE" || act.status === "APPROVED";
                  const showApprovedStatus =
                    act.expense_amount > 0 &&
                    !appSettings?.sales_self_approve_expenses;

                  return (
                    <tr
                      key={act.id}
                      onClick={() => onActivityClick(act)}
                      className="hover:bg-mauve-3/50 cursor-pointer transition-colors"
                    >
                      {/* Date + badges */}
                      <td className="p-4 flex flex-col items-start gap-1">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {act.scheduled_date}
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] bg-mauve-4 px-2 py-0.5 rounded uppercase tracking-widest text-mauve-11 font-black">
                            {act.time_of_day}
                          </span>
                          <PlanStatusBadge
                            act={act}
                            isDone={isDone}
                            showApprovedStatus={showApprovedStatus}
                          />
                        </div>
                      </td>

                      {/* Employee */}
                      <td className="p-4">
                        <p className="font-bold text-sm text-foreground">
                          <HighlightText
                            text={act.employees?.name || "Unknown"}
                            search={searchTerm}
                          />
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {act.employees?.department}
                        </p>
                      </td>

                      {/* Account */}
                      <td
                        className="p-4 font-bold text-sm text-foreground max-w-[200px] truncate"
                        title={act.account_name}
                      >
                        <HighlightText
                          text={act.account_name || "No Account Specified"}
                          search={searchTerm}
                        />
                      </td>

                      {/* Activity type */}
                      <td className="p-4">
                        <span className="text-xs font-semibold text-mauve-11">
                          <HighlightText
                            text={act.activity_type}
                            search={searchTerm}
                          />
                        </span>
                        {(act.is_unplanned ||
                          !act.sales_weekly_plans?.status) && (
                          <span className="block mt-1 text-[10px] text-blue-9 bg-blue-9/10 w-max px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">
                            Unplanned
                          </span>
                        )}
                      </td>

                      {/* Details */}
                      <td
                        className="p-4 text-xs text-mauve-11 max-w-[250px] truncate"
                        title={act.details_daily}
                      >
                        <HighlightText
                          text={act.details_daily || act.remarks_plan || "-"}
                          search={searchTerm}
                        />
                      </td>

                      {/* Ref / Expense / Outcome */}
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedMetaRow((prev) =>
                              prev === act.id ? null : act.id,
                            );
                          }}
                          className="text-[10px] font-bold uppercase tracking-widest text-mauve-8 hover:text-mauve-11"
                        >
                          {expandedMetaRow === act.id ? "Hide" : "Show"}
                        </button>
                        {expandedMetaRow === act.id && (
                          <div className="flex flex-col gap-1 mt-1.5">
                            {act.reference_number && (
                              <span className="text-[10px] font-black text-amber-10 bg-warning/10 border border-amber-500/20 px-2 py-0.5 rounded-full w-max">
                                {act.reference_number}
                              </span>
                            )}
                            {act.expense_amount && (
                              <span className="text-[10px] font-black text-green-10 bg-green-9/10 border border-green-9/20 px-2 py-0.5 rounded-full w-max">
                                ₱ {Number(act.expense_amount).toLocaleString()}
                              </span>
                            )}
                            {act.sales_outcome === "COMPLETED" && (
                              <span className="text-[10px] font-black text-green-10 bg-green-9/10 border border-green-500/20 px-2 py-0.5 rounded-full w-max">
                                WON
                              </span>
                            )}
                            {act.sales_outcome === "LOST" && (
                              <span className="text-[10px] font-black text-destructive bg-destructive/10 border border-red-500/20 px-2 py-0.5 rounded-full w-max">
                                LOST
                              </span>
                            )}
                            {!act.reference_number &&
                              !act.expense_amount &&
                              !act.sales_outcome && (
                                <span className="text-mauve-7 italic text-[10px]">
                                  —
                                </span>
                              )}
                          </div>
                        )}
                      </td>

                      {/* Status icon */}
                      <td className="p-4 text-center">
                        <ActivityStatusIcon
                          status={act.status}
                          headVerifiedAt={act.head_verified_at}
                          showApprovedStatus={showApprovedStatus}
                        />
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
      <span
        className="text-[10px] bg-blue-9/10 text-blue-10 px-2 py-0.5 rounded uppercase tracking-widest font-black"
        title="Unplanned Injection"
      >
        UNPLANNED
      </span>
    );
  }

  const shouldShow = !isDone || showApprovedStatus;
  if (!shouldShow) return null;

  const config = {
    DRAFT: {
      bg: "bg-yellow-9/10 text-yellow-600",
      label: "DRAFT",
    },
    SUBMITTED: { bg: "bg-green-9/10 text-green-10", label: "SUBMITTED" },
    APPROVED: {
      bg: "bg-green-9/10 text-green-10 border border-green-500/30",
      label: "APPROVED",
    },
  };

  const c = config[planStatus];
  if (!c) return null;

  return (
    <span
      className={`text-[10px] ${c.bg} px-2 py-0.5 rounded uppercase tracking-widest font-black`}
      title={`${c.label} Plan`}
    >
      {c.label}
    </span>
  );
}

function ActivityStatusIcon({ status, headVerifiedAt, showApprovedStatus }) {
  if (headVerifiedAt) {
    return (
      <div className="flex flex-col items-center gap-1 text-violet-11">
        <CheckCircle2 size={18} />
        <span className="text-[10px] font-black uppercase tracking-widest bg-violet-3 px-2 py-0.5 rounded border border-violet-6/30">
          VERIFIED
        </span>
      </div>
    );
  }
  if (status === "APPROVED") {
    return (
      <div className="flex flex-col items-center gap-1 text-green-9">
        <CheckCircle2 size={18} />
        {showApprovedStatus && (
          <span className="text-[10px] font-black uppercase tracking-widest bg-green-9/10 px-2 py-0.5 rounded">
            DONE
          </span>
        )}
      </div>
    );
  }
  if (status === "PENDING") {
    return (
      <div className="flex flex-col items-center gap-1 text-amber-9">
        <Clock size={18} />
        <span className="text-[10px] font-black uppercase tracking-widest bg-warning/10 px-2 py-0.5 rounded">
          PENDING
        </span>
      </div>
    );
  }
  if (status === "REJECTED") {
    return (
      <div className="flex flex-col items-center gap-1 text-destructive">
        <XCircle size={18} />
        <span className="text-[10px] font-black uppercase tracking-widest bg-destructive/10 px-2 py-0.5 rounded">
          REJECTED
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1 text-mauve-8">
      <Circle size={18} />
      <span className="text-[10px] font-bold uppercase tracking-widest">
        Incomplete
      </span>
    </div>
  );
}
