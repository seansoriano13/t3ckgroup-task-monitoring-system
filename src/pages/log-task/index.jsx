import { useState, useEffect } from "react";
import { Building2, FolderKanban, Receipt, ClipboardList, Users } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { useAuth } from "../../context/AuthContext.jsx";
import toast from "react-hot-toast";
import ChecklistTaskInput from "../../components/ChecklistTaskInput.jsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../../services/taskService";
import { useNavigate } from "react-router";
import Select from "react-select";

const getCurrentLocalTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

const selectClassNames = {
  control: (state) => `min-h-[44px] w-full bg-gray-1 border ${state.isFocused ? 'border-gray-6 ring-1 ring-gray-6' : 'border-gray-4'} hover:border-gray-5 rounded-lg px-2 shadow-sm transition-all cursor-pointer`,
  menu: () => `mt-1 bg-gray-1 border border-gray-4 rounded-lg shadow-xl overflow-hidden z-[9999]`,
  menuList: () => `p-1`,
  option: (state) => `px-3 py-2 cursor-pointer transition-colors rounded-md ${state.isFocused ? 'bg-gray-3 text-gray-12' : state.isSelected ? 'bg-gray-4 text-gray-12 font-bold' : 'text-gray-11 bg-transparent'}`,
  singleValue: () => `text-gray-12 font-semibold text-[13.5px]`,
  placeholder: () => `text-gray-7 text-[13.5px]`,
  input: () => `text-gray-12 text-[13.5px]`,
  indicatorSeparator: () => `hidden`,
  dropdownIndicator: () => `text-gray-8 hover:text-gray-10 p-1`,
  valueContainer: () => `gap-1`,
};

