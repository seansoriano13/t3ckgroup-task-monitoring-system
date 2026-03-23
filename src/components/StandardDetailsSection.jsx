import { AlertCircle } from "lucide-react";
import { formatDate } from "../utils/formatDate";
import { FieldBox } from "./FieldBox";
import StatusBadge from "./StatusBadge";
import { Clock } from "lucide-react";
import { CheckCircle2 } from "lucide-react";

const StandardDetailsSection = ({
  isEditing,
  isManagement,
  formData,
  handleChange,
  topologyData,
  task,
}) => {
  const { filteredCategories, isLoadingTop } = topologyData;

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
                className="w-full bg-transparent px-3 py-2 outline-none text-sm text-gray-12 cursor-pointer disabled:opacity-50"
              >
                <option value="" disabled className="text-gray-8">
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
              <span className="text-xs font-bold text-gray-11 bg-gray-3 px-2 py-1.5 rounded-lg border border-gray-4 leading-relaxed inline-block">
                {task.categoryId}
                <span className="font-medium text-gray-10 ml-1">
                  {/* 🔥 THE BULLETPROOF LOOKUP */}-{" "}
                  {filteredCategories?.find(
                    (c) => c.category_id === task.categoryId,
                  )?.description || "Unknown Category"}
                </span>
              </span>
            </div>
          )}
        </FieldBox>
        <FieldBox label="Priority" isEditing={isEditing}>
          {isEditing ? (
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className={`w-full bg-transparent px-3 py-2 outline-none text-sm font-bold cursor-pointer ${formData.priority === "HIGH" ? "text-red-9" : "text-gray-12"}`}
            >
              <option value="LOW" className="text-gray-12">
                LOW
              </option>
              <option value="MEDIUM" className="text-gray-12">
                MEDIUM
              </option>
              <option value="HIGH" className="text-red-9">
                HIGH
              </option>
            </select>
          ) : (
            <p
              className={`px-3 text-sm font-bold flex items-center gap-1.5 ${task.priority === "HIGH" ? "text-red-9" : "text-gray-12"}`}
            >
              {task.priority === "HIGH" && <AlertCircle size={14} />}{" "}
              {task.priority || "NORMAL"}
            </p>
          )}
        </FieldBox>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FieldBox label="Status" isEditing={isEditing && isManagement}>
          {isEditing && isManagement ? (
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full bg-transparent px-3 py-2 outline-none text-sm font-bold text-gray-12 cursor-pointer"
            >
              <option value="INCOMPLETE">INCOMPLETE</option>
              <option value="COMPLETE">COMPLETE</option>
              <option value="NOT APPROVED">NOT APPROVED</option>
            </select>
          ) : (
            <div className="px-3">
              <StatusBadge status={task.status} />
            </div>
          )}
        </FieldBox>
        {/* {!isEditing && (
          <FieldBox label="Created At" isEditing={false}>
            <p className="px-3 text-sm font-semibold text-gray-11">
              {formatDate(task.createdAt)}
            </p>
          </FieldBox>
        )} */}
        {!isEditing && (
          <FieldBox label="HR Verification Status" isEditing={false}>
            <div className="px-3 flex items-center">
              {task.status !== "COMPLETE" ? (
                <span className="text-sm font-semibold text-gray-8">
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
            <input
              disabled
              type="datetime-local"
              name="startAt"
              value={formData.startAt}
              onChange={handleChange}
              className="min-h-[44px] w-full
                               bg-gray-1 border border-gray-4
                               focus:border-red-9 text-gray-12
                               rounded-lg px-3 outline-none transition-colors text-sm
                               [color-scheme:dark]

                               disabled:opacity-50
                               disabled:cursor-not-allowed
                               disabled:bg-gray-2
                               disabled:border-gray-3
                               disabled:text-gray-9
                             "
            />
          ) : (
            <p className="px-3 text-sm font-semibold text-gray-12">
              {formatDate(task.startAt)}
            </p>
          )}
        </FieldBox>
        <FieldBox label="End Time" isEditing={isEditing}>
          {isEditing ? (
            <input
              type="datetime-local"
              name="endAt"
              value={formData.endAt}
              onChange={handleChange}
              className="w-full bg-transparent px-3 py-2 outline-none text-sm text-gray-12 [color-scheme:dark]"
            />
          ) : (
            <p className="px-3 text-sm font-semibold text-gray-12">
              {formatDate(task.endAt)}
            </p>
          )}
        </FieldBox>
      </div>
    </>
  );
};

export default StandardDetailsSection;
