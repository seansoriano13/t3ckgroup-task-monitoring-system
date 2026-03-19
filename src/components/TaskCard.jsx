import { AlertCircle } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { ArrowRight, PencilLine } from "lucide-react";

export default function TaskCard({ task, onView, onEdit }) {
  // 🔥 Dynamic styling for the Priority badge
  const priorityStyles = {
    HIGH: "text-red-11 bg-red-a3 border-red-a5",
    MEDIUM: "text-amber-100 bg-amber-500/10 border-amber-500/20",
    LOW: "text-gray-10 bg-gray-3 border-gray-4",
  };

  const currentPriorityStyle = priorityStyles[task.priority] || priorityStyles.LOW;

  return (
    <div className="bg-gray-2 shadow-lg p-5 rounded-xl grid gap-4 border border-gray-4 hover:border-gray-6 transition-all duration-300 group flex flex-col h-full">
      
      {/* Top Row: Category, Priority & Status */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex flex-wrap gap-2">
          {/* Category Badge */}
          <span className="text-xs font-bold text-gray-11 bg-gray-3 px-2 py-1 rounded border border-gray-4">
            {task.categoryId}
          </span>
          
          {/* Priority Badge */}
          <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${currentPriorityStyle}`}>
            {task.priority === "HIGH" && <AlertCircle size={12} />}
            {task.priority}
          </span>
        </div>
        
        {/* Status Badge */}
        <StatusBadge status={task.status} />
      </div>

      {/* Main Content */}
      <p className="font-semibold text-gray-12 line-clamp-2 leading-relaxed flex-1">
        {task.taskDescription}
      </p>

      {/* Bottom Row: Actions */}
      <div className="flex justify-between items-center pt-3 border-t border-gray-3 mt-auto">
        {/* Only show Edit if the prop is passed AND the task isn't complete/verified */}
        <div className="flex-1">
          {onEdit && task.status !== "COMPLETE" && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevents triggering other click events
                onEdit();
              }}
              className="text-gray-9 hover:text-gray-12 transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
            >
              <PencilLine size={14} />
              Edit
            </button>
          )}
        </div>

        <button
          onClick={onView}
          className="flex text-primary font-bold items-center gap-2 text-sm group-hover:text-primary-hover transition-colors"
        >
          View Task
          <ArrowRight
            size={16}
            className="transform group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>
    </div>
  );
}
