import { useState, memo } from "react";
import {
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Clock,
  CheckCircle2,
  TriangleAlert,
} from "lucide-react";
import Dot from "./ui/Dot";
import StatusBadge from "./StatusBadge";
import ChecklistTaskRenderer from "./ChecklistTaskRenderer";
import { useAuth } from "../context/AuthContext";
import { TASK_STATUS } from "../constants/status";
import Avatar from "./Avatar";
import { useEmployeeAvatarMap } from "../hooks/useEmployeeAvatarMap";
import HighlightText from "./HighlightText";

const getRelativeTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "just now";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const TaskCard = memo(({ task, onView, onSilentUpdate, searchTerm }) => {
  const { user } = useAuth();
  const avatarMap = useEmployeeAvatarMap();
  const [isExpanded, setIsExpanded] = useState(false);

  const isHr =
    user?.is_hr === true ||
    user?.isHr === true ||
    user?.is_super_admin === true ||
    user?.isSuperAdmin === true;
  const isHead = user?.is_head === true || user?.isHead === true;
  const isManagement = isHr || isHead;

  // Overdue nudge: INCOMPLETE task whose deadline has passed, shown only to owner
  const isOwnerOverdue =
    !isManagement &&
    task.status === TASK_STATUS.INCOMPLETE &&
    task.endAt &&
    new Date(task.endAt) < new Date() &&
    user?.id === task.loggedById;

  let isChecklistFormat = false;
  let totalItems = 0;
  let checkedItems = 0;
  let parsedDesc = null;

  if (task.taskDescription) {
    const trimmed =
      typeof task.taskDescription === "string"
        ? task.taskDescription.trim()
        : "";
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        parsedDesc = JSON.parse(trimmed);
        if (Array.isArray(parsedDesc)) {
          isChecklistFormat = true;
          totalItems = parsedDesc.length;
          checkedItems = parsedDesc.filter(
            (item) => item && typeof item === "object" && item.checked,
          ).length;
        }
      } catch (e) {}
    } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        parsedDesc = JSON.parse(trimmed);
        if (parsedDesc && Array.isArray(parsedDesc.items)) {
          isChecklistFormat = true;
          totalItems = parsedDesc.items.length;
          checkedItems = parsedDesc.items.filter(
            (item) => item && typeof item === "object" && item.checked,
          ).length;
        }
      } catch (e) {}
    } else if (Array.isArray(task.taskDescription)) {
      isChecklistFormat = true;
      parsedDesc = task.taskDescription;
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

  let displayTitle = "";
  let displaySnippet = "";

  if (!isChecklistFormat) {
    const text = task.taskDescription || "";
    const parts = text.split("\n");
    displayTitle = parts[0];
    displaySnippet = parts.slice(1).join("\n").trim();
  } else {
    displayTitle = parsedDesc?.title || "Checklist Task";
    displaySnippet = isExpanded
      ? ""
      : `${checkedItems} / ${totalItems} completed`;
  }

  return (
    <div
      onClick={onView}
      className={`bg-card p-5 rounded-2xl border shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full cursor-pointer relative ${
        isOwnerOverdue
          ? "border-amber-500/40 ring-1 ring-amber-500/20"
          : "border-border"
      }`}
    >
      {/* Row 1: The Eyebrow (Context) */}
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex items-center gap-2 truncate mr-2">
          <div
            className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold truncate"
            title={
              task.categoryId ? task.categoryId.replace(" TASK", "") : "TASK"
            }
          >
            {task.categoryId ? task.categoryId.replace(" TASK", "") : "TASK"}
          </div>
          {task.createdAt && (
            <>
              <span className="text-mauve-7 text-[10px]">•</span>
              <div
                className="text-[10px] text-muted-foreground font-medium tracking-wider whitespace-nowrap flex items-center gap-1"
                title={new Date(task.createdAt).toLocaleString()}
              >
                <Clock size={10} className="shrink-0" />
                {getRelativeTime(task.createdAt)}
              </div>
            </>
          )}
        </div>
        <div className="shrink-0">
          <StatusBadge status={task.status} />
        </div>
      </div>

      {/* Row 2: The Core (Action) */}
      <div className="flex-1">
        <h3 className="font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          <HighlightText text={displayTitle} search={searchTerm} />
        </h3>

        {displaySnippet && !isExpanded && (
          <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">
            <HighlightText text={displaySnippet} search={searchTerm} />
          </p>
        )}

        {/* Expanded Checklist */}
        {isChecklistFormat && isExpanded && (
          <div
            className="mt-4 pt-4 border-t border-mauve-3"
            onClick={(e) => e.stopPropagation()}
          >
            <ChecklistTaskRenderer
              description={task.taskDescription}
              isOwner={isOwner}
              disabled={!isOwner || task.status === TASK_STATUS.COMPLETE}
              onInlineCheck={handleInlineCheck}
              searchTerm={searchTerm}
            />
          </div>
        )}
      </div>

      {/* Row 3: The Footer (Metadata) */}
      <div className="mt-5 pt-4 flex items-center gap-2 overflow-hidden text-xs text-muted-foreground w-full border-t border-mauve-3">
        {isManagement && task.loggedByName && (
          <div
            className="flex items-center gap-1.5 shrink-0"
            title={task.loggedByName}
          >
            <Avatar
              name={task.loggedByName}
              src={avatarMap.get(task.loggedById) || task.loggedByAvatar}
              size="xs"
              className="shadow-inner bg-mauve-2 text-mauve-10 border-mauve-4"
            />
            <span className="truncate max-w-[80px] font-semibold text-foreground/80">
              {task.loggedByName}
            </span>
          </div>
        )}

        {isManagement && task.loggedByName && task.projectTitle && (
          <span className="shrink-0 text-mauve-7">•</span>
        )}

        {task.projectTitle && (
          <div
            className="flex items-center gap-1.5 overflow-hidden shrink min-w-0"
            title={task.projectTitle}
          >
            <FolderKanban
              size={13}
              className="text-muted-foreground shrink-0"
            />
            <span className="truncate font-semibold text-foreground/80">
              {task.projectTitle}
            </span>
          </div>
        )}

        {((isManagement && task.loggedByName) || task.projectTitle) &&
          task.priority && <span className="shrink-0 text-mauve-7">•</span>}

        {task.priority && (
          <div className="flex items-center gap-1.5 shrink-0 font-bold text-[10px] uppercase tracking-wider">
            {task.priority === "HIGH" && (
              <Dot
                color="bg-destructive"
                className="shadow-[0_0_8px_rgba(239,68,68,0.4)]"
              />
            )}
            {task.priority === "MEDIUM" && (
              <Dot
                color="bg-warning"
                className="shadow-[0_0_8px_rgba(245,158,11,0.4)]"
              />
            )}
            {task.priority === "LOW" && <Dot />}
            <span
              className={
                task.priority === "HIGH"
                  ? "text-destructive"
                  : task.priority === "MEDIUM"
                    ? "text-amber-10"
                    : "text-muted-foreground"
              }
            >
              {task.priority}
            </span>
          </div>
        )}

        {task.status === TASK_STATUS.COMPLETE && (
          <>
            <span className="shrink-0 text-mauve-7">•</span>
            <div
              className="flex items-center gap-1 shrink-0"
              title={
                task.hrVerified ? "Verified by HR" : "Pending HR Verification"
              }
            >
              {task.hrVerified ? (
                <CheckCircle2 size={12} className="text-green-9" />
              ) : (
                <Clock size={12} className="text-[color:var(--amber-9)]" />
              )}
            </div>
          </>
        )}

        {/* Expand/Collapse Checklist */}
        {isChecklistFormat && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="ml-auto text-muted-foreground hover:text-black cursor-pointer hover:scale-110 transition-all duration-300 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shrink-0"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        )}
      </div>
      {/* Overdue nudge strip — only for the task owner */}
      {isOwnerOverdue && (
        <div className="mt-4 -mx-5 -mb-5 px-4 py-2.5 bg-amber-500/10 border-t border-amber-500/25 rounded-b-2xl flex items-center gap-2">
          <TriangleAlert size={12} className="text-amber-500 shrink-0" />
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Overdue — mark as done to submit for review
          </span>
        </div>
      )}
    </div>
  );
});

export default TaskCard;
