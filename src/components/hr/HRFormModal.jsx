import { Dialog, DialogContent } from "../ui/dialog";
import { XSquare } from "lucide-react";
import Spinner from "@/components/ui/Spinner";

/**
 * A reusable modal wrapper for HR management forms (Employees, Categories, etc.)
 */
export default function HRFormModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor = "text-violet-9",
  formId,
  isPending,
  submitLabel = "Save Changes",
  children,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 p-0 gap-0 z-[70] shadow-[0_10px_40px_-10px_rgba(79,70,229,0.15)] flex flex-col transition-all duration-300 w-[680px] sm:max-w-none max-w-[95vw] rounded-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              {Icon && <Icon size={20} className={iconColor} />}
              {title}
            </h2>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
          >
            <XSquare size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3.5 bg-muted hover:bg-muted/70 text-foreground font-black rounded-2xl transition-all text-[11px] uppercase tracking-widest active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            disabled={isPending}
            className="px-10 py-3.5 bg-primary hover:bg-primary-hover text-primary-foreground font-black rounded-2xl transition-all shadow-xl shadow-primary/20 disabled:opacity-50 text-[11px] uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
          >
            {isPending ? <Spinner size="sm" /> : null}
            {isPending ? "Saving..." : submitLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
