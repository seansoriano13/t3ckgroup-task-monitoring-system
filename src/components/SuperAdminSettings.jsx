import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { salesService } from "../services/salesService";

export default function SuperAdminSettings() {
  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => salesService.getAppSettings(),
  });

  const [formData, setFormData] = useState({
    marketing_approval_by_ops_manager: false,
    sales_self_approve_expenses: false,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        marketing_approval_by_ops_manager: settings.marketing_approval_by_ops_manager || false,
        sales_self_approve_expenses: settings.sales_self_approve_expenses || false,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (payload) => salesService.updateAppSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      toast.success("Settings updated successfully!");
    },
    onError: (err) => {
      toast.error("Failed to update settings: " + err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="bg-gray-1 border border-gray-4 p-6 rounded-xl flex items-center gap-2">
        <Loader2 className="animate-spin text-gray-9" /> Loading settings...
      </div>
    );
  }

  const hasChanges =
    settings &&
    (formData.marketing_approval_by_ops_manager !== !!settings.marketing_approval_by_ops_manager ||
      formData.sales_self_approve_expenses !== !!settings.sales_self_approve_expenses);

  return (
    <div className="bg-gray-1 border border-gray-4 p-4 sm:p-6 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-12">System Settings</h2>
          <p className="text-xs text-gray-9 mt-0.5">
            Configure global verification overrides and feature flags.
          </p>
        </div>
        <button
          onClick={() => updateMutation.mutate(formData)}
          disabled={!hasChanges || updateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 disabled:bg-gray-4 disabled:text-gray-8 disabled:shadow-none disabled:cursor-not-allowed"
        >
          {updateMutation.isPending ? (
            <><Loader2 size={16} className="animate-spin" /> Saving...</>
          ) : (
            <><Save size={16} /> Save Changes</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Setting 1 */}
        <div className="flex items-start gap-3 bg-gray-2 p-4 rounded-xl border border-gray-4">
          <input
            type="checkbox"
            id="opsManagerToggle"
            checked={formData.marketing_approval_by_ops_manager}
            onChange={(e) => setFormData({ ...formData, marketing_approval_by_ops_manager: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-gray-5 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <label htmlFor="opsManagerToggle" className="cursor-pointer font-bold text-gray-12 block">
              Ops Manager Marketing Approvals
            </label>
            <p className="text-xs text-gray-9 mt-1 leading-relaxed">
              When ON, the Operations Manager can also approve/reject 'Awaiting Approval' tasks created by Marketing employees. When OFF, only Super Admins can process these.
            </p>
          </div>
        </div>

        {/* Setting 2 - Pre-existing */}
        <div className="flex items-start gap-3 bg-gray-2 p-4 rounded-xl border border-gray-4">
          <input
            type="checkbox"
            id="selfApproveToggle"
            checked={formData.sales_self_approve_expenses}
            onChange={(e) => setFormData({ ...formData, sales_self_approve_expenses: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-gray-5 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <label htmlFor="selfApproveToggle" className="cursor-pointer font-bold text-gray-12 block">
              Sales Expenses Self-Approval
            </label>
            <p className="text-xs text-gray-9 mt-1 leading-relaxed">
              When ON, sales employees can instantly approve their own daily expenses and bypass the Pending Expense queue required by Heads/Admins.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
