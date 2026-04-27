import { FieldBox } from "./FieldBox";
import { ClipboardList } from "lucide-react";

const ManagementSection = ({
  isEditing,
  isHr,
  isHead,
  formData,
  handlers,
  topologyData,
  taskLoggedByName,
  reportedToName,
}) => {
  const { handleDeptChange, handleSubDeptChange, handleAssigneeChange } =
    handlers;
  const { uniqueDepts, uniqueSubDepts, filteredEmployees } = topologyData;

  // Level 3 Access: Only HR can change Dept/Sub-Dept
  const canEditOrg = isHr;
  // Level 2 Access: HR and Heads can change the Assignee
  const canEditAssignee = isHr || isHead;

  return (
    <div className="grid grid-cols-2 gap-3 bg-muted/30 p-4 rounded-2xl border border-border">
      <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
        Management Details
      </div>

      {/* 1. Department */}
      <FieldBox label="Department" isEditing={isEditing}>
        {isEditing ? (
          <select
            value={formData.department}
            onChange={handleDeptChange}
            disabled={!canEditOrg}
            className="w-full bg-transparent px-3 py-2 outline-none text-sm text-foreground cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
          <p className="px-3 text-sm font-semibold text-foreground">
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
            className="w-full bg-transparent px-3 py-2 outline-none text-sm text-foreground cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
          <p className="px-3 text-sm font-semibold text-foreground">
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
              className="w-full bg-transparent px-3 py-2 outline-none text-sm text-foreground font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
            <p className="px-3 text-sm font-bold text-foreground">
              {taskLoggedByName}
            </p>
          )}
        </FieldBox>
      </div>

      {/* 4. Reported To (Head) — Read-only display */}
      {!isEditing && reportedToName && (
        <div className="col-span-2 pt-2 border-t border-border mt-1">
          <FieldBox label="Reported To (Head)" isEditing={false}>
            <p className="px-3 text-sm font-bold text-[color:var(--violet-10)] flex items-center gap-2">
              <ClipboardList size={14} className="text-[color:var(--violet-8)]" />
              {reportedToName}
            </p>
          </FieldBox>
        </div>
      )}
    </div>
  );
};

export default ManagementSection;
