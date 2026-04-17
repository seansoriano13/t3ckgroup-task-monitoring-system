import Select from "react-select";
import { Users, ClipboardList } from "lucide-react";
import { LOG_TASK_SELECT_STYLES } from "../../constants/task";

const FieldBox = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
      {label}
    </label>
    <div className="min-h-[44px] flex items-center w-full bg-card border border-border rounded-lg px-2 shadow-sm transition-all">
      {children}
    </div>
  </div>
);

export default function LogTaskAssignmentBar({
  formData,
  setFormData,
  roles,
  employees,
  availableHeads,
  hrDeptFilter,
  setHrDeptFilter,
  hrSubDeptFilter,
  setHrSubDeptFilter,
  uniqueDepts,
  uniqueSubDepts,
  filteredEmployees,
  selectedHead,
  setSelectedHead,
  assignmentRef,
  onScroll,
  user,
}) {
  const { isHr, isHead, isSuperAdmin } = roles;
  const canAssignOthers = isHr || isHead;
  const showHeadDropdown = !isHead || isHr || isSuperAdmin;

  return (
    <div className="flex flex-col gap-4 py-4 border-t border-gray-3/40 animate-content-in stagger-4 relative z-[10]" ref={assignmentRef}>
      {/* ORGANIZATION SECTION (HR only) */}
      {isHr && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest pl-1">
            <Users size={12} /> Assignment
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                Dept
              </label>
              <Select
                options={uniqueDepts.map((d) => ({ value: d, label: d }))}
                value={hrDeptFilter ? { value: hrDeptFilter, label: hrDeptFilter } : null}
                onChange={(opt) => {
                  setHrDeptFilter(opt?.value || "");
                  setHrSubDeptFilter("");
                  setFormData((p) => ({ ...p, loggedById: "" }));
                }}
                onMenuOpen={() => onScroll(assignmentRef, true)}
                placeholder="All"
                classNamePrefix="react-select"
                classNames={LOG_TASK_SELECT_STYLES}
                unstyled
                isClearable
                menuShouldBlockScroll={false}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                Sub-Dept
              </label>
              <Select
                options={uniqueSubDepts.map((sd) => ({ value: sd, label: sd }))}
                value={hrSubDeptFilter ? { value: hrSubDeptFilter, label: hrSubDeptFilter } : null}
                onChange={(opt) => {
                  setHrSubDeptFilter(opt?.value || "");
                  setFormData((p) => ({ ...p, loggedById: "" }));
                }}
                onMenuOpen={() => onScroll(assignmentRef, true)}
                placeholder="All"
                classNamePrefix="react-select"
                classNames={LOG_TASK_SELECT_STYLES}
                unstyled
                isClearable
                isDisabled={!hrDeptFilter}
                menuShouldBlockScroll={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* ASSIGNEE SECTION (HR/Head only) */}
      {canAssignOthers && (
        <div className="space-y-1.5">
          {!isHr && (
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
              <Users size={12} /> Assign To
            </label>
          )}
          <Select
            options={filteredEmployees.map((emp) => ({
              value: emp.id,
              label: emp.id === user.id ? "Myself" : emp.name,
            }))}
            value={filteredEmployees
              .filter((emp) => emp.id === formData.loggedById)
              .map((emp) => ({ 
                value: emp.id, 
                label: emp.id === user.id ? "Myself" : emp.name 
              }))[0] || null}
            onChange={(opt) => setFormData((p) => ({ ...p, loggedById: opt?.value || "" }))}
            onMenuOpen={() => onScroll(assignmentRef, true)}
            placeholder="Search assignee…"
            classNamePrefix="react-select"
            classNames={LOG_TASK_SELECT_STYLES}
            unstyled
            isClearable
            menuShouldBlockScroll={false}
          />
        </div>
      )}

      {/* REPORTED TO SECTION */}
      {showHeadDropdown && (
        <div className="space-y-1.5 pt-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
            <ClipboardList size={12} /> Report To (Head)
          </label>
          <Select
            options={availableHeads.map((h) => ({
              value: h.id,
              label: h.name,
            }))}
            value={availableHeads
              .filter((h) => h.id === selectedHead)
              .map((h) => ({ value: h.id, label: h.name }))[0] || null}
            onChange={(opt) => setSelectedHead(opt?.value || "")}
            onMenuOpen={() => onScroll(assignmentRef, true)}
            placeholder="Select manager/head…"
            classNamePrefix="react-select"
            classNames={LOG_TASK_SELECT_STYLES}
            unstyled
            isClearable
            menuShouldBlockScroll={false}
          />
        </div>
      )}
    </div>
  );
}
