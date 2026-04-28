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
  PlusCircle,
  Edit3,
  User,
  ShieldCheck,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function EditRevenueModal({
  isOpen,
  onClose,
  log,
  onSave,
  isSaving,
  currentUser,
  isVerificationEnforced,
}) {
  const [activeTab, setActiveTab] = useState("overview");
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

  // Build history logs
  const historyLogs = [];
  if (log) {
    if (log.created_at) {
      historyLogs.push({
        id: "create",
        action: "CREATED",
        date: log.created_at,
        user: log.employees?.name || "System",
        avatar: log.employees?.avatar_path,
      });
    }

    if (log.edit_requested_at) {
      historyLogs.push({
        id: "request",
        action: "EDIT REQUESTED",
        date: log.edit_requested_at,
        user: log.employees?.name || "System",
        avatar: log.employees?.avatar_path,
        amount: log.edit_request_amount,
        reason: log.edit_request_reason,
      });
    }

    if (log.edit_request_status === REVENUE_STATUS.REJECTED && log.last_edited_at) {
      historyLogs.push({
        id: "reject",
        action: "REQUEST REJECTED",
        date: log.last_edited_at,
        user: log.editor?.name || "Admin",
        avatar: log.editor?.avatar_path,
      });
    } else if (log.last_edited_at) {
      historyLogs.push({
        id: "edit",
        action: "UPDATED",
        date: log.last_edited_at,
        user: log.editor?.name || "System",
        avatar: log.editor?.avatar_path,
      });
    }

    if (log.is_verified) {
      historyLogs.push({
        id: "verify",
        action: "VERIFIED",
        date: log.last_edited_at || log.created_at,
        user: log.editor?.name || "Super Admin",
        avatar: log.editor?.avatar_path,
      });
    }
  }

  historyLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg w-full p-0 bg-card shadow-2xl rounded-2xl border border-mauve-4 overflow-hidden flex flex-col max-h-[90vh] z-[100]"
      >
        <div className="p-4 border-b border-mauve-4 flex justify-between items-center bg-mauve-2 shrink-0">
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            {isVerifiedAndLocked ? (
              <Lock size={20} className="text-primary" />
            ) : (
              <Edit size={20} className="text-green-9" />
            )}
            {isVerifiedAndLocked ? "Locked Log" : "Edit Revenue"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-mauve-3 hover:bg-mauve-4 rounded-full text-mauve-10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* TABS */}
        <div className="flex px-6 border-b border-border bg-card shrink-0 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "history"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            History
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar flex-1 bg-card/50">
          {activeTab === "overview" ? (
            <>
              {canEditDirectly && hasPendingRequest && (
                <div className="bg-violet-3/50 border border-violet-6/20 rounded-xl p-4 shadow-sm mb-2">
                  <div className="flex items-start gap-3">
                    <div className="bg-violet-4/50 p-2 rounded-lg text-violet-11 mt-0.5">
                      <MessageSquare size={16} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-black text-violet-11 uppercase tracking-widest mb-1">
                        Edit Request Pending
                      </h4>
                      <p className="text-sm text-foreground bg-card dark:bg-mauve-3 p-2 rounded-lg border border-mauve-4 font-medium italic my-2">
                        "{log.edit_request_reason}"
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">
                          Proposed Override:
                        </span>
                        <span className="text-sm font-black text-violet-11 line-through opacity-60">
                          ₱{Number(log.revenue_amount).toLocaleString()}
                        </span>
                        <span className="text-xs font-black text-muted-foreground">→</span>
                        <span className="text-sm font-black text-green-10 bg-green-9/10 px-2 py-0.5 rounded border border-green-500/20">
                          ₱{Number(log.edit_request_amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-blue-500/20">
                    <button
                      onClick={() => resolveMutation.mutate({ isApproved: false })}
                      disabled={resolveMutation.isPending}
                      className="flex-1 bg-mauve-3 hover:bg-destructive/10 hover:text-destructive text-mauve-11 font-bold text-xs py-2 rounded-lg transition-colors"
                    >
                      Reject Request
                    </button>
                    <button
                      onClick={() => resolveMutation.mutate({ isApproved: true })}
                      disabled={resolveMutation.isPending}
                      className="flex-1 bg-violet-9 hover:bg-violet-10 text-primary-foreground font-black text-xs py-2 rounded-lg shadow-md transition-colors"
                    >
                      Approve & Apply Overlay
                    </button>
                  </div>
                </div>
              )}

              {isVerifiedAndLocked && !requestMode && !hasPendingRequest && (
                <div className="bg-primary/5 border focus:border-mauve-6 rounded-xl p-4 text-center mb-6 shadow-sm">
                  <Lock size={28} className="mx-auto text-primary mb-2 opacity-80" />
                  <p className="text-sm font-bold text-foreground">
                    This log has been audited and locked by a Super Admin.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Direct edits are disabled to protect dashboard integrity. If you
                    made an error, you must submit an Edit Request.
                  </p>
                  <button
                    onClick={() => setRequestMode(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs px-6 py-2.5 rounded-lg uppercase tracking-widest shadow-md transition-transform active:scale-95"
                  >
                    Request Changes
                  </button>
                </div>
              )}

              {isVerifiedAndLocked && hasPendingRequest && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 text-center mb-6">
                  <Clock size={28} className="mx-auto text-amber-11 mb-2 opacity-80" />
                  <p className="text-sm font-bold text-orange-600">
                    Edit Request Pending Review...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A Super Admin has been notified of your proposed change to{" "}
                    <strong className="text-foreground">
                      ₱{Number(log.edit_request_amount).toLocaleString()}
                    </strong>
                    .
                  </p>
                </div>
              )}

              {isVerifiedAndLocked && requestMode && (
                <form
                  onSubmit={handleRequestSubmit}
                  className="bg-mauve-2 border border-violet-6/20 rounded-xl p-5 mb-6 animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="flex items-center justify-between mb-4 border-b border-mauve-4 pb-2">
                    <h4 className="text-xs font-black text-violet-11 uppercase tracking-widest flex items-center gap-1.5">
                      <MessageSquare size={14} /> Submit Request
                    </h4>
                    <button
                      type="button"
                      onClick={() => setRequestMode(false)}
                      className="text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                        Proposed New Amount (PHP)
                      </label>
                      <div className="relative">
                        <DollarSign
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
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
                          className="w-full bg-card dark:bg-mauve-3 border border-violet-6/20 rounded-lg pl-8 pr-3 py-2 text-sm font-black text-violet-11 outline-none focus:border-violet-8 shadow-inner"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                        Reason for Edit <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        required
                        placeholder="e.g. Typographical error during data entry, actual amount should be..."
                        value={requestData.reason}
                        onChange={(e) =>
                          setRequestData({ ...requestData, reason: e.target.value })
                        }
                        className="w-full bg-card dark:bg-mauve-3 border border-mauve-4 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-violet-8 resize-none h-20"
                      />
                    </div>
                    <button
                      disabled={requestMutation.isPending}
                      type="submit"
                      className="w-full bg-violet-9 hover:bg-violet-10 text-primary-foreground font-black py-2.5 text-sm rounded-lg shadow-md transition-colors disabled:opacity-50"
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
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                      Date
                    </label>
                    <DatePicker
                      selected={formData.date ? new Date(formData.date) : null}
                      onChange={(date) => {
                        if (!date) {
                          setFormData({ ...formData, date: "" });
                          return;
                        }
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, "0");
                        const d = String(date.getDate()).padStart(2, "0");
                        setFormData({ ...formData, date: `${y}-${m}-${d}` });
                      }}
                      dateFormat="MMM d, yyyy"
                      required
                      portalId="root"
                      className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 font-bold transition-all cursor-pointer"
                      placeholderText="Select date"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                      Status
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full bg-mauve-2 border border-mauve-4 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:focus:border-mauve-6 font-bold"
                    >
                      <option value={REVENUE_STATUS.COMPLETED}>COMPLETED</option>
                      <option value={REVENUE_STATUS.LOST}>LOST</option>
                    </select>
                  </div>
                </div>

                {log.record_type === "SALES_QUOTATION" ? (
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                      Quotation Number
                    </label>
                    <input
                      type="text"
                      value={formData.quotation_number}
                      onChange={(e) =>
                        setFormData({ ...formData, quotation_number: e.target.value })
                      }
                      className="w-full bg-mauve-2 border border-violet-6/20 rounded-lg px-3 py-2 text-sm font-mono text-foreground outline-none focus:border-violet-8"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                      Sales Order (SO) Number
                    </label>
                    <input
                      type="text"
                      value={formData.so_number}
                      onChange={(e) =>
                        setFormData({ ...formData, so_number: e.target.value })
                      }
                      className="w-full bg-mauve-2 border border-green-500/30 rounded-lg px-3 py-2 text-sm font-mono text-foreground outline-none focus:border-green-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                    Account
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.account}
                    onChange={(e) =>
                      setFormData({ ...formData, account: e.target.value })
                    }
                    className="w-full bg-mauve-2 border border-mauve-4 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:focus:border-mauve-6"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
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
                    className="w-full bg-mauve-2 border border-mauve-4 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:focus:border-mauve-6"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                    Revenue Amount
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.revenue_amount}
                      onChange={(e) =>
                        setFormData({ ...formData, revenue_amount: e.target.value })
                      }
                      className={`w-full bg-mauve-2 border border-mauve-4 rounded-lg pl-8 pr-3 py-2 text-sm font-black outline-none focus:border-green-500 shadow-inner ${isVerifiedAndLocked ? "text-foreground" : "text-green-10"}`}
                    />
                  </div>
                </div>

                {canEditDirectly &&
                  isVerificationEnforced &&
                  log.is_verified === false &&
                  !hasPendingRequest && (
                    <div
                      className={`border rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between transition-colors ${formData.is_verified ? "bg-green-9/10 border-green-500/30" : "bg-orange-500/5 border-orange-500/20"}`}
                    >
                      <div>
                        <p
                          className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${formData.is_verified ? "text-green-10" : "text-amber-11"}`}
                        >
                          {formData.is_verified
                            ? "Audit Complete"
                            : "Pending Verification"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-bold max-w-sm leading-tight">
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
                        className={`px-4 py-2 font-black text-xs uppercase tracking-widest rounded-lg transition-transform active:scale-95 whitespace-nowrap ${formData.is_verified ? "bg-green-9 text-primary-foreground shadow-md" : "bg-orange-500 hover:bg-orange-600 text-primary-foreground"}`}
                      >
                        {formData.is_verified ? "Verified ✓" : "Verify Log"}
                      </button>
                    </div>
                  )}

                {canEditDirectly &&
                  isVerificationEnforced &&
                  log.is_verified === true &&
                  !hasPendingRequest && (
                    <div className="bg-green-9/5 border border-green-500/20 rounded-xl p-3 flex sm:items-center justify-between gap-3">
                      <span className="text-[10px] font-black text-green-10 uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Verified & Locked
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, is_verified: false })
                        }
                        className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-widest rounded-md bg-mauve-3 hover:bg-orange-500/20 hover:text-amber-11 text-mauve-11 transition-colors flex items-center gap-1"
                      >
                        <Unlock size={12} /> Unverify
                      </button>
                    </div>
                  )}

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                    Remarks
                  </label>
                  <textarea
                    disabled={isSaving}
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                    className="w-full bg-mauve-2 border border-mauve-4 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:focus:border-mauve-6 resize-none h-20 placeholder:text-mauve-7"
                    placeholder="Add optional details..."
                  />
                </div>
              </form>
            </>
          ) : (
            <div className="animate-in fade-in space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-mauve-4 before:from-transparent before:via-slate-200 before:to-transparent">
              {historyLogs.length === 0 ? (
                <div className="text-center py-10 relative z-10">
                  <p className="text-muted-foreground text-sm font-medium">
                    No history available for this record.
                  </p>
                </div>
              ) : (
                historyLogs.map((logItem) => {
                  let Icon = Edit3;
                  let colorClass =
                    "bg-[color:var(--blue-3)] text-[color:var(--blue-10)] border-[color:var(--blue-6)]";

                  if (logItem.action === "CREATED") {
                    Icon = PlusCircle;
                    colorClass = "bg-green-100 text-green-10 border-green-200";
                  } else if (logItem.action === "VERIFIED") {
                    Icon = ShieldCheck;
                    colorClass =
                      "bg-[color:var(--violet-3)] text-[color:var(--violet-10)] border-mauve-5";
                  } else if (logItem.action === "EDIT REQUESTED") {
                    Icon = Clock;
                    colorClass =
                      "bg-[color:var(--amber-3)] text-[color:var(--amber-10)] border-[color:var(--amber-6)]";
                  } else if (logItem.action === "REQUEST REJECTED") {
                    Icon = X;
                    colorClass =
                      "bg-red-100 text-destructive border-destructive/30";
                  }

                  return (
                    <div
                      key={logItem.id}
                      className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${colorClass} bg-card z-10`}
                      >
                        <Icon size={14} />
                      </div>

                      <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              logItem.action === "CREATED"
                                ? "bg-green-50 text-green-10"
                                : logItem.action === "VERIFIED"
                                  ? "bg-[color:var(--violet-2)] text-[color:var(--violet-10)]"
                                  : logItem.action === "EDIT REQUESTED"
                                    ? "bg-[color:var(--amber-2)] text-[color:var(--amber-10)]"
                                    : logItem.action === "REQUEST REJECTED"
                                      ? "bg-destructive/5 text-destructive"
                                      : "bg-[color:var(--blue-2)] text-[color:var(--blue-10)]"
                            }`}
                          >
                            {logItem.action}
                          </span>
                          <time className="text-xs text-muted-foreground font-semibold">
                            {new Date(logItem.date).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </time>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground overflow-hidden shrink-0">
                            {logItem.avatar ? (
                              <img
                                src={logItem.avatar}
                                alt="avatar"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User size={12} />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            {logItem.user}
                          </span>
                        </div>

                        {logItem.amount && (
                          <div className="text-xs text-mauve-11 dark:text-muted-foreground mt-2 bg-muted/30 p-3 rounded-lg border border-border/50 flex flex-col gap-1.5">
                            <div>
                              <strong className="text-foreground">Proposed:</strong> ₱{Number(logItem.amount).toLocaleString()}
                            </div>
                            {logItem.reason && (
                              <div>
                                <strong className="text-foreground">Reason:</strong> {logItem.reason}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {activeTab === "overview" && (
          <div className="p-4 border-t border-mauve-4 bg-mauve-2 shrink-0">
            {!isVerifiedAndLocked ? (
              <button
                type="submit"
                form="standard-edit-form"
                disabled={isSaving}
                className="w-full bg-green-9 hover:bg-green-9 text-primary-foreground font-black py-3 rounded-xl flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Update Details"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-mauve-4 hover:bg-mauve-5 text-foreground font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                Close View
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
