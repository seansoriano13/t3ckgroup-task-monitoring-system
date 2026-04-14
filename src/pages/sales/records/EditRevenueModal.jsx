import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../../services/salesService";
import { REVENUE_STATUS } from "../../../constants/status";
import toast from "react-hot-toast";
import {
  Lock,
  Edit,
  X,
  MessageSquare,
  Clock,
  DollarSign,
  CheckCircle2,
  Unlock,
} from "lucide-react";

export default function EditRevenueModal({
  isOpen,
  onClose,
  log,
  onSave,
  isSaving,
  currentUser,
  isVerificationEnforced,
}) {
  const [requestMode, setRequestMode] = useState(false);
  const [requestData, setRequestData] = useState({
    amount: log?.revenue_amount || "",
    reason: "",
  });
  const [formData, setFormData] = useState({
    account: log?.account || "",
    product_item_sold: log?.product_item_sold || "",
    revenue_amount: log?.revenue_amount || "",
    status: log?.status || REVENUE_STATUS.COMPLETED, // #2 removed legacy string
    remarks: log?.remarks || "",
    date: log?.date || "",
    so_number: log?.so_number || "",
    quotation_number: log?.quotation_number || "",
    is_verified: log?.is_verified !== false,
  });

  const queryClient = useQueryClient();

  const requestMutation = useMutation({
    mutationFn: (payload) =>
      salesService.requestRevenueEdit(
        log?.id,
        payload.amount,
        payload.reason,
        currentUser.id,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allRevenueLogs"] });
      toast.success("Edit Request sent to Super Admin!");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ isApproved }) =>
      salesService.resolveEditRequest(
        log?.id,
        isApproved,
        log?.edit_request_amount,
        currentUser.id,
      ),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["allRevenueLogs"] });
      toast.success(
        variables.isApproved ? "Change Approved & Applied!" : "Request Rejected",
      );
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isOpen || !log) return null;

  const isOwnLog = log.employee_id === currentUser?.id;
  const isHeadOfSubordinate =
    ((currentUser?.is_head || currentUser?.isHead) &&
      currentUser?.department === log.employees?.department &&
      !isOwnLog);

  const canEditDirectly = currentUser?.isSuperAdmin || isHeadOfSubordinate;

  const isVerifiedAndLocked =
    isVerificationEnforced && log.is_verified === true && !canEditDirectly;

  const hasPendingRequest =
    isVerificationEnforced && log.edit_request_status === "PENDING";

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(formData.revenue_amount);
    if (isNaN(num)) return toast.error("Invalid amount");
    onSave(log.id, {
      ...formData,
      revenue_amount: num,
      last_edited_by: currentUser?.id,
      last_edited_at: new Date().toISOString(),
    });
  };

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(requestData.amount);
    if (isNaN(num)) return toast.error("Invalid proposed amount");
    if (num === parseFloat(log.revenue_amount)) return toast.error("Proposed amount is the same as the current amount.");
    if (!requestData.reason.trim()) return toast.error("Reason is required");
    requestMutation.mutate({ amount: num, reason: requestData.reason });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="bg-gray-1 border border-gray-4 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-4 flex justify-between items-center bg-gray-2 shrink-0">
          <h2 className="text-xl font-black text-gray-12 flex items-center gap-2">
            {isVerifiedAndLocked ? (
              <Lock size={20} className="text-primary" />
            ) : (
              <Edit size={20} className="text-green-500" />
            )}
            {isVerifiedAndLocked ? "Locked Log" : "Edit Revenue"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-gray-3 hover:bg-gray-4 rounded-full text-gray-10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {canEditDirectly && hasPendingRequest && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 shadow-sm mb-2">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-500 mt-0.5">
                  <MessageSquare size={16} />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">
                    Edit Request Pending
                  </h4>
                  <p className="text-sm text-gray-12 bg-white dark:bg-gray-3 p-2 rounded-lg border border-gray-4 font-medium italic my-2">
                    "{log.edit_request_reason}"
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] uppercase font-bold text-gray-9">
                      Proposed Override:
                    </span>
                    <span className="text-sm font-black text-blue-600 line-through opacity-60">
                      ₱{Number(log.revenue_amount).toLocaleString()}
                    </span>
                    <span className="text-xs font-black text-gray-9">→</span>
                    <span className="text-sm font-black text-green-600 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                      ₱{Number(log.edit_request_amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-blue-500/20">
                <button
                  onClick={() => resolveMutation.mutate({ isApproved: false })}
                  disabled={resolveMutation.isPending}
                  className="flex-1 bg-gray-3 hover:bg-red-500/10 hover:text-red-500 text-gray-11 font-bold text-xs py-2 rounded-lg transition-colors"
                >
                  Reject Request
                </button>
                <button
                  onClick={() => resolveMutation.mutate({ isApproved: true })}
                  disabled={resolveMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2 rounded-lg shadow-md transition-colors"
                >
                  Approve & Apply Overlay
                </button>
              </div>
            </div>
          )}

          {isVerifiedAndLocked && !requestMode && !hasPendingRequest && (
            <div className="bg-primary/5 border focus:border-gray-6 rounded-xl p-4 text-center mb-6 shadow-sm">
              <Lock size={28} className="mx-auto text-primary mb-2 opacity-80" />
              <p className="text-sm font-bold text-gray-12">
                This log has been audited and locked by a Super Admin.
              </p>
              <p className="text-xs text-gray-9 mt-1 mb-4">
                Direct edits are disabled to protect dashboard integrity. If you
                made an error, you must submit an Edit Request.
              </p>
              <button
                onClick={() => setRequestMode(true)}
                className="bg-primary hover:bg-primary/90 text-white font-black text-xs px-6 py-2.5 rounded-lg uppercase tracking-widest shadow-md transition-transform active:scale-95"
              >
                Request Changes
              </button>
            </div>
          )}

          {isVerifiedAndLocked && hasPendingRequest && (
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 text-center mb-6">
              <Clock size={28} className="mx-auto text-orange-500 mb-2 opacity-80" />
              <p className="text-sm font-bold text-orange-600">
                Edit Request Pending Review...
              </p>
              <p className="text-xs text-gray-9 mt-1">
                A Super Admin has been notified of your proposed change to{" "}
                <strong className="text-gray-12">
                  ₱{Number(log.edit_request_amount).toLocaleString()}
                </strong>
                .
              </p>
            </div>
          )}

          {isVerifiedAndLocked && requestMode && (
            <form
              onSubmit={handleRequestSubmit}
              className="bg-gray-2 border border-blue-500/30 rounded-xl p-5 mb-6 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between mb-4 border-b border-gray-4 pb-2">
                <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                  <MessageSquare size={14} /> Submit Request
                </h4>
                <button
                  type="button"
                  onClick={() => setRequestMode(false)}
                  className="text-[10px] font-bold text-gray-9 hover:text-gray-12 uppercase"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                    Proposed New Amount (PHP)
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-9"
                    />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={requestData.amount}
                      onChange={(e) =>
                        setRequestData({
                          ...requestData,
                          amount: e.target.value,
                        })
                      }
                      className="w-full bg-white dark:bg-gray-3 border border-blue-500/40 rounded-lg pl-8 pr-3 py-2 text-sm font-black text-blue-600 outline-none focus:border-blue-500 shadow-inner"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                    Reason for Edit <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    placeholder="e.g. Typographical error during data entry, actual amount should be..."
                    value={requestData.reason}
                    onChange={(e) =>
                      setRequestData({ ...requestData, reason: e.target.value })
                    }
                    className="w-full bg-white dark:bg-gray-3 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-blue-500 resize-none h-20"
                  />
                </div>
                <button
                  disabled={requestMutation.isPending}
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 text-sm rounded-lg shadow-md transition-colors disabled:opacity-50"
                >
                  {requestMutation.isPending
                    ? "Submitting..."
                    : "Send Request to Admin"}
                </button>
              </div>
            </form>
          )}

          <form
            id="standard-edit-form"
            onSubmit={handleSubmit}
            className={`space-y-4 ${isVerifiedAndLocked ? "opacity-50 pointer-events-none grayscale-[50%]" : ""}`}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:focus:border-gray-6 font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                  Status
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:focus:border-gray-6 font-bold"
                >
                  <option value={REVENUE_STATUS.COMPLETED}>COMPLETED</option>
                  <option value={REVENUE_STATUS.LOST}>LOST</option>
                </select>
              </div>
            </div>

            {log.record_type === "SALES_QUOTATION" ? (
              <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                  Quotation Number
                </label>
                <input
                  type="text"
                  value={formData.quotation_number}
                  onChange={(e) =>
                    setFormData({ ...formData, quotation_number: e.target.value })
                  }
                  className="w-full bg-gray-2 border border-blue-500/30 rounded-lg px-3 py-2 text-sm font-mono text-gray-12 outline-none focus:border-blue-500"
                />
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                  Sales Order (SO) Number
                </label>
                <input
                  type="text"
                  value={formData.so_number}
                  onChange={(e) =>
                    setFormData({ ...formData, so_number: e.target.value })
                  }
                  className="w-full bg-gray-2 border border-green-500/30 rounded-lg px-3 py-2 text-sm font-mono text-gray-12 outline-none focus:border-green-500"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                Account
              </label>
              <input
                type="text"
                required
                value={formData.account}
                onChange={(e) =>
                  setFormData({ ...formData, account: e.target.value })
                }
                className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:focus:border-gray-6"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                Product Sold
              </label>
              <input
                type="text"
                required
                value={formData.product_item_sold}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    product_item_sold: e.target.value,
                  })
                }
                className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:focus:border-gray-6"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                Revenue Amount
              </label>
              <div className="relative">
                <DollarSign
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-9"
                />
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.revenue_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, revenue_amount: e.target.value })
                  }
                  className={`w-full bg-gray-2 border border-gray-4 rounded-lg pl-8 pr-3 py-2 text-sm font-black outline-none focus:border-green-500 shadow-inner ${isVerifiedAndLocked ? "text-gray-12" : "text-green-600"}`}
                />
              </div>
            </div>

            {canEditDirectly &&
              isVerificationEnforced &&
              log.is_verified === false &&
              !hasPendingRequest && (
                <div
                  className={`border rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between transition-colors ${formData.is_verified ? "bg-green-500/10 border-green-500/30" : "bg-orange-500/5 border-orange-500/20"}`}
                >
                  <div>
                    <p
                      className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${formData.is_verified ? "text-green-600" : "text-orange-500"}`}
                    >
                      {formData.is_verified
                        ? "Audit Complete"
                        : "Pending Verification"}
                    </p>
                    <p className="text-xs text-gray-9 mt-0.5 font-bold max-w-sm leading-tight">
                      This log is trapped and requires a Super Admin stamp to be
                      globally applied to Dashboard metrics.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        is_verified: !formData.is_verified,
                      })
                    }
                    className={`px-4 py-2 font-black text-xs uppercase tracking-widest rounded-lg transition-transform active:scale-95 whitespace-nowrap ${formData.is_verified ? "bg-green-600 text-white shadow-md" : "bg-orange-500 hover:bg-orange-600 text-white"}`}
                  >
                    {formData.is_verified ? "Verified ✓" : "Verify Log"}
                  </button>
                </div>
              )}

            {canEditDirectly &&
              isVerificationEnforced &&
              log.is_verified === true &&
              !hasPendingRequest && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 flex sm:items-center justify-between gap-3">
                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Verified & Locked
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, is_verified: false })
                    }
                    className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-widest rounded-md bg-gray-3 hover:bg-orange-500/20 hover:text-orange-500 text-gray-11 transition-colors flex items-center gap-1"
                  >
                    <Unlock size={12} /> Unverify
                  </button>
                </div>
              )}

            <div>
              <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                Remarks
              </label>
              <textarea
                disabled={isSaving}
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
                className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:focus:border-gray-6 resize-none h-20 placeholder:text-gray-7"
                placeholder="Add optional details..."
              />
            </div>

            {log.editor?.name && (
              <div className="bg-gray-3/50 px-3 py-2 rounded-lg border border-gray-4 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-[10px] font-black uppercase text-gray-10 tracking-widest inline-flex items-center gap-1.5">
                  <Edit size={12} /> AUDIT LOG
                </span>
                <span className="text-[11px] font-mono text-gray-11">
                  <span className="font-bold text-gray-12">
                    {log.editor.name}
                  </span>{" "}
                  @{" "}
                  {new Date(log.last_edited_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </form>
        </div>

        <div className="p-4 border-t border-gray-4 bg-gray-2 shrink-0">
          {!isVerifiedAndLocked ? (
            <button
              type="submit"
              form="standard-edit-form"
              disabled={isSaving}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Update Details"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gray-4 hover:bg-gray-5 text-gray-12 font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              Close View
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
