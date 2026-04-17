import { ShieldCheck } from "lucide-react";
import { X } from "lucide-react";

const TaskHeader = ({ isEditing, isHrVerified, onClose }) => (
  <div className="flex justify-between items-center p-6 border-b border-gray-4 bg-gray-1 shrink-0">
    <div className="flex items-center gap-3">
      <h2 className="text-xl font-black text-gray-12">
        {isEditing ? "Edit Task Details" : "Task Details"}
      </h2>
      {!isEditing && isHrVerified && (
        <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 uppercase tracking-wider">
          <ShieldCheck size={12} /> HR Verified
        </span>
      )}
    </div>
    <button
      onClick={onClose}
      className="h-8 w-8 flex-center rounded-full text-gray-9 hover:bg-gray-3 hover:text-red-9 transition-colors"
    >
      <X size={20} />
    </button>
  </div>
);

export default TaskHeader;
