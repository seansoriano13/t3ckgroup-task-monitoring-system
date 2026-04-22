import { useNavigate } from "react-router";
import {
  AlertCircle,
  Briefcase,
  Trash2,
} from "lucide-react";
import Pagination from "./Pagination";
import { REVENUE_STATUS, SALES_PLAN_STATUS } from "../../../constants/status";
import { confirmDeleteToast } from "../../../components/ui/CustomToast";

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
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Record Type Sub-filter */}
      <div className="flex gap-2 bg-gray-2 p-1 rounded-lg border border-gray-4 shadow-inner overflow-x-auto w-max mb-2">
        {["ALL", "SALES_ORDER", "SALES_QUOTATION"].map((type) => (
          <button
            key={type}
            onClick={() => setFilterRecordType(type)}
            className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${filterRecordType === type
              ? type === "SALES_QUOTATION"
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-12 text-gray-1 shadow"
              : "text-gray-9 hover:text-gray-12 hover:bg-gray-3"
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

      <div className="bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-2 border-b border-gray-4">
                <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Sales Rep</th>
                <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Account</th>
                <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Product Sold</th>
                <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Type</th>
                <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Record #</th>
                <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider text-right">
                  {filterRecordType === "SALES_ORDER"
                    ? "Revenue (₱)"
                    : filterRecordType === "SALES_QUOTATION"
                      ? "Quotation (₱)"
                      : "Value (₱)"}
                </th>
                <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider text-center">Status</th>
                {user?.isSuperAdmin && (
                  <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider text-center w-12"></th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-4">
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="p-10 text-center text-gray-9 font-bold">
                    Loading Revenue Logs...
                  </td>
                </tr>
              ) : filteredRevenue.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-10 text-center text-gray-9 font-bold flex justify-center gap-2 items-center">
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
                      className="hover:bg-gray-3/50 cursor-pointer transition-colors"
                    >
                      <td className="p-4">
                        <span className="font-mono text-sm font-bold text-gray-12">{log.date}</span>
                      </td>
                      <td className="p-4 text-sm">
                        <p className="font-bold text-gray-12">{log.employees?.name || "Unknown"}</p>
                        <p className="text-[10px] font-bold text-gray-9 uppercase">
                          {log.employees?.sub_department || log.employees?.department || "No Dept"}
                        </p>
                      </td>
                      <td className="p-4 font-bold text-sm text-gray-12">{log.account}</td>
                      <td className="p-4 text-xs font-semibold text-gray-11">{log.product_item_sold}</td>
                      <td className="p-4 text-center">
                        <RecordTypeBadge recordType={log.record_type} />
                      </td>
                      <td className="">
                        <p className="text-[10px] font-black text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full w-max">
                          {log.record_type === "SALES_QUOTATION"
                            ? (log.quotation_number || "—")
                            : (log.so_number || "—")}
                        </p>
                      </td>
                      <td className={`p-4 text-right font-black ${log.record_type === "SALES_QUOTATION" ? "text-blue-600" : "text-green-600"}`}>
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
                                  },
                                },
                              });
                            }}
                            className="flex-center gap-1 p-1.5 rounded-lg text-blue-600 hover:bg-blue-500/10 transition-colors"
                          >
                            <p className="font-bold text-sm uppercase">Convert</p>{" "}
                            <Briefcase size={14} />
                          </button>
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
                            className="p-1.5 rounded-lg transition-colors text-gray-8 hover:text-red-500 hover:bg-red-500/10"
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
        className="bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest"
        title="Sales Quotation"
      >
        QN
      </span>
    );
  }
  return (
    <span
      className="bg-green-500/10 text-green-600 border border-green-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest"
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
      <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
        PENDING
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
        className={`${log.record_type === "SALES_QUOTATION" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"} border px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest`}
      >
        {log.record_type === "SALES_QUOTATION" ? "SUBMITTED" : "COMPLETED"}
      </span>
    );
  }

  return (
    <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
      LOST
    </span>
  );
}
