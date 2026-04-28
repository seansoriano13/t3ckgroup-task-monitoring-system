import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../../services/salesService";
import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import toast from "react-hot-toast";
import {
  DollarSign,
  Save,
  FileText,
  ShoppingCart,
  Calendar,
  Building2,
  Package,
  Hash,
  Banknote,
  AlignLeft,
  Tag,
  Check,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { RECORD_TYPE, REVENUE_STATUS } from "../../../constants/status";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import PageHeader from "../../../components/ui/PageHeader";
import PageContainer from "../../../components/ui/PageContainer";
import TabGroup from "../../../components/ui/TabGroup";
import Spinner from "../../../components/ui/Spinner";

export default function LogSalesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  // If navigated from "Convert to SO", pre-fill the data
  const prefill = location.state?.prefill || {};
  // ID of the original quotation being converted (if any)
  const sourceQuotationId = prefill.source_quotation_id || null;

  const [formData, setFormData] = useState({
    record_type: prefill.record_type || RECORD_TYPE.SALES_ORDER,
    date: prefill.date || new Date().toISOString().split("T")[0],
    account: prefill.account || "",
    product_item_sold: prefill.product_item_sold || "",
    revenue_amount: prefill.revenue_amount || "",
    so_number: prefill.so_number || "",
    quotation_number: prefill.quotation_number || "",
    reference_number: prefill.reference_number || "",
    remarks: prefill.remarks || "",
    status: prefill.status || REVENUE_STATUS.COMPLETED,
  });

  const isOrder = formData.record_type === RECORD_TYPE.SALES_ORDER;

  const mutation = useMutation({
    mutationFn: (payload) => salesService.logRevenue(payload),
    onSuccess: async () => {
      toast.success(
        isOrder
          ? "Sales Order Logged Successfully!"
          : "Sales Quotation Logged Successfully!",
      );

      // If this SO was converted from a quotation, flag the original as converted
      if (isOrder && sourceQuotationId) {
        try {
          await salesService.updateRevenueLog(sourceQuotationId, {
            is_converted: true,
          });
        } catch (err) {
          console.warn("Could not flag quotation as converted:", err.message);
        }
      }

      // clear `location.state` to avoid prefilling again if refreshed
      navigate(location.pathname, { replace: true, state: {} });
      // reset generic fields
      setFormData((f) => ({
        ...f,
        account: "",
        product_item_sold: "",
        revenue_amount: "",
        so_number: "",
        quotation_number: "",
        reference_number: "",
        remarks: "",
      }));
      // invalidate queries so Revenue tab reflects the converted flag
      queryClient.invalidateQueries({ queryKey: ["revenueLogs"] });
      queryClient.invalidateQueries({ queryKey: ["allRevenueLogs"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: appSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => salesService.getAppSettings(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(formData.revenue_amount);
    if (isNaN(num)) return toast.error("Invalid amount");

    // Only orders require verification flow
    const isVerifiedPayload =
      isOrder && appSettings?.require_revenue_verification ? false : true;

    mutation.mutate({
      ...formData,
      employee_id: user.id,
      revenue_amount: num,
      is_verified: isVerifiedPayload,
    });
  };

  return (
    <ProtectedRoute>
      <PageContainer maxWidth="7xl" className="pt-4 pb-12">
        <PageHeader
          showGradient={false}
          lastWordColor={isOrder ? "text-green-9" : "text-violet-9"}
          title={isOrder ? "Sales Order" : "Sales Quotation"}
          description={
            isOrder
              ? "Record Completed Sale operations to contribute to your monthly Quota Rankings."
              : "Record Quotations sent to clients. These do not count toward your Quota until converted to Sales Orders."
          }
        >
          <div className="flex items-center gap-2">
            {isOrder ? (
              <ShoppingCart
                size={32}
                className="text-green-9 bg-green-2 p-1.5 rounded-xl border border-green-3"
              />
            ) : (
              <FileText
                size={32}
                className="text-violet-9 bg-violet-2 p-1.5 rounded-xl border border-mauve-3"
              />
            )}
          </div>
        </PageHeader>

        <form
          onSubmit={handleSubmit}
          className={`max-w-3xl mx-auto bg-card rounded-2xl shadow-[0_10px_40px_-10px_rgba(79,70,229,0.15)] flex flex-col overflow-hidden border transition-colors duration-300 ${
            isOrder ? "border-green-5/60" : "border-mauve-5/60"
          }`}
        >
          <div className="p-6 sm:p-7 flex-1 space-y-6">
            {/* Record Type Toggle */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">
                Select Record Type
              </label>
              <TabGroup
                variant={isOrder ? "success" : "primary"}
                tabs={[
                  {
                    value: RECORD_TYPE.SALES_ORDER,
                    label: "Sales Order",
                    icon: ShoppingCart,
                  },
                  {
                    value: RECORD_TYPE.SALES_QUOTATION,
                    label: "Sales Quotation",
                    icon: FileText,
                    activeClass: !isOrder
                      ? "bg-violet-9 text-white shadow-md shadow-violet-9/20 rounded-lg"
                      : undefined,
                  },
                ]}
                activeTab={formData.record_type}
                onChange={(v) => setFormData({ ...formData, record_type: v })}
                size="md"
                fullWidth={true}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5 pt-2">
              {/* Date */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Date
                </label>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 bg-muted border rounded-lg transition-colors ${
                    isOrder
                      ? "border-green-3 focus-within:border-green-6 focus-within:bg-green-1/30"
                      : "border-mauve-3 focus-within:border-violet-5 focus-within:bg-violet-2/20"
                  }`}
                >
                  <Calendar
                    size={14}
                    className={isOrder ? "text-green-7" : "text-mauve-7"}
                  />
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
                    placeholderText="Select date"
                    className="flex-1 bg-transparent border-none outline-none text-sm text-foreground font-medium placeholder:text-mauve-6 w-full cursor-pointer"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Status
                </label>
                <TabGroup
                  variant={isOrder ? "success" : "primary"}
                  tabs={[
                    {
                      value: REVENUE_STATUS.COMPLETED,
                      label: isOrder ? "COMPLETED" : "SUBMITTED",
                      variant: "success",
                      activeClass: !isOrder
                        ? "bg-violet-9 text-white shadow-md shadow-violet-9/20 rounded-lg"
                        : undefined,
                    },
                    {
                      value: REVENUE_STATUS.LOST,
                      label: "LOST",
                      variant: "destructive",
                      activeClass:
                        "bg-red-9 text-white shadow-md shadow-violet-9/20 rounded-lg",
                    },
                  ]}
                  activeTab={formData.status}
                  onChange={(v) => setFormData({ ...formData, status: v })}
                  size="sm"
                  fullWidth={true}
                />
              </div>

              {/* Account / Client Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Account / Client Name
                </label>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 bg-muted border rounded-lg transition-colors ${
                    isOrder
                      ? "border-green-3 focus-within:border-green-6 focus-within:bg-green-1/30"
                      : "border-mauve-3 focus-within:border-violet-5 focus-within:bg-violet-2/20"
                  }`}
                >
                  <Building2
                    size={14}
                    className={
                      isOrder ? "text-green-7" : "text-mauve-7 shrink-0"
                    }
                  />
                  <input
                    required
                    type="text"
                    placeholder="e.g. CDRRMO - Cabadbaran City"
                    value={formData.account}
                    onChange={(e) =>
                      setFormData({ ...formData, account: e.target.value })
                    }
                    className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-mauve-6 w-full"
                  />
                </div>
              </div>

              {/* Product / Item */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Product / Item
                </label>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 bg-muted border rounded-lg transition-colors ${
                    isOrder
                      ? "border-green-3 focus-within:border-green-6 focus-within:bg-green-1/30"
                      : "border-mauve-3 focus-within:border-violet-5 focus-within:bg-violet-2/20"
                  }`}
                >
                  <Package
                    size={14}
                    className={
                      isOrder ? "text-green-7" : "text-mauve-7 shrink-0"
                    }
                  />
                  <input
                    required
                    type="text"
                    placeholder="e.g. Heavy Duty Double Jacketed Hose"
                    value={formData.product_item_sold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        product_item_sold: e.target.value,
                      })
                    }
                    className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-mauve-6 w-full"
                  />
                </div>
              </div>

              {/* Number */}
              <div className="space-y-1.5 sm:col-span-1">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                  <span>{isOrder ? "SO Number" : "Quotation Number"}</span>
                  <span className="normal-case font-medium text-[9px] text-muted-foreground/70">
                    (Optional)
                  </span>
                </label>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 bg-muted border rounded-lg transition-colors ${
                    isOrder
                      ? "border-green-3 focus-within:border-green-6 focus-within:bg-green-1/30"
                      : "border-mauve-3 focus-within:border-violet-5 focus-within:bg-violet-2/20"
                  }`}
                >
                  <Hash
                    size={14}
                    className={
                      isOrder ? "text-green-7" : "text-mauve-7 shrink-0"
                    }
                  />
                  <input
                    type="text"
                    placeholder={
                      isOrder ? "e.g. SO-2026-0042" : "e.g. QN-2026-001"
                    }
                    value={
                      isOrder ? formData.so_number : formData.quotation_number
                    }
                    onChange={(e) => {
                      if (isOrder) {
                        setFormData({ ...formData, so_number: e.target.value });
                      } else {
                        setFormData({
                          ...formData,
                          quotation_number: e.target.value,
                        });
                      }
                    }}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-mauve-6 w-full"
                  />
                </div>
              </div>

              {/* Ref Number */}
              <div className="space-y-1.5 sm:col-span-1">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                  <span>Ref #</span>
                  <span className="normal-case font-medium text-[9px] text-muted-foreground/70">
                    (Optional)
                  </span>
                </label>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 bg-muted border rounded-lg transition-colors ${
                    isOrder
                      ? "border-green-3 focus-within:border-green-6 focus-within:bg-green-1/30"
                      : "border-mauve-3 focus-within:border-violet-5 focus-within:bg-violet-2/20"
                  }`}
                >
                  <FileText
                    size={14}
                    className={
                      isOrder ? "text-green-7" : "text-mauve-7 shrink-0"
                    }
                  />
                  <input
                    type="text"
                    placeholder="e.g. PR-10294"
                    value={formData.reference_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reference_number: e.target.value,
                      })
                    }
                    className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-mauve-6 w-full"
                  />
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5 sm:col-span-2">
                <label
                  className={`block text-[11px] font-bold uppercase tracking-widest ${
                    isOrder ? "text-green-10" : "text-violet-10"
                  }`}
                >
                  {isOrder ? "Revenue Amount (PHP)" : "Quotation Amount (PHP)"}
                </label>
                <div
                  className={`flex items-center gap-2.5 px-4 py-3 bg-muted border rounded-xl transition-all shadow-inner ${
                    isOrder
                      ? "border-green-4 focus-within:border-green-6 focus-within:bg-green-1/30"
                      : "border-violet-4 focus-within:border-violet-6 focus-within:bg-violet-1/30"
                  }`}
                >
                  <span
                    className={`font-black text-lg ${
                      isOrder ? "text-green-10" : "text-violet-10"
                    }`}
                  >
                    ₱
                  </span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="72800.00"
                    value={formData.revenue_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        revenue_amount: e.target.value,
                      })
                    }
                    className={`flex-1 bg-transparent border-none outline-none font-black text-2xl placeholder:text-mauve-5 w-full ${
                      isOrder ? "text-green-10" : "text-violet-10"
                    }`}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                  <span>Remarks</span>
                  <span className="normal-case font-medium text-[9px] text-muted-foreground/70">
                    (Optional)
                  </span>
                </label>
                <div
                  className={`flex gap-2.5 px-3 py-2 bg-muted border rounded-lg transition-colors ${
                    isOrder
                      ? "border-green-3 focus-within:border-green-6 focus-within:bg-green-1/30"
                      : "border-mauve-3 focus-within:border-violet-5 focus-within:bg-violet-2/20"
                  }`}
                >
                  <AlignLeft
                    size={14}
                    className={`mt-0.5 shrink-0 ${
                      isOrder ? "text-green-7" : "text-mauve-7"
                    }`}
                  />
                  <textarea
                    placeholder="Any additional notes?"
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                    className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-mauve-6 w-full resize-none h-16"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end shrink-0">
            <button
              disabled={mutation.isPending}
              type="submit"
              className={`h-10 px-6 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold text-white transition-all ${
                isOrder
                  ? "bg-green-10 hover:bg-green-800 shadow-green-900/20 disabled:bg-green-10/50"
                  : "bg-violet-9 hover:bg-violet-10 shadow-violet-9/20 disabled:bg-violet-9/50"
              }`}
            >
              {mutation.isPending ? (
                <>
                  <Spinner size="sm" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={3} />
                  <span>
                    {isOrder ? "Log Sales Order" : "Log Sales Quotation"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </PageContainer>
    </ProtectedRoute>
  );
}
