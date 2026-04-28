import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../../services/salesService";
import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import toast from "react-hot-toast";
import { DollarSign, Save, FileText, ShoppingCart } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { RECORD_TYPE, REVENUE_STATUS } from "../../../constants/status";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import PageHeader from "../../../components/ui/PageHeader";
import PageContainer from "../../../components/ui/PageContainer";
import TabGroup from "../../../components/ui/TabGroup";

export default function LogSalesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  // If navigated from "Convert to SO", pre-fill the data
  const prefill = location.state?.prefill || {};

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
    onSuccess: () => {
      toast.success(
        isOrder
          ? "Sales Order Logged Successfully!"
          : "Sales Quotation Logged Successfully!",
      );
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
      // invalidate queries if Dashboard relies on them
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
      <PageContainer maxWidth="7xl" className="pt-4">
        <PageHeader
          showGradient={false}
          lastWordColor={
            isOrder
              ? "text-green-9"
              : "text-violet-9"
          }
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
          className={`max-w-4xl mx-auto bg-card border p-6 sm:p-8 rounded-2xl shadow-xl space-y-6 transition-colors duration-300 ${
            isOrder ? "border-green-6" : "border-mauve-5"
          }`}
        >
          {/* Record Type Toggle */}
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
              },
            ]}
            activeTab={formData.record_type}
            onChange={(v) => setFormData({ ...formData, record_type: v })}
            size="md"
            fullWidth={true}
            className="mb-6"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
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
                placeholderText="Select date"
                className={`w-full bg-muted/40 border text-foreground rounded-xl p-3 outline-none font-bold transition-all cursor-pointer ${
                  isOrder
                    ? "border-border focus:border-green-8 focus:ring-2 focus:ring-green-3"
                    : "border-border focus:border-mauve-8 focus:ring-2 focus:ring-mauve-3"
                }`}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
                Status
              </label>
              <TabGroup
                variant={isOrder ? "success" : "primary"}
                tabs={[
                  {
                    value: REVENUE_STATUS.COMPLETED,
                    label: isOrder ? "COMPLETED" : "SUBMITTED / LOGGED",
                  },
                  {
                    value: REVENUE_STATUS.LOST,
                    label: "LOST",
                    variant: "destructive",
                  },
                ]}
                activeTab={formData.status}
                onChange={(v) => setFormData({ ...formData, status: v })}
                size="sm"
                fullWidth={true}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
                Account / Client Name
              </label>
              <input
                required
                type="text"
                placeholder="e.g. CDRRMO - Cabadbaran City"
                value={formData.account}
                onChange={(e) =>
                  setFormData({ ...formData, account: e.target.value })
                }
                className={`w-full bg-muted/40 border border-border text-foreground rounded-xl p-3 outline-none transition-all ${
                  isOrder
                    ? "focus:border-green-8 focus:ring-2 focus:ring-green-3"
                    : "focus:border-mauve-8 focus:ring-2 focus:ring-mauve-3"
                }`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
                Product / Item
              </label>
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
                className={`w-full bg-muted/40 border border-border text-foreground rounded-xl p-3 outline-none transition-all ${
                  isOrder
                    ? "focus:border-green-8 focus:ring-2 focus:ring-green-3"
                    : "focus:border-mauve-8 focus:ring-2 focus:ring-mauve-3"
                }`}
              />
            </div>

            <div className="sm:col-span-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
                {isOrder ? "SO Number" : "Quotation Number"}{" "}
                <span className="normal-case font-medium text-mauve-8">
                  (Optional)
                </span>
              </label>
              <input
                type="text"
                placeholder={isOrder ? "e.g. SO-2026-0042" : "e.g. QN-2026-001"}
                value={isOrder ? formData.so_number : formData.quotation_number}
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
                className={`w-full bg-muted/40 border border-border text-foreground rounded-xl p-3 outline-none transition-all ${
                  isOrder
                    ? "focus:border-green-8 focus:ring-2 focus:ring-green-3"
                    : "focus:border-mauve-8 focus:ring-2 focus:ring-mauve-3"
                }`}
              />
            </div>

            <div className="sm:col-span-1">
              <label
                className={`text-xs font-bold uppercase block mb-1 ${isOrder ? "text-green-10" : "text-mauve-11"}`}
              >
                {isOrder ? "Revenue Amount (PHP)" : "Quotation Amount (PHP)"}
              </label>
              <div className="relative">
                <span
                  className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold ${isOrder ? "text-green-10" : "text-mauve-11"}`}
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
                  className={`w-full bg-muted/40 border font-black text-2xl rounded-xl pl-10 pr-4 py-3 outline-none shadow-inner transition-all ${
                    isOrder
                      ? "border-green-6 text-green-10 focus:border-green-8 focus:ring-2 focus:ring-green-3"
                      : "border-mauve-5 text-violet-10 focus:border-mauve-8 focus:ring-2 focus:ring-mauve-3"
                  }`}
                />
              </div>
            </div>

            <div className="sm:col-span-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
                Ref #
              </label>
              <input
                type="text"
                placeholder="Optional"
                value={formData.reference_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reference_number: e.target.value,
                  })
                }
                className={`w-full bg-muted/40 border border-border text-foreground rounded-xl p-3 outline-none transition-all ${
                  isOrder
                    ? "focus:border-green-8 focus:ring-2 focus:ring-green-3"
                    : "focus:border-mauve-8 focus:ring-2 focus:ring-mauve-3"
                }`}
              />
            </div>

            <div className="sm:col-span-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
                Remarks
              </label>
              <textarea
                placeholder="Any additional notes?"
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
                className={`w-full bg-muted/40 border border-border text-foreground rounded-xl p-3 outline-none resize-none h-24 transition-all ${
                  isOrder
                    ? "focus:border-green-8 focus:ring-2 focus:ring-green-3"
                    : "focus:border-mauve-8 focus:ring-2 focus:ring-mauve-3"
                }`}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <button
              disabled={mutation.isPending}
              type="submit"
              className={`w-full text-primary-foreground font-black text-base py-4 rounded-2xl flex justify-center items-center gap-2 disabled:opacity-50 transition-all shadow-xl uppercase tracking-widest ${
                isOrder
                  ? "bg-green-10 hover:bg-green-800 shadow-green-800/20"
                  : "bg-primary hover:bg-primary-hover shadow-primary/20"
              }`}
            >
              <Save size={24} />
              {mutation.isPending
                ? "Saving..."
                : isOrder
                  ? "Save Sales Order"
                  : "Save Sales Quotation"}
            </button>
          </div>
        </form>
      </PageContainer>
    </ProtectedRoute>
  );
}
