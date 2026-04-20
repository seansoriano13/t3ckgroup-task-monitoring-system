import { AlertCircle } from "lucide-react";
import { formatDate } from "../utils/formatDate";
import { extractOthersDetailsFromRemarks } from "../utils/taskFormatters";
import { FieldBox } from "./FieldBox";
import StatusBadge from "./StatusBadge";
import { TASK_STATUS } from "../constants/status";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import PriorityDropdown from "./dropdowns/PriorityDropdown";

const StandardDetailsSection = ({
  isEditing,
  isManagement,
  formData,
  handleChange,
  topologyData,
  task,
}) => {
  const { filteredCategories } = topologyData;
  const othersDetails = extractOthersDetailsFromRemarks(task?.remarks);
  const categoryDescription =
    filteredCategories?.find((c) => c.category_id === task.categoryId)
      ?.description || "Unknown Category";
  const categoryLabel = othersDetails || categoryDescription;



  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FieldBox label="Task Category" isEditing={isEditing}>
          {isEditing ? (
            <div className="w-full flex flex-col">
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                disabled={!formData.loggedById && isManagement}
                className="w-full bg-transparent px-3 py-2 outline-none text-sm text-foreground cursor-pointer disabled:opacity-50"
              >
                <option value="" disabled className="text-slate-400">
                  {topologyData?.isLoadingTop
                    ? "Loading..."
                    : !formData.loggedById && isManagement
                      ? "Select Assignee First"
                      : "Select Category..."}
                </option>
                {filteredCategories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.category_id} - {cat.description}
                  </option>
                ))}
              </select>

              {filteredCategories.length === 0 &&
                !topologyData?.isLoadingTop &&
                formData.loggedById && (
                  <p className="text-[10px] text-red-500 px-3 pb-2 font-bold leading-tight">
                    No categories mapped for this team.
                  </p>
                )}
            </div>
          ) : (
            <div className="mx-3 my-1.5 flex items-center">
              <span className="text-xs font-bold text-foreground bg-muted p-2 rounded-xl border border-border leading-relaxed inline-block">
                {task.categoryId}
                <span className="font-medium text-slate-400 ml-1">
                  - {categoryLabel}
                </span>
              </span>
            </div>
          )}
        </FieldBox>
        <FieldBox label="Priority" isEditing={isEditing}>
          {isEditing ? (
            <PriorityDropdown
              value={formData.priority}
              onChange={(val) =>
                handleChange({ target: { name: "priority", value: val } })
              }
              triggerClassName="w-full bg-transparent px-3 py-2 outline-none text-sm font-bold cursor-pointer flex items-center gap-2"
              customTrigger={({ isOpen, currentPriority }) => (
                <div className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${isOpen ? 'bg-muted/50' : 'hover:bg-muted/30'} cursor-pointer`}>
                  <div className={`flex items-center gap-2 ${currentPriority.value === 'HIGH' ? 'text-destructive' : currentPriority.value === 'MEDIUM' ? 'text-amber-600' : 'text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${currentPriority.dot}`} />
                    <span className="font-bold">{currentPriority.label}</span>
                  </div>
                  <ChevronDown size={14} className="text-slate-400" />
                </div>
              )}
            />
          ) : (
            <div
              className={`px-3 text-sm font-bold flex items-center gap-2 ${task.priority === "HIGH" ? "text-destructive" : task.priority === "MEDIUM" ? "text-amber-600" : "text-slate-400"}`}
            >
              <div className={`w-2 h-2 rounded-full ${task.priority === "HIGH" ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.4)]" : task.priority === "MEDIUM" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" : "bg-slate-300"} shrink-0`} />
              {task.priority || "LOW"}
            </div>
          )}
        </FieldBox>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FieldBox label="Status" isEditing={false}>
          <div className="px-3">
            <StatusBadge status={task.status} />
          </div>
        </FieldBox>
        {/* {!isEditing && (
          <FieldBox label="Created At" isEditing={false}>
            <p className="px-3 text-sm font-semibold text-muted-foreground">
              {formatDate(task.createdAt)}
            </p>
          </FieldBox>
        )} */}
        {!isEditing && (
          <FieldBox label="HR Verification Status" isEditing={false}>
            <div className="px-3 flex items-center">
              {task.status !== TASK_STATUS.COMPLETE ? (
                <span className="text-sm font-semibold text-slate-400">
                  N/A (Awaiting Manager)
                </span>
              ) : task.hrVerified ? (
                <span className="text-sm font-bold text-green-600 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Verified
                </span>
              ) : (
                <span className="text-sm font-bold text-amber-600 flex items-center gap-1.5">
                  <Clock size={16} /> Pending HR Audit
                </span>
              )}
            </div>
          </FieldBox>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FieldBox label="Start Time" isEditing={isEditing}>
          {isEditing ? (
            <Input
              disabled
              type="datetime-local"
              name="startAt"
              value={formData.startAt}
              onChange={handleChange}
              className="w-full h-11 pointer-events-none opacity-50"
            />
          ) : (
            <p className="px-3 text-sm font-semibold text-foreground">
              {formatDate(task.startAt)}
            </p>
          )}
        </FieldBox>
        <FieldBox label="End Time" isEditing={isEditing}>
          {isEditing ? (
            <Input
              type="datetime-local"
              name="endAt"
              value={formData.endAt}
              onChange={handleChange}
              className="w-full h-11"
            />
          ) : (
            <p className="px-3 text-sm font-semibold text-foreground">
              {formatDate(task.endAt)}
            </p>
          )}
        </FieldBox>
      </div>
    </>
  );
};

export default StandardDetailsSection;