export default function LogTaskPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Role Checks
  const isHr = user?.is_hr === true || user?.isHr === true;
  const isHead = user?.is_head === true || user?.isHead === true;
  const isSuperAdmin = user?.is_super_admin === true || user?.isSuperAdmin === true;

  // Database States
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Head Selection States
  const [availableHeads, setAvailableHeads] = useState([]);
  const [selectedHead, setSelectedHead] = useState("");

  // HR Specific Filter States
  const [hrDeptFilter, setHrDeptFilter] = useState("");
  const [hrSubDeptFilter, setHrSubDeptFilter] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    loggedById: user?.id || "",
    categoryId: "",
    projectTitle: "",
    taskDescription: "",
    startAt: getCurrentLocalTime(),
    endAt: "",
    priority: "LOW",
    paymentVoucher: "",
  });

  // Dynamic Committee/Others State
  const [committeeRole, setCommitteeRole] = useState("");
  const [othersRemarks, setOthersRemarks] = useState("");
  const [descriptionType, setDescriptionType] = useState("description");

  // Fetch Data on mount
  useEffect(() => {
    if (!user) return;

    const fetchDropdownData = async () => {
      setIsLoadingData(true);

      try {
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("category_id, description, department, sub_department")
          .order("category_id");

        if (catError) console.error("Category Fetch Error:", catError);
        else if (catData) setCategories(catData);

        const userSubDept = user.sub_department || user.subDepartment;

        let empQuery = supabase
          .from("employees")
          .select("id, name, department, sub_department, is_super_admin")
          .neq("is_deleted", true);

        if (isSuperAdmin) {
          empQuery = empQuery.or(`is_super_admin.eq.false,is_super_admin.is.null,id.eq.${user.id}`);
        } else if (!isHr && isHead) {
          if (userSubDept) {
            empQuery = empQuery.eq("sub_department", userSubDept);
          } else {
            empQuery = empQuery.eq("department", user.department);
          }
        } else if (!isHr && !isHead) {
          empQuery = empQuery.eq("id", user.id);
        }

        const { data: empData, error: empError } = await empQuery.order("name");

        if (empError) console.error("Employee Fetch Error:", empError);
        else if (empData) setEmployees(empData);

        const { data: headsData } = await supabase
          .from("employees")
          .select("id, name, department, sub_department, is_head, is_super_admin")
          .or("is_head.eq.true,is_super_admin.eq.true")
          .neq("is_deleted", true)
          .order("name");

        if (headsData) {
          setAvailableHeads(headsData);

          if (!isHead && !isHr && !isSuperAdmin) {
            const directHeads = headsData.filter((h) => {
              if (userSubDept && h.sub_department && h.sub_department.toUpperCase() !== "ALL") {
                return h.sub_department.trim().toLowerCase() === userSubDept.trim().toLowerCase();
              }
              if (h.department?.toUpperCase() !== "SUPER ADMIN" && user.department) {
                return h.department?.trim().toLowerCase() === user.department?.trim().toLowerCase();
              }
              return false;
            });

            if (directHeads.length > 0) {
              setSelectedHead(directHeads[0].id);
            } else {
              const adminHeads = headsData.filter(h => 
                h.is_super_admin || 
                h.sub_department?.trim().toUpperCase() === "ALL" || 
                h.department?.trim().toUpperCase() === "SUPER ADMIN"
              );
              if (adminHeads.length > 0) {
                setSelectedHead(adminHeads[0].id);
              }
            }
          }
          else if (isHead && !isHr && !isSuperAdmin) {
            setSelectedHead(user.id);
          }
        }

        setHrDeptFilter(isHr && !isSuperAdmin ? (user.department || "ADMIN") : "");
        setHrSubDeptFilter(isHr && !isSuperAdmin ? (user.sub_department || user.subDepartment || "HR") : "");
        
      } catch (err) {
        console.error("Unexpected error fetching dropdowns:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDropdownData();
  }, [user, isHr, isHead, isSuperAdmin]);

  // Update head pre-selection when assignee changes
  useEffect(() => {
    if (!formData.loggedById || !availableHeads.length) return;
    if (isHead && !isHr && !isSuperAdmin) return;

    const selectedEmployee = employees.find((e) => e.id === formData.loggedById);
    if (!selectedEmployee) return;

    const empSubDept = selectedEmployee.sub_department;
    const empDept = selectedEmployee.department;

    const directHeads = availableHeads.filter((h) => {
      if (empSubDept && h.sub_department && h.sub_department.toUpperCase() !== "ALL") {
        return h.sub_department.trim().toLowerCase() === empSubDept.trim().toLowerCase();
      }
      if (h.department?.toUpperCase() !== "SUPER ADMIN" && empDept) {
        return h.department?.trim().toLowerCase() === empDept?.trim().toLowerCase();
      }
      return false;
    });

    if (directHeads.length > 0) {
      setSelectedHead(directHeads[0].id);
    } else {
      const adminHeads = availableHeads.filter(h => 
        h.is_super_admin || 
        h.sub_department?.trim().toUpperCase() === "ALL" || 
        h.department?.trim().toUpperCase() === "SUPER ADMIN"
      );
      if (adminHeads.length > 0) {
        setSelectedHead(adminHeads[0].id);
      } else {
        setSelectedHead("");
      }
    }
  }, [formData.loggedById, availableHeads, employees, isHead, isHr, isSuperAdmin]);

  // Mutation Logic
  const addTaskMutation = useMutation({
    mutationFn: taskService.createTask,
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ["dashboardTasks"] });
      const previousTasks = queryClient.getQueryData(["dashboardTasks"]);
      const optimisticTask = {
        id: `temp-${Date.now()}`,
        ...newTask,
        createdAt: new Date().toISOString(),
        status: "INCOMPLETE",
        loggedByName: user?.name,
        loggedById: user?.id,
      };

      queryClient.setQueryData(["dashboardTasks"], (old) => {
        return old ? [optimisticTask, ...old] : [optimisticTask];
      });
      return { previousTasks };
    },
    onError: (error, newTask, context) => {
      console.error("Failed to add task:", error);
      toast.error("Database error: Could not save task.");
      if (context?.previousTasks) {
        queryClient.setQueryData(["dashboardTasks"], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onSuccess: () => {
      toast.success("Task logged successfully!");
      navigate(-1); // Go back after logging
    },
  });

  // Handle standard Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectedCategoryObj = categories.find((c) => c.category_id === formData.categoryId);
  const isCommittee = selectedCategoryObj?.description?.toUpperCase().includes("COMMITTEE");
  const isOthersGlobal = selectedCategoryObj?.category_id?.toUpperCase().includes("OTHERS") || selectedCategoryObj?.description?.toUpperCase().includes("OTHERS");

  const handleSubmit = (e) => {
    e.preventDefault();

    let mergedRemarks = "";
    if (isCommittee) {
      if (!committeeRole) {
        toast?.error("Please select a specific Committee Role.");
        return;
      }
      mergedRemarks = `[COMMITTEE - ${committeeRole}]`;
      if (committeeRole === "OTHERS") {
        if (!othersRemarks.trim()) {
          toast?.error("Please specify details for 'Others'.");
          return;
        }
        mergedRemarks += ` ${othersRemarks.trim()}`;
      }
    } else if (isOthersGlobal) {
      if (!othersRemarks.trim()) {
        toast?.error("Please specify details for your 'Others' task.");
        return;
      }
      mergedRemarks = `[OTHERS] ${othersRemarks.trim()}`;
    }

    const payload = {
      ...formData,
      isAutoVerified: false,
      remarks: mergedRemarks,
      paymentVoucher: formData.paymentVoucher?.trim() || null,
      submittedById: user.id,
      submittedByName: user.name,
      reportedTo: selectedHead || null,
    };

    addTaskMutation.mutate(payload);
  };

  // Select Filters 
  const uniqueDepts = [...new Set(categories.map((c) => c.department).filter(Boolean))].sort();
  const uniqueSubDepts = [...new Set(categories.filter((c) => !hrDeptFilter || c.department === hrDeptFilter).map((c) => c.sub_department).filter(Boolean))].sort();

  const filteredEmployees = employees.filter((emp) => {
    if (!isHr) return true;
    if (hrDeptFilter && emp.department !== hrDeptFilter) return false;
    if (hrSubDeptFilter && emp.sub_department !== hrSubDeptFilter) return false;
    return true;
  }).sort((a, b) => {
    if (a.id === user.id) return -1;
    if (b.id === user.id) return 1;
    return a.name.localeCompare(b.name);
  });

  const selectedEmployeeInfo = employees.find((emp) => emp.id === formData.loggedById) || {
    department: user?.department || "N/A",
    sub_department: user?.sub_department || user?.subDepartment || "N/A",
  };

  const filteredCategories = categories.filter((cat) => {
    const catId = cat.category_id?.toUpperCase() || "";
    const desc = cat.description?.toUpperCase() || "";
    if (
      catId.includes("COMMITTEE") || 
      catId.includes("OTHERS") || 
      catId.includes("CHECKLIST") || 
      desc.includes("COMMITTEE") || 
      desc.includes("OTHERS") || 
      desc.includes("CHECKLIST") ||
      cat.sub_department === "ALL"
    ) return true;

    if (isHr && hrSubDeptFilter) return cat.sub_department === hrSubDeptFilter;
    if (isHr && hrDeptFilter) return cat.department === hrDeptFilter;
    return cat.sub_department === selectedEmployeeInfo.sub_department;
  });

  const filteredHeads = (() => {
    if (isHead && !isHr && !isSuperAdmin) return [];
    if (isSuperAdmin || isHr) return availableHeads;
    return availableHeads;
  })();

  const showHeadDropdown = !isHead || isHr || isSuperAdmin;

  return (
    <div className="max-w-3xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-12 mb-1">Log New Task</h1>
        <p className="text-sm text-gray-10">Record a new task activity and configure routing assignments.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Organization Box */}
        <div className="bg-gray-2 border border-gray-4 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-10 uppercase tracking-wider">
            <Building2 size={15} /> Organization Details
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Department */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-9 uppercase tracking-wider pl-1">
                Department
              </label>
              {isHr ? (
                <Select
                  unstyled
                  classNames={selectClassNames}
                  options={[{ value: "", label: "All Departments" }, ...uniqueDepts.map(d => ({ value: d, label: d }))]}
                  value={{ value: hrDeptFilter, label: hrDeptFilter || "All Departments" }}
                  onChange={(selected) => {
                    setHrDeptFilter(selected.value);
                    setHrSubDeptFilter("");
                    setFormData(p => ({ ...p, loggedById: "", categoryId: "" }));
                  }}
                  isSearchable={false}
                />
              ) : (
                <div className="min-h-[44px] flex items-center w-full bg-gray-1 border border-gray-3/50 rounded-lg px-3 shadow-inner">
                  <p className="text-sm font-semibold text-gray-12">{selectedEmployeeInfo.department}</p>
                </div>
              )}
            </div>

            {/* Sub-Department */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-9 uppercase tracking-wider pl-1">
                Sub-Department
              </label>
              {isHr ? (
                <Select
                  unstyled
                  classNames={{ ...selectClassNames, control: (s) => `${selectClassNames.control(s)} ${!hrDeptFilter && "opacity-50 pointer-events-none"}` }}
                  options={[{ value: "", label: "All Sub-Departments" }, ...uniqueSubDepts.map(s => ({ value: s, label: s }))]}
                  value={{ value: hrSubDeptFilter, label: hrSubDeptFilter || "All Sub-Departments" }}
                  onChange={(selected) => {
                    setHrSubDeptFilter(selected.value);
                    setFormData(p => ({ ...p, loggedById: "", categoryId: "" }));
                  }}
                  isSearchable={false}
                  isDisabled={!hrDeptFilter}
                />
              ) : (
                <div className="min-h-[44px] flex items-center w-full bg-gray-1 border border-gray-3/50 rounded-lg px-3 shadow-inner">
                  <p className="text-sm font-semibold text-gray-12">{selectedEmployeeInfo.sub_department}</p>
                </div>
              )}
            </div>
          </div>

          {(isHr || isHead) && (
            <div className="pt-3 border-t border-gray-3">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-10 uppercase tracking-wider mb-2">
                <Users size={14} className="text-gray-9" /> Assign Task To
              </label>
              <Select
                unstyled
                classNames={selectClassNames}
                options={filteredEmployees.map(emp => ({ value: emp.id, label: emp.id === user.id ? "Myself" : emp.name }))}
                value={filteredEmployees.find(e => e.id === formData.loggedById) ? { value: formData.loggedById, label: formData.loggedById === user.id ? "Myself" : filteredEmployees.find(e => e.id === formData.loggedById).name } : null}
                onChange={(selected) => {
                  setFormData(p => ({ ...p, loggedById: selected.value, categoryId: "" }));
                  setCommitteeRole("");
                  setOthersRemarks("");
                }}
                placeholder="Select Employee..."
                isSearchable
              />
              {isHr && filteredEmployees.length === 0 && (
                <p className="text-[11px] text-red-500 mt-2 font-semibold">No employees found in this filter.</p>
              )}
            </div>
          )}

          {showHeadDropdown && (
            <div className="pt-3 border-t border-gray-3">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-10 uppercase tracking-wider mb-2">
                <ClipboardList size={14} className="text-gray-9" /> Report To (Head)
              </label>
              <Select
                unstyled
                classNames={selectClassNames}
                options={[
                  { value: "", label: "— No specific head —" },
                  ...filteredHeads.map(head => ({ 
                    value: head.id, 
                    label: `${head.name} — ${head.sub_department || head.department}${head.is_super_admin ? " (Admin)" : ""}` 
                  }))
                ]}
                value={selectedHead ? { value: selectedHead, label: filteredHeads.find(h => h.id === selectedHead)?.name || "— No specific head —" } : { value: "", label: "— No specific head —" }}
                onChange={(selected) => setSelectedHead(selected.value)}
                isSearchable
              />
              {filteredHeads.length === 0 && formData.loggedById && (
                <p className="text-[11px] text-gray-8 mt-2 font-semibold">No heads mapped for this department.</p>
              )}
            </div>
          )}
        </div>

        {/* Project & Info Box */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-9 uppercase tracking-wider pl-1">
              <FolderKanban size={13} /> Project / Campaign Title
              <span className="font-normal text-gray-8 normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              name="projectTitle"
              value={formData.projectTitle}
              onChange={handleChange}
              placeholder="e.g. Q2 Brand Awareness Campaign"
              className="min-h-[44px] w-full bg-gray-1 border border-gray-4 hover:border-gray-5 focus:border-gray-7 focus:ring-1 focus:ring-gray-7 text-gray-12 rounded-lg px-4 outline-none transition-all text-sm placeholder:text-gray-7"
            />
          </div>

          {selectedEmployeeInfo.department?.toUpperCase() === "ADMIN" && (
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-9 uppercase tracking-wider pl-1">
                <Receipt size={13} /> Payment Voucher
                <span className="font-normal text-gray-8 normal-case tracking-normal">(optional)</span>
              </label>
              <input
                type="text"
                name="paymentVoucher"
                value={formData.paymentVoucher}
                onChange={handleChange}
                placeholder="e.g. PV001-2024"
                className="min-h-[44px] w-full bg-gray-1 border border-gray-4 hover:border-gray-5 focus:border-gray-7 focus:ring-1 focus:ring-gray-7 text-gray-12 rounded-lg px-4 outline-none transition-all text-sm placeholder:text-gray-7"
              />
            </div>
          )}
        </div>

        {/* Classification and Priorities */}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="block text-[11px] font-bold text-gray-9 uppercase tracking-wider pl-1">
              Task Category
            </label>
            <Select
              unstyled
              classNames={{ ...selectClassNames, control: (s) => `${selectClassNames.control(s)} ${!formData.loggedById && "opacity-50 pointer-events-none"}` }}
              options={filteredCategories.map(cat => ({ value: cat.category_id, label: `${cat.category_id} - ${cat.description}` }))}
              value={filteredCategories.find(c => c.category_id === formData.categoryId) ? { value: formData.categoryId, label: `${formData.categoryId} - ${filteredCategories.find(c => c.category_id === formData.categoryId).description}` } : null}
              onChange={(selected) => {
                setFormData(p => ({ ...p, categoryId: selected.value }));
                setCommitteeRole("");
                setOthersRemarks("");
              }}
              placeholder={isLoadingData ? "Loading..." : (!formData.loggedById ? "Select Assignee First" : "Select Category...")}
              isDisabled={!formData.loggedById}
              isSearchable
            />
            {filteredCategories.length === 0 && !isLoadingData && formData.loggedById && (
              <p className="text-[11px] text-red-500 mt-1 font-semibold">No categories mapped for this team.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="block text-[11px] font-bold text-gray-9 uppercase tracking-wider pl-1">
              Priority
            </label>
            <Select
              unstyled
              classNames={selectClassNames}
              options={[
                { value: "LOW", label: "LOW" },
                { value: "MEDIUM", label: "MEDIUM" },
                { value: "HIGH", label: "HIGH" },
              ]}
              value={{ value: formData.priority, label: formData.priority }}
              onChange={(selected) => setFormData(p => ({ ...p, priority: selected.value }))}
              isSearchable={false}
            />
          </div>
        </div>

        {/* Dynamic Fields */}
        {isCommittee && (
          <div className="bg-gray-2 p-5 rounded-2xl border border-gray-4 mt-2 slide-in-from-top-2 duration-300">
            <label className="block text-[11px] font-bold text-gray-10 uppercase tracking-wider mb-4">
              Select Committee Role
            </label>
            <div className="flex flex-wrap gap-2.5">
              {["EVENT", "CREATIVE", "DEMO", "BAC", "ODOO", "OTHERS"].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setCommitteeRole(role)}
                  className={`px-4 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all border ${committeeRole === role ? "bg-gray-12 text-gray-1 border-gray-12 shadow-md shadow-gray-10/10 scale-[1.02]" : "bg-gray-1 text-gray-11 border-gray-4 hover:border-gray-8 hover:text-gray-12"}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        )}

        {(isOthersGlobal || (isCommittee && committeeRole === "OTHERS")) && (
          <div className="slide-in-from-top-2 duration-300 flex flex-col gap-1.5 pt-2">
            <label className="text-[11px] font-bold text-gray-10 uppercase tracking-wider pl-1">
              Specify Details <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={othersRemarks}
              onChange={(e) => setOthersRemarks(e.target.value)}
              placeholder="Please elaborate on your exact role or task..."
              className="min-h-[44px] w-full bg-gray-1 border border-gray-4 hover:border-gray-5 focus:border-gray-7 focus:ring-1 focus:ring-gray-7 text-gray-12 rounded-lg px-4 outline-none transition-all text-sm shadow-inner"
            />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="block text-[11px] font-bold text-gray-9 uppercase tracking-wider pl-1">
              Start Time
            </label>
            <input
              disabled
              type="datetime-local"
              name="startAt"
              value={formData.startAt}
              onChange={handleChange}
              className="min-h-[44px] w-full bg-gray-2 border border-gray-3 text-gray-9 rounded-lg px-4 outline-none text-sm cursor-not-allowed opacity-70"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="block text-[11px] font-bold text-gray-9 uppercase tracking-wider pl-1">
              End Time
            </label>
            <input
              disabled={!isHead && !isHr}
              type="datetime-local"
              name="endAt"
              value={formData.endAt}
              onChange={handleChange}
              className={`min-h-[44px] w-full bg-gray-1 border border-gray-4 hover:border-gray-5 focus:border-gray-7 text-gray-12 rounded-lg px-4 outline-none text-sm transition-all focus:ring-1 focus:ring-gray-7 ${(!isHead && !isHr) ? "bg-gray-2 border-gray-3 text-gray-9 cursor-not-allowed opacity-70" : ""}`}
            />
          </div>
        </div>

        {/* Task Details / Description */}
        <div className="flex flex-col gap-1.5 pt-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-gray-9 uppercase tracking-wider pl-1">
              Task Details
            </label>
            <div className="flex gap-1 bg-gray-3 p-1 rounded-lg border border-gray-4">
              <button
                type="button"
                onClick={() => setDescriptionType("description")}
                className={`text-[11px] px-3 py-1.5 rounded-md font-bold transition-all ${
                  descriptionType === "description" ? "bg-gray-1 border-gray-4 shadow-sm text-gray-12" : "text-gray-9 hover:text-gray-11"
                }`}
              >
                Description
              </button>
              <button
                type="button"
                onClick={() => setDescriptionType("checklist")}
                className={`text-[11px] px-3 py-1.5 rounded-md font-bold transition-all ${
                  descriptionType === "checklist" ? "bg-gray-1 border-gray-4 shadow-sm text-gray-12" : "text-gray-9 hover:text-gray-11"
                }`}
              >
                Checklist
              </button>
            </div>
          </div>

          {descriptionType === "checklist" ? (
            <div className="bg-gray-1 rounded-xl border border-gray-4 p-1 shadow-sm transition-all">
              <ChecklistTaskInput 
                value={formData.taskDescription}
                onChange={handleChange}
              />
            </div>
          ) : (
            <textarea
              name="taskDescription"
              value={
                typeof formData.taskDescription === "string" &&
                (formData.taskDescription.trim().startsWith("[") || formData.taskDescription.trim().startsWith("{"))
                  ? ""
                  : formData.taskDescription
              }
              onChange={handleChange}
              placeholder="Detail your completed work here..."
              className="w-full bg-gray-1 border border-gray-4 hover:border-gray-5 focus:border-gray-7 focus:ring-1 focus:ring-gray-7 text-gray-12 rounded-xl p-4 outline-none transition-all h-36 resize-y text-sm placeholder:text-gray-7 shadow-inner"
              required
            />
          )}
        </div>

        <div className="pt-6 flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 rounded-xl font-semibold text-gray-11 hover:text-gray-12 hover:bg-gray-3 border border-transparent hover:border-gray-4 transition-all text-[13.5px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-8 py-2.5 rounded-xl font-semibold bg-gray-12 text-gray-1 hover:bg-black hover:scale-[1.02] shadow-md shadow-gray-10/20 transition-all disabled:opacity-50 text-[13.5px] flex items-center gap-2"
            disabled={isLoadingData || !formData.loggedById || addTaskMutation.isPending}
          >
            {addTaskMutation.isPending ? "Submitting..." : "Submit Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
