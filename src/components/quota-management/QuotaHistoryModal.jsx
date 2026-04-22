import { useQuery } from "@tanstack/react-query";
import { salesQuotaService } from "../../services/sales/salesQuotaService";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { Loader2, PlusCircle, Edit3, CheckCircle2, User } from "lucide-react";

export default function QuotaHistoryModal({
  isOpen,
  onClose,
  quotaId,
  employeeName,
}) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["quotaHistory", quotaId],
    queryFn: () => salesQuotaService.getQuotaHistory(quotaId),
    enabled: !!quotaId && isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-0 bg-white shadow-2xl rounded-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 border-b border-gray-100 p-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">
            Quota History
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Audit log for {employeeName}
          </p>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-indigo-500" size={24} />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm font-medium">
                No history available for this quota.
              </p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {logs.map((log) => {
                const isCreated = log.action === "CREATED";
                const isPublished = log.action === "PUBLISHED";

                let Icon = Edit3;
                let colorClass = "bg-blue-100 text-blue-600 border-blue-200";

                if (isCreated) {
                  Icon = PlusCircle;
                  colorClass = "bg-green-100 text-green-600 border-green-200";
                } else if (isPublished) {
                  Icon = CheckCircle2;
                  colorClass =
                    "bg-indigo-100 text-indigo-600 border-indigo-200";
                }

                return (
                  <div
                    key={log.id}
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${colorClass} bg-white z-10`}
                    >
                      <Icon size={14} />
                    </div>

                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            isCreated
                              ? "bg-green-50 text-green-600"
                              : isPublished
                                ? "bg-indigo-50 text-indigo-600"
                                : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          {log.action}
                        </span>
                        <time className="text-xs text-slate-400 font-semibold">
                          {new Date(log.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </time>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 overflow-hidden">
                          {log.changed_by_employee?.avatar_path ? (
                            <img
                              src={log.changed_by_employee.avatar_path}
                              alt="avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={12} />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {log.changed_by_employee?.name || "System"}
                        </span>
                      </div>

                      <div className="text-sm font-medium text-slate-700">
                        {log.old_amount && log.old_amount !== log.new_amount ? (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 line-through">
                              ₱{Number(log.old_amount).toLocaleString()}
                            </span>
                            <span className="text-slate-300">→</span>
                            <span className="text-indigo-600 font-bold">
                              ₱{Number(log.new_amount).toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-indigo-600 font-bold">
                            ₱{Number(log.new_amount).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
