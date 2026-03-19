import { AlertCircle } from "lucide-react";
import { formatDate } from "../utils/formatDate";
import { FieldBox } from "./FieldBox";
import StatusBadge from "./StatusBadge";

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
        <FieldBox label="Project Category" isEditing={isEditing}>
          {isEditing ? (
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              disabled={!formData.loggedById && isManagement}
              className="w-full bg-transparent px-3 py-2 outline-none text-sm text-gray-12 cursor-pointer disabled:opacity-50"
            >
              <option value="" disabled>
                {isLoadingTop ? "Loading..." : "Select Category"}
              </option>
              {filteredCategories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_id}
                </option>
              ))}
            </select>
          ) : (
            <span className="mx-3 text-xs font-bold text-gray-11 bg-gray-3 px-2 py-1 rounded border border-gray-4">
              {task.categoryId}
            </span>
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
              <option value="REJECTED">REJECTED</option>
            </select>
          ) : (
            <div className="px-3">
              <StatusBadge status={task.status} />
            </div>
          )}
        </FieldBox>
        {!isEditing && (
          <FieldBox label="Created At" isEditing={false}>
            <p className="px-3 text-sm font-semibold text-gray-11">
              {formatDate(task.createdAt)}
            </p>
          </FieldBox>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FieldBox label="Start Time" isEditing={isEditing}>
          {isEditing ? (
            <input
              type="datetime-local"
              name="startAt"
              value={formData.startAt}
              onChange={handleChange}
              className="w-full bg-transparent px-3 py-2 outline-none text-sm text-gray-12 [color-scheme:dark]"
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
