import { useQuery } from "@tanstack/react-query";
import { salesQuotaService } from "../../services/sales/salesQuotaService";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { PlusCircle, Edit3, CheckCircle2, User } from "lucide-react";
import Spinner from "@/components/ui/Spinner";

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
      <DialogContent className="max-w-md w-full p-0 bg-card shadow-2xl rounded-2xl border border-mauve-4 overflow-hidden">
        {/* Header */}
        <div className="bg-mauve-2 border-b border-mauve-3 p-5">
          <h2 className="text-lg font-black text-foreground tracking-tight">
            Quota History
          </h2>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Audit log for {employeeName}
          </p>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner size="md" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm font-medium">
                No history available for this quota.
              </p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border before:from-transparent before:via-slate-200 before:to-transparent">
              {logs.map((log) => {
                const isCreated = log.action === "CREATED";
                const isPublished = log.action === "PUBLISHED";

                let Icon = Edit3;
                let colorClass = "bg-[color:var(--blue-3)] text-[color:var(--blue-10)] border-[color:var(--blue-6)]";

                if (isCreated) {
                  Icon = PlusCircle;
                  colorClass = "bg-green-100 text-green-10 border-green-200";
                } else if (isPublished) {
                  Icon = CheckCircle2;
                  colorClass =
                    "bg-muted text-foreground border-mauve-5";
                }

                return (
                  <div
                    key={log.id}
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${colorClass} bg-card z-10`}
                    >
                      <Icon size={14} />
                    </div>

                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border border-mauve-5 bg-card shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            isCreated
                              ? "bg-green-50 text-green-10"
                              : isPublished
                                ? "bg-muted text-foreground"
                                : "bg-[color:var(--blue-2)] text-[color:var(--blue-10)]"
                          }`}
                        >
                          {log.action}
                        </span>
                        <time className="text-xs text-muted-foreground font-semibold">
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
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-mauve-4 text-muted-foreground overflow-hidden">
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
                        <span className="text-xs font-semibold text-foreground">
                          {log.changed_by_employee?.name || "System"}
                        </span>
                      </div>

                      <div className="text-sm font-medium text-foreground">
                        {log.old_amount && log.old_amount !== log.new_amount ? (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground line-through">
                              ₱{Number(log.old_amount).toLocaleString()}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-foreground font-bold">
                              ₱{Number(log.new_amount).toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-foreground font-bold">
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
