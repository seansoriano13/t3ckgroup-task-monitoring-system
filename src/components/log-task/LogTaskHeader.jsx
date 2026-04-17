import { Maximize2, X, ChevronDown } from "lucide-react";

export default function LogTaskHeader({ user, isExpanded, onToggleExpand, onClose }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-gray-3/40 shrink-0">
      <div className="flex items-center gap-2 text-xs text-gray-8">
        <div className="w-[18px] h-[18px] rounded flex items-center justify-center bg-primary text-white font-bold text-[9px] shrink-0">
          {user?.department?.charAt(0)?.toUpperCase() || "T"}
        </div>
        <ChevronDown size={11} className="text-gray-6 rotate-[-90deg]" />
        <span className="font-medium text-gray-10">New Task</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleExpand}
          className="p-1.5 rounded-md text-gray-8 hover:text-gray-12 hover:bg-gray-3 transition-colors"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <Maximize2 size={14} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md text-gray-8 hover:text-gray-12 hover:bg-gray-3 transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
