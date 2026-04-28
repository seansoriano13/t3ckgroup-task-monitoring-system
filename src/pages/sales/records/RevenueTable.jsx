import { useNavigate } from "react-router";
import {
  AlertCircle,
  Briefcase,
  Trash2,
} from "lucide-react";
import Pagination from "./Pagination";
import { REVENUE_STATUS, SALES_PLAN_STATUS } from "../../../constants/status";
import { confirmDeleteToast } from "../../../components/ui/CustomToast";
import HighlightText from "../../../components/HighlightText";
import Spinner from "../../../components/ui/Spinner";


/**
 * Full Revenue tab: record-type sub-filter tabs + table + pagination.
 */
export default function RevenueTable({
  filteredRevenue,
  isLoading,
  revenuePage,
  setRevenuePage,
  itemsPerPage,
  filterRecordType,
  setFilterRecordType,
  onRowClick,
  user,
  isVerificationEnforced,
  deleteRevenueMutation,
  searchTerm,
}) {

  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Record Type Sub-filter */}
      <div className="flex gap-2 bg-mauve-2 p-1 rounded-lg border border-mauve-4 shadow-inner overflow-x-auto w-max mb-2">
        {["ALL", "SALES_ORDER", "SALES_QUOTATION"].map((type) => (
          <button
            key={type}
            onClick={() => setFilterRecordType(type)}
            className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${filterRecordType === type
              ? type === "SALES_QUOTATION"
                ? "bg-violet-9 text-primary-foreground shadow"
                : "bg-foreground text-mauve-1 shadow"
              : "text-muted-foreground hover:text-foreground hover:bg-mauve-3"
              }`}
          >
            {type === "ALL"
              ? "ALL LOGS"
              : type === "SALES_ORDER"
                ? "SALES ORDERS"
                : "QUOTATIONS"}
          </button>
        ))}
      </div>

      <div className="bg-mauve-1 border border-mauve-4 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-mauve-2 border-b border-mauve-4">
                <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider">Sales Rep</th>
                <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider">Account</th>
                <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider">Product Sold</th>
                <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider">Type</th>
                <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider">Record #</th>
                <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider text-right">
                  {filterRecordType === "SALES_ORDER"
                    ? "Revenue (₱)"
                    : filterRecordType === "SALES_QUOTATION"
                      ? "Quotation (₱)"
                      : "Value (₱)"}
                </th>
                <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider text-center">Status</th>
                {user?.isSuperAdmin && (
                  <th className="p-4 text-xs font-bold text-mauve-10 uppercase tracking-wider text-center w-12"></th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-4">
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="p-20">
                    <div className="flex justify-center">
                      <Spinner size="md" text="Loading Revenue Logs..." />
                    </div>
                  </td>
                </tr>
              ) : filteredRevenue.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-10 text-center text-muted-foreground font-bold flex justify-center gap-2 items-center">
                    <AlertCircle /> No log entries match the filters.
                  </td>
                </tr>
              ) : (
                filteredRevenue
                  .slice((revenuePage - 1) * itemsPerPage, revenuePage * itemsPerPage)
                  .map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => onRowClick(log)}
                      className="hover:bg-mauve-3/50 cursor-pointer transition-colors"
                    >
                      <td className="p-4">
                        <span className="font-mono text-sm font-bold text-foreground">{log.date}</span>
                      </td>
                      <td className="p-4 text-sm">
                        <p className="font-bold text-foreground">
                          <HighlightText text={log.employees?.name || "Unknown"} search={searchTerm} />
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">
                          {log.employees?.sub_department || log.employees?.department || "No Dept"}
                        </p>
                      </td>
                      <td className="p-4 font-bold text-sm text-foreground">
                        <HighlightText text={log.account} search={searchTerm} />
                      </td>
                      <td className="p-4 text-xs font-semibold text-mauve-11">
                        <HighlightText text={log.product_item_sold} search={searchTerm} />
                      </td>
                      <td className="p-4 text-center">
                        <RecordTypeBadge recordType={log.record_type} />
                      </td>
                      <td className="">
                        <p className="text-[10px] font-black text-amber-11 bg-amber-3/50 border border-amber-6/20 px-2 py-0.5 rounded-full w-max">
                          {log.record_type === "SALES_QUOTATION"
                            ? (log.quotation_number || "—")
                            : (log.so_number || "—")}
                        </p>
                      </td>
                      <td className={`p-4 text-right font-black ${log.record_type === "SALES_QUOTATION" ? "text-violet-10" : "text-green-10"}`}>
                        ₱{log.revenue_amount?.toLocaleString() || "0"}
                      </td>
                      <td className="p-4 text-center">
                        <RevenueStatusBadge log={log} isVerificationEnforced={isVerificationEnforced} />
                      </td>
                      <td
                        className="p-4 text-center flex items-center justify-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Convert to SO Button for Quotations */}
                        {log.record_type === "SALES_QUOTATION" && (
                          log.is_converted ? (
                            <span
                              title="Already converted to a Sales Order"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-3/50 text-green-10 border border-green-6/20 cursor-default"
                            >
                              <Briefcase size={12} />
                              <p className="font-black text-[10px] uppercase tracking-widest">Converted</p>
                            </span>
                          ) : (
                            <button
                              title="Convert to Sales Order"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate("/sales/log-sales", {
                                  state: {
                                    prefill: {
                                      ...log,
                                      record_type: "SALES_ORDER",
                                      date: new Date().toISOString().split("T")[0],
                                      source_quotation_id: log.id,
                                    },
                                  },
                                });
                              }}
                              className="flex-center gap-1 p-1.5 rounded-lg text-violet-10 hover:bg-violet-3/50 transition-colors"
                            >
                              <p className="font-bold text-sm uppercase">Convert</p>{" "}
                              <Briefcase size={14} />
                            </button>
                          )
                        )}

                        {/* Super Admin soft-delete button */}
                        {user?.isSuperAdmin && (
                          <button
                            title="Remove log"
                            disabled={deleteRevenueMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteToast(
                                `Delete ${log.record_type === "SALES_QUOTATION" ? "Quotation" : "Sales Order"}?`,
                                `₱${Number(log.revenue_amount).toLocaleString()} – ${log.account}. This is a soft-delete and can be recovered from the database.`,
                                () => deleteRevenueMutation.mutate(log.id)
                              );
                            }}
                            className="p-1.5 rounded-lg transition-colors text-mauve-8 hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={revenuePage}
          totalItems={filteredRevenue.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setRevenuePage}
        />
      </div>
    </div>
  );
}

/* ── Tiny sub-components ─────────────────────────────────────────────── */

function RecordTypeBadge({ recordType }) {
  if (recordType === "SALES_QUOTATION") {
    return (
      <span
        className="bg-violet-3/50 text-violet-11 border border-violet-6/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest"
        title="Sales Quotation"
      >
        QN
      </span>
    );
  }
  return (
    <span
      className="bg-green-9/10 text-green-10 border border-green-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest"
      title="Sales Order"
    >
      SO
    </span>
  );
}

function RevenueStatusBadge({ log, isVerificationEnforced }) {
  if (
    isVerificationEnforced &&
    log.record_type !== "SALES_QUOTATION" &&
    log.is_verified === false
  ) {
    return (
      <span className="bg-amber-3/50 text-amber-11 border border-amber-6/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
        PENDING
      </span>
    );
  }

  // Converted quotation — takes priority over generic SUBMITTED label
  if (log.record_type === "SALES_QUOTATION" && log.is_converted) {
    return (
      <span className="bg-green-3/50 text-green-11 border border-green-6/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
        CONVERTED
      </span>
    );
  }

  if (
    log.status === REVENUE_STATUS.COMPLETED ||
    log.status === REVENUE_STATUS.APPROVED ||
    log.status === SALES_PLAN_STATUS.SUBMITTED
  ) {
    return (
      <span
        className={`${log.record_type === "SALES_QUOTATION" ? "bg-violet-3/50 text-violet-11 border-violet-6/20" : "bg-green-3/50 text-green-11 border-green-6/20"} border px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest`}
      >
        {log.record_type === "SALES_QUOTATION" ? "SUBMITTED" : "COMPLETED"}
      </span>
    );
  }

  return (
    <span className="bg-destructive/10 text-destructive border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
      LOST
    </span>
  );
}
