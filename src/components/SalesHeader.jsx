import { X, MessageCircle } from "lucide-react";

const SalesHeader = ({ onClose, onOpenChat }) => (
  <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-card shrink-0">
    <h2 className="text-xl font-extrabold tracking-tight text-foreground">
      Sales Activity Details
    </h2>
    <div className="flex items-center gap-2">
      {onOpenChat && (
        <button
          onClick={onOpenChat}
          title="Open Conversation"
          className="h-9 w-9 flex items-center justify-center rounded-xl text-[color:var(--violet-10)] bg-[color:var(--violet-2)] hover:bg-[color:var(--violet-3)] transition-all active:scale-95 border border-indigo-100"
        >
          <MessageCircle size={18} />
        </button>
      )}
      <button
        onClick={onClose}
        className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95 border border-transparent hover:border-border"
      >
        <X size={18} />
      </button>
    </div>
  </div>
);

export default SalesHeader;
