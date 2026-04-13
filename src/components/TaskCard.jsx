import { useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  User
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import { ArrowRight, PencilLine } from "lucide-react";
import { Clock } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import ChecklistTaskRenderer from "./ChecklistTaskRenderer";
import { useAuth } from "../context/AuthContext";
import { formatTaskPreview } from "../utils/taskFormatters";
import { TASK_STATUS } from "../constants/status";

export default function TaskCard({ task, onView, onEdit, onSilentUpdate }) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const isHr =
    user?.is_hr === true ||
    user?.isHr === true ||
    user?.is_super_admin === true ||
    user?.isSuperAdmin === true;
  const isHead = user?.is_head === true || user?.isHead === true;
  const isManagement = isHr || isHead;

  // 🔥 Dynamic styling for the Priority badge
  const priorityStyles = {
    HIGH: "text-red-11 bg-red-a3 border-red-a5",
    MEDIUM: "text-amber-700 bg-amber-500/10 border-amber-500/20",
    LOW: "text-gray-10 bg-gray-3 border-gray-4",
  };

  const currentPriorityStyle =
    priorityStyles[task.priority] || priorityStyles.LOW;

  let isChecklistFormat = false;
  let totalItems = 0;
  let checkedItems = 0;

  if (task.taskDescription) {
    const trimmed =
      typeof task.taskDescription === "string"
        ? task.taskDescription.trim()
        : "";
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          isChecklistFormat = true;
          totalItems = parsed.length;
          checkedItems = parsed.filter(
            (item) => item && typeof item === "object" && item.checked,
          ).length;
        }
      } catch (e) {
        console.error(e);
      }
    } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && Array.isArray(parsed.items)) {
          isChecklistFormat = true;
          totalItems = parsed.items.length;
          checkedItems = parsed.items.filter(
            (item) => item && typeof item === "object" && item.checked,
          ).length;
        }
      } catch (e) {
        console.error(e);
      }
    } else if (Array.isArray(task.taskDescription)) {
      isChecklistFormat = true;
      totalItems = task.taskDescription.length;
      checkedItems = task.taskDescription.filter(
        (item) => item && typeof item === "object" && item.checked,
      ).length;
    }
  }

  const isOwner = user?.id === task.loggedById;

  const handleInlineCheck = (newDesc) => {
    if (onSilentUpdate) {
      onSilentUpdate({
        id: task.id,
        taskDescription: newDesc,
        editedBy: user?.id,
      });
    }
  };

  return (
    <div className="bg-gray-2 shadow-lg p-5 rounded-xl gap-4 border border-gray-4 hover:border-gray-6 transition-all duration-300 group flex flex-col">
      {/* Top Row: Category, Priority & Status */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Employee Name (Visible to Management) */}
          {isManagement && task.loggedByName && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border text-blue-500 bg-blue-500/10 border-blue-500/20 max-w-[140px] truncate" title={task.loggedByName}>
              <User size={10} className="shrink-0" />
              <span className="truncate">{task.loggedByName}</span>
            </span>
          )}

          {/* Category Badge */}
          <span className="text-xs font-bold text-gray-11 bg-gray-3 px-2 py-1 rounded border border-gray-4">
            {task.categoryId}
          </span>

          {/* Project Title Badge */}
          {task.projectTitle && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border text-violet-400 bg-violet-500/10 border-violet-500/20 max-w-[180px] truncate">
              <FolderKanban size={10} className="shrink-0" />
              <span className="truncate">{task.projectTitle}</span>
            </span>
          )}

          {/* Priority Badge */}
          <span
            className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${currentPriorityStyle}`}
          >
            {task.priority === "HIGH" && <AlertCircle size={12} />}
            {task.priority}
          </span>

          {/* 🔥 HR VERIFICATION BADGE (Only shows when Manager has approved it) */}
          {task.status === TASK_STATUS.COMPLETE && (
            <span
              className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                task.hrVerified
                  ? "text-green-600 bg-green-500/10 border-green-500/20"
                  : "text-amber-600 bg-amber-500/10 border-amber-500/20"
              }`}
            >
              {task.hrVerified ? (
                <CheckCircle2 size={12} />
              ) : (
                <Clock size={12} />
              )}
            </span>
          )}

          {/* Checklist Progress Badge */}
          {isChecklistFormat && totalItems > 0 && (
            <span
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {checkedItems}/{totalItems} Done
            </span>
          )}
        </div>

        {/* Status Badge */}
        <StatusBadge status={task.status} />
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-3">
        {(!isChecklistFormat || !isExpanded) && (
          <p className="font-semibold text-gray-12 line-clamp-2 leading-relaxed mt-4">
            {formatTaskPreview(task.taskDescription)}
          </p>
        )}

        {isChecklistFormat && isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-3">
            <ChecklistTaskRenderer
              description={task.taskDescription}
              isOwner={isOwner}
              disabled={!isOwner || task.status === TASK_STATUS.COMPLETE}
              onInlineCheck={handleInlineCheck}
            />
          </div>
        )}
      </div>

      {/* Bottom Row: Actions */}
      <div className="flex justify-between items-center pt-3 border-t border-gray-3 mt-auto">
        <div className="flex gap-3 items-center flex-1">
          {onEdit && task.status !== TASK_STATUS.COMPLETE && (
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

          {isChecklistFormat && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-gray-9 hover:text-gray-12 transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isExpanded ? "Collapse" : "Expand"}
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
