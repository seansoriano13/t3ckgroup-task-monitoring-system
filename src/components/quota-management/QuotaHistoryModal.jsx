import { useQuery } from "@tanstack/react-query";
import { salesQuotaService } from "../../services/sales/salesQuotaService";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Spinner from "@/components/ui/Spinner";
import Avatar from "../Avatar";
import HistoryTimeline from "../HistoryTimeline";

export default function QuotaHistoryModal({
  isOpen,
  onClose,
  quotaId,
  employeeName,
  employeeAvatar,
}) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["quotaHistory", quotaId],
    queryFn: () => salesQuotaService.getQuotaHistory(quotaId),
    enabled: !!quotaId && isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-full p-0 bg-card shadow-2xl rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="bg-muted/50 border-b border-border p-5 flex items-center gap-4">
          <Avatar name={employeeName} src={employeeAvatar} size="md" />
          <div>
            <h2 className="text-lg font-black text-foreground tracking-tight">
              Quota History
            </h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              Audit log for {employeeName}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <HistoryTimeline logs={logs} isLoading={isLoading} type="QUOTA" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
