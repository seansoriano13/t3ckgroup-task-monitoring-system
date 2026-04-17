import { Bell, Moon, Sun, LogOut, Shield, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../services/salesService";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  const isHr = user?.is_hr === true || user?.isHr === true;
  const isSuperAdmin = user?.isSuperAdmin;

  const { data: appSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => salesService.getAppSettings(),
    enabled: !!isSuperAdmin,
  });

  const mutation = useMutation({
    mutationFn: (payload) =>
      salesService.updateAppSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      toast.success("Security configuration updated system-wide!");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-12">Settings</h1>
        <p className="text-gray-9 mt-1">Configure your portal experience.</p>
      </div>

      <div className="space-y-6">
        {/* PREFERENCES SECTION */}
        <div className="bg-gray-2 border border-gray-4 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-5 border-b border-gray-3 bg-gray-1">
            <h2 className="text-sm font-bold text-gray-10 uppercase tracking-wider">
              App Preferences
            </h2>
          </div>

          <div className="divide-y divide-gray-3">
            {/* Theme Toggle */}
            <div className="p-5 flex items-center justify-between hover:bg-gray-1/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-gray-9">
                  {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <p className="font-bold text-gray-12">Theme Mode</p>
                  <p className="text-sm text-gray-9">
                    Toggle between light and dark themes.
                  </p>
                </div>
              </div>
              {/* Actual Toggle Switch */}
              <div
                onClick={toggleTheme}
                className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${theme === "dark" ? "bg-primary" : "bg-gray-4"
                  }`}
              >
                <div
                  className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${theme === "dark" ? "right-1" : "left-1"
                    }`}
                ></div>
              </div>
            </div>

            {/* Mock Toggle 2 */}
            <div className="p-5 flex items-center justify-between hover:bg-gray-1/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-gray-9">
                  <Bell size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-12">Email Notifications</p>
                  <p className="text-sm text-gray-9">
                    Get alerted when a manager reviews your task.
                  </p>
                </div>
              </div>
              {/* Fake Toggle Switch - Off */}
              <div className="w-11 h-6 bg-gray-4 rounded-full relative cursor-pointer">
                <div className="absolute left-1 top-1 bg-gray-8 w-4 h-4 rounded-full transition-all"></div>
              </div>
            </div>
          </div>
        </div>

        {/* SUPER ADMIN SECURITY SYSTEM ZONE */}
        {isSuperAdmin && (
          <div className="bg-gray-2 border border-primary/30 rounded-2xl shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="p-5 border-b border-gray-3 bg-gray-1 flex items-center gap-2 relative z-10">
              <Shield size={16} className="text-primary" />
              <h2 className="text-sm font-bold text-gray-12 uppercase tracking-wider">
                Customization
              </h2>
            </div>
            <div className="p-5 flex items-center justify-between hover:bg-gray-1/50 transition-colors relative z-10">
              <div className="flex items-center gap-4">
                <div className="text-gray-9">
                  <Shield
                    size={20}
                    className={
                      appSettings?.require_revenue_verification
                        ? "text-primary"
                        : ""
                    }
                  />
                </div>
                <div>
                  <p className="font-bold text-gray-12">
                    Enforce Sales Logging Verification
                  </p>
                  <p className="text-sm text-gray-9 max-w-sm">
                    Toggle whether sales personnel require an active Super Admin
                    verification stamp upon logging sales before it affects
                    metrics.
                  </p>
                </div>
              </div>
              {/* Custom Magician Toggle Switch */}
              {loadingSettings ? (
                <Loader2 size={16} className="animate-spin text-gray-9" />
              ) : (
                <div
                  onClick={() =>
                    !mutation.isPending &&
                    mutation.mutate({ require_revenue_verification: !appSettings?.require_revenue_verification })
                  }
                  className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${appSettings?.require_revenue_verification
                      ? "bg-primary"
                      : "bg-gray-4"
                    } ${mutation.isPending && "opacity-50 cursor-not-allowed"}`}
                >
                  <div
                    className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${appSettings?.require_revenue_verification
                        ? "right-1"
                        : "left-1"
                      }`}
                  ></div>
                </div>
              )}
            </div>

            {/* Sales Expense Self-Approval Toggle */}
            <div className="p-5 flex items-center justify-between hover:bg-gray-1/50 transition-colors relative z-10 border-t border-gray-3">
              <div className="flex items-center gap-4">
                <div className="text-gray-9">
                  <Shield
                    size={20}
                    className={
                      appSettings?.sales_self_approve_expenses
                        ? "text-primary"
                        : ""
                    }
                  />
                </div>
                <div>
                  <p className="font-bold text-gray-12">
                    Enable Sales Self-Approval
                  </p>
                  <p className="text-sm text-gray-9 max-w-sm">
                    Allow sales personnel to self-approve mapped activities that contain financial expenses (bypassing the Head Queue).
                  </p>
                </div>
              </div>
              {loadingSettings ? (
                <Loader2 size={16} className="animate-spin text-gray-9" />
              ) : (
                <div
                  onClick={() =>
                    !mutation.isPending &&
                    mutation.mutate({ sales_self_approve_expenses: !appSettings?.sales_self_approve_expenses })
                  }
                  className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${appSettings?.sales_self_approve_expenses
                      ? "bg-primary"
                      : "bg-gray-4"
                    } ${mutation.isPending && "opacity-50 cursor-not-allowed"}`}
                >
                  <div
                    className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${appSettings?.sales_self_approve_expenses
                        ? "right-1"
                        : "left-1"
                      }`}
                  ></div>
                </div>
              )}
            </div>

            {/* Ops Manager Marketing Approvals Toggle */}
            <div className="p-5 flex items-center justify-between hover:bg-gray-1/50 transition-colors relative z-10 border-t border-gray-3">
              <div className="flex items-center gap-4">
                <div className="text-gray-9">
                  <Shield
                    size={20}
                    className={
                      appSettings?.marketing_approval_by_ops_manager
                        ? "text-primary"
                        : ""
                    }
                  />
                </div>
                <div>
                  <p className="font-bold text-gray-12">
                    Ops Manager Marketing Approvals
                  </p>
                  <p className="text-sm text-gray-9 max-w-sm">
                    When ON, the Operations Manager can also approve/reject 'Awaiting Approval' tasks created by Marketing employees. When OFF, only Super Admins can process these.
                  </p>
                </div>
              </div>
              {loadingSettings ? (
                <Loader2 size={16} className="animate-spin text-gray-9" />
              ) : (
                <div
                  onClick={() =>
                    !mutation.isPending &&
                    mutation.mutate({ marketing_approval_by_ops_manager: !appSettings?.marketing_approval_by_ops_manager })
                  }
                  className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${appSettings?.marketing_approval_by_ops_manager
                      ? "bg-primary"
                      : "bg-gray-4"
                    } ${mutation.isPending && "opacity-50 cursor-not-allowed"}`}
                >
                  <div
                    className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${appSettings?.marketing_approval_by_ops_manager
                        ? "right-1"
                        : "left-1"
                      }`}
                  ></div>
                </div>
              )}
            </div>

            {/* Universal Task Submission Toggle */}
            <div className="p-5 flex items-center justify-between hover:bg-gray-1/50 transition-colors relative z-10 border-t border-gray-3">
              <div className="flex items-center gap-4">
                <div className="text-gray-9">
                  <Shield
                    size={20}
                    className={
                      appSettings?.universal_task_submission
                        ? "text-primary"
                        : ""
                    }
                  />
                </div>
                <div>
                  <p className="font-bold text-gray-12">
                    Universal Task Submission (Beta)
                  </p>
                  <p className="text-sm text-gray-9 max-w-sm">
                    When ON, all employees (not just Marketing) can explicitly submit tasks for manager review before approval. Currently in proposal — enable only after team alignment.
                  </p>
                </div>
              </div>
              {loadingSettings ? (
                <Loader2 size={16} className="animate-spin text-gray-9" />
              ) : (
                <div
                  onClick={() =>
                    !mutation.isPending &&
                    mutation.mutate({ universal_task_submission: !appSettings?.universal_task_submission })
                  }
                  className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${appSettings?.universal_task_submission
                      ? "bg-primary"
                      : "bg-gray-4"
                    } ${mutation.isPending && "opacity-50 cursor-not-allowed"}`}
                >
                  <div
                    className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${appSettings?.universal_task_submission
                        ? "right-1"
                        : "left-1"
                      }`}
                  ></div>
                </div>
              )}
            </div>

            {/* Enable Self-Verification Toggle */}
            <div className="p-5 flex items-center justify-between hover:bg-gray-1/50 transition-colors relative z-10 border-t border-gray-3">
              <div className="flex items-center gap-4">
                <div className="text-gray-9">
                  <Shield
                    size={20}
                    className={
                      appSettings?.enable_self_verification
                        ? "text-primary"
                        : ""
                    }
                  />
                </div>
                <div>
                  <p className="font-bold text-gray-12">
                    Enable Task Self-Verification
                  </p>
                  <p className="text-sm text-gray-9 max-w-sm">
                    Allow employees to self-verify their own tasks if a manager has not responded after 48 hours. These will be flagged for HR audit.
                  </p>
                </div>
              </div>
              {loadingSettings ? (
                <Loader2 size={16} className="animate-spin text-gray-9" />
              ) : (
                <div
                  onClick={() =>
                    !mutation.isPending &&
                    mutation.mutate({ enable_self_verification: !appSettings?.enable_self_verification })
                  }
                  className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${appSettings?.enable_self_verification
                      ? "bg-primary"
                      : "bg-gray-4"
                    } ${mutation.isPending && "opacity-50 cursor-not-allowed"}`}
                >
                  <div
                    className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${appSettings?.enable_self_verification
                        ? "right-1"
                        : "left-1"
                      }`}
                  ></div>
                </div>
              )}
            </div>

            {/* Enable Bulk Approval Toggle */}
            <div className="p-5 flex items-center justify-between hover:bg-gray-1/50 transition-colors relative z-10 border-t border-gray-3">
              <div className="flex items-center gap-4">
                <div className="text-gray-9">
                  <Shield
                    size={20}
                    className={
                      appSettings?.enable_bulk_approval
                        ? "text-primary"
                        : ""
                    }
                  />
                </div>
                <div>
                  <p className="font-bold text-gray-12">
                    Enable Manager Bulk Approval
                  </p>
                  <p className="text-sm text-gray-9 max-w-sm">
                    Allow Super Admins to bulk-approve delayed pending tasks to clear bottlenecks.
                  </p>
                </div>
              </div>
              {loadingSettings ? (
                <Loader2 size={16} className="animate-spin text-gray-9" />
              ) : (
                <div
                  onClick={() =>
                    !mutation.isPending &&
                    mutation.mutate({ enable_bulk_approval: !appSettings?.enable_bulk_approval })
                  }
                  className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${appSettings?.enable_bulk_approval
                      ? "bg-primary"
                      : "bg-gray-4"
                    } ${mutation.isPending && "opacity-50 cursor-not-allowed"}`}
                >
                  <div
                    className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${appSettings?.enable_bulk_approval
                        ? "right-1"
                        : "left-1"
                      }`}
                  ></div>
                </div>
              )}
            </div>

            {/* Visual Shaming Toggle */}
            <div className="p-5 flex items-center justify-between hover:bg-gray-1/50 transition-colors relative z-10 border-t border-gray-3">
              <div className="flex items-center gap-4">
                <div className="text-gray-9">
                  <Shield
                    size={20}
                    className={
                      appSettings?.enable_visual_shaming
                        ? "text-primary"
                        : ""
                    }
                  />
                </div>
                <div>
                  <p className="font-bold text-gray-12">
                    Visual Urgency Indicators (Bottleneck Tracking)
                  </p>
                  <p className="text-sm text-gray-9 max-w-sm">
                    Highlight tasks waiting more than 48 hours for a manager with a "DELAYED" badge in the action queue.
                  </p>
                </div>
              </div>
              {loadingSettings ? (
                <Loader2 size={16} className="animate-spin text-gray-9" />
              ) : (
                <div
                  onClick={() =>
                    !mutation.isPending &&
                    mutation.mutate({ enable_visual_shaming: !appSettings?.enable_visual_shaming })
                  }
                  className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${appSettings?.enable_visual_shaming
                      ? "bg-primary"
                      : "bg-gray-4"
                    } ${mutation.isPending && "opacity-50 cursor-not-allowed"}`}
                >
                  <div
                    className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${appSettings?.enable_visual_shaming
                        ? "right-1"
                        : "left-1"
                      }`}
                  ></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DANGER ZONE SECTION */}
        <div className="bg-gray-2 border border-red-900/30 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-5 border-b border-gray-3 bg-gray-1 flex items-center gap-2">
            <h2 className="text-sm font-bold text-red-500 uppercase tracking-wider">
              Account Actions
            </h2>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-10 mb-4">
              Logging out will clear your current session. You will need to
              re-authenticate with your T3CKGROUP Google account to access the
              portal again.
            </p>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold bg-gray-3 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-gray-4 hover:border-red-500"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
