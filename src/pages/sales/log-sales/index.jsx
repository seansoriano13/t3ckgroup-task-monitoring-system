import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../../services/salesService";
import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import toast from "react-hot-toast";
import { DollarSign, Save, FileText, ShoppingCart } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { RECORD_TYPE } from "../../../constants/status";

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
    status: prefill.status || "COMPLETED",
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
      <div className="max-w-3xl mx-auto space-y-6 pb-10 px-2 sm:px-4">
        <div className="border-b border-gray-4 pb-4">
          <h1 className="text-3xl font-black text-gray-12 flex items-center gap-3">
            {isOrder ? (
              <>
                <ShoppingCart size={28} className="text-green-500" /> Sales
                Order
              </>
            ) : (
              <>
                <FileText size={28} className="text-blue-500" /> Sales Quotation
              </>
            )}
          </h1>
          <p className="text-gray-9 mt-1 font-medium">
            {isOrder
              ? "Record Completed Sale operations to contribute to your monthly Quota Rankings."
              : "Record Quotations sent to clients. These do not count toward your Quota until converted to Sales Orders."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className={`bg-gray-1 border p-6 sm:p-8 rounded-2xl shadow-xl space-y-6 transition-colors duration-300 ${isOrder ? "border-green-500/30" : "border-blue-500/30"}`}
        >
          {/* Record Type Toggle */}
          <div className="flex bg-gray-2 p-1 rounded-xl border border-gray-4 shadow-inner mb-6">
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  record_type: RECORD_TYPE.SALES_ORDER,
                })
              }
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-black uppercase tracking-widest rounded-lg transition-all ${
                isOrder
                  ? "bg-green-600 text-white shadow-md transform scale-[1.02]"
                  : "text-gray-9 hover:text-gray-12 hover:bg-gray-3"
              }`}
            >
              <ShoppingCart size={16} /> Sales Order
            </button>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  record_type: RECORD_TYPE.SALES_QUOTATION,
                })
              }
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-black uppercase tracking-widest rounded-lg transition-all ${
                !isOrder
                  ? "bg-blue-600 text-white shadow-md transform scale-[1.02]"
                  : "text-gray-9 hover:text-gray-12 hover:bg-gray-3"
              }`}
            >
              <FileText size={16} /> Sales Quotation
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-gray-9 uppercase block mb-1">
                Date
              </label>
              <input
                required
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none focus:border-green-500 font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-9 uppercase block mb-1">
                Status
              </label>
              <div className="flex bg-gray-2 border border-gray-4 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, status: "COMPLETED" })
                  }
                  className={`flex-1 py-2 px-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${formData.status === "COMPLETED" ? (isOrder ? "bg-green-600 text-white shadow-md" : "bg-blue-600 text-white shadow-md") : "text-gray-9 hover:text-gray-12"}`}
                >
                  {isOrder ? "COMPLETED" : "SUBMITTED / LOGGED"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, status: "LOST SALES" })
                  }
                  className={`flex-1 py-2 px-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${formData.status === "LOST SALES" ? "bg-red-500 text-white shadow-md" : "text-gray-9 hover:text-gray-12"}`}
                >
                  LOST
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-9 uppercase block mb-1">
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
                className={`w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none focus:border-green-500 ${isOrder ? "focus:border-green-500" : "focus:border-blue-500"}`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-9 uppercase block mb-1">
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
                className={`w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none ${isOrder ? "focus:border-green-500" : "focus:border-blue-500"}`}
              />
            </div>

            <div className="sm:col-span-1">
              <label className="text-xs font-bold text-gray-9 uppercase block mb-1">
                {isOrder ? "SO Number" : "Quotation Number"}{" "}
                <span className="normal-case font-medium text-gray-8">
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
                className={`w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none ${isOrder ? "focus:border-green-500" : "focus:border-blue-500"}`}
              />
            </div>

            <div className="sm:col-span-1">
              <label
                className={`text-xs font-bold uppercase block mb-1 ${isOrder ? "text-green-600" : "text-blue-600"}`}
              >
                {isOrder ? "Revenue Amount (PHP)" : "Quotation Amount (PHP)"}
              </label>
              <div className="relative">
                <span
                  className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold ${isOrder ? "text-green-700/50" : "text-blue-700/50"}`}
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
                    setFormData({ ...formData, revenue_amount: e.target.value })
                  }
                  className={`w-full bg-gray-2 border font-black text-xl rounded-lg pl-10 pr-4 py-3 outline-none shadow-inner ${
                    isOrder
                      ? "border-green-900/40 text-green-500 focus:border-green-500"
                      : "border-blue-900/40 text-blue-500 focus:border-blue-500"
                  }`}
                />
              </div>
            </div>

            <div className="sm:col-span-1">
              <label className="text-xs font-bold text-gray-9 uppercase block mb-1">
                Ref #
              </label>
              <input
                type="text"
                placeholder="Optional"
                value={formData.reference_number}
                onChange={(e) =>
                  setFormData({ ...formData, reference_number: e.target.value })
                }
                className={`w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none ${isOrder ? "focus:border-green-500" : "focus:border-blue-500"}`}
              />
            </div>

            <div className="sm:col-span-1">
              <label className="text-xs font-bold text-gray-9 uppercase block mb-1">
                Remarks
              </label>
              <textarea
                placeholder="Any additional notes?"
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
                className={`w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none resize-none h-12 ${isOrder ? "focus:border-green-500" : "focus:border-blue-500"}`}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-4">
            <button
              disabled={mutation.isPending}
              type="submit"
              className={`w-full text-white font-black text-lg py-4 rounded-xl flex justify-center items-center gap-2 disabled:opacity-50 transition-all shadow-lg ${
                isOrder
                  ? "bg-green-600 hover:bg-green-700 shadow-green-900/20"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-900/20"
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
      </div>
    </ProtectedRoute>
  );
}
