import { ShieldCheck } from "lucide-react";
import { X } from "lucide-react";

const TaskHeader = ({ isEditing, isHrVerified, onClose }) => (
  <div className="flex justify-between items-center p-6 border-b border-border bg-card shrink-0">
    <div className="flex items-center gap-3">
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
        {isEditing ? "Edit Task" : "Task Details"}
      </h2>
      {!isEditing && isHrVerified && (
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200 uppercase tracking-widest">
          <ShieldCheck size={12} /> Verified
        </span>
      )}
    </div>
    <button
      onClick={onClose}
      className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-muted hover:text-foreground transition-all active:scale-95 border border-transparent hover:border-border"
    >
      <X size={20} />
    </button>
  </div>
);

export default TaskHeader;
