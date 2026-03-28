import { FieldBox } from "./FieldBox";

const ManagementSection = ({
  isEditing,
  isHr,
  isHead,
  formData,
  handlers,
  topologyData,
  taskLoggedByName,
}) => {
  const { handleDeptChange, handleSubDeptChange, handleAssigneeChange } =
    handlers;
  const { uniqueDepts, uniqueSubDepts, filteredEmployees } = topologyData;

  // Level 3 Access: Only HR can change Dept/Sub-Dept
  const canEditOrg = isHr;
  // Level 2 Access: HR and Heads can change the Assignee
  const canEditAssignee = isHr || isHead;

  return (
    <div className="grid grid-cols-2 gap-4 bg-gray-3/50 p-4 rounded-xl border border-gray-4 border-dashed">
      <div className="col-span-2 text-xs font-bold uppercase tracking-wider mb-[-8px]">
        Management Details
      </div>

      {/* 1. Department */}
      <FieldBox label="Department" isEditing={isEditing}>
        {isEditing ? (
          <select
            value={formData.department}
            onChange={handleDeptChange}
            disabled={!canEditOrg}
            className="w-full bg-transparent px-3 py-2 outline-none text-sm text-gray-12 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="" disabled>
              Select...
            </option>
            {uniqueDepts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        ) : (
          <p className="px-3 text-sm font-semibold text-gray-12">
            {formData.department || "N/A"}
          </p>
        )}
      </FieldBox>

      {/* 2. Sub-Department */}
      <FieldBox label="Sub-Department" isEditing={isEditing}>
        {isEditing ? (
          <select
            value={formData.subDepartment}
            onChange={handleSubDeptChange}
            disabled={!canEditOrg || !formData.department}
            className="w-full bg-transparent px-3 py-2 outline-none text-sm text-gray-12 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="" disabled>
              Select...
            </option>
            {uniqueSubDepts.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <p className="px-3 text-sm font-semibold text-gray-12">
            {formData.subDepartment || "N/A"}
          </p>
        )}
      </FieldBox>

      {/* 3. Assignee */}
      <div className="col-span-2">
        <FieldBox label="Employee (Assignee)" isEditing={isEditing}>
          {isEditing ? (
            <select
              name="loggedById"
              value={formData.loggedById}
              onChange={handleAssigneeChange}
              disabled={!canEditAssignee || (!formData.subDepartment && isHr)}
              className="w-full bg-transparent px-3 py-2 outline-none text-sm text-gray-12 font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="" disabled>
                Select Employee...
              </option>
              {filteredEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="px-3 text-sm font-bold text-gray-12">
              {taskLoggedByName}
            </p>
          )}
        </FieldBox>
      </div>
    </div>
  );
};

export default ManagementSection;
